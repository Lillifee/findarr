import type {
  Media,
  MediaScore,
  UserGenrePreference,
  UserKeywordPreference,
} from '@findarr/shared';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

type TypeStats = {
  minPopularity: number;
  maxPopularity: number;
  minVoteCount: number;
  maxVoteCount: number;
  ratingSum: number;
  ratingCount: number;
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));

function scoreMedia(
  item: Media,
  stats: TypeStats,
  maxTrendingRank: number,
  globalAverage: number
): MediaScore {
  const popularityScore = Math.log10(item.popularity + 1) / Math.log10(stats.maxPopularity + 1);

  const MIN_VOTES = 300;

  const bayes =
    (item.voteCount / (item.voteCount + MIN_VOTES)) * (item.voteAverage || 0) +
    (MIN_VOTES / (item.voteCount + MIN_VOTES)) * globalAverage;

  const weightedRating = bayes / 10;

  const trendingScore = item.trendingRank
    ? clamp(1 - (item.trendingRank - 1) / maxTrendingRank)
    : 0;

  const recencyScore = item.date
    ? Math.exp(-Math.abs(Date.now() - new Date(item.date).getTime()) / MS_PER_DAY / 365)
    : 0;

  const baseScore =
    0.25 * trendingScore + 0.2 * popularityScore + 0.3 * recencyScore + 0.25 * weightedRating;

  return {
    recencyScore,
    trendingScore,
    popularityScore,
    weightedRating,
    baseScore,
    genreScore: 0,
    keywordScore: 0,
    userScore: 0,
    finalScore: baseScore,
  };
}

export function scoreMediaItems(items: Media[]): Media[] {
  const createTypeStats = (): TypeStats => ({
    minPopularity: Infinity,
    maxPopularity: 0,
    minVoteCount: Infinity,
    maxVoteCount: 0,
    ratingSum: 0,
    ratingCount: 0,
  });

  const movieStats: TypeStats = createTypeStats();
  const tvStats: TypeStats = createTypeStats();

  let maxTrendingRank = 1;

  // 1️⃣ Collect stats in ONE pass
  for (const item of items) {
    const stats = item.type === 'movie' ? movieStats : tvStats;

    const popularity = item.popularity;
    const voteCount = item.voteCount;
    const trendingRank = item.trendingRank || 0;

    stats.minPopularity = Math.min(stats.minPopularity, popularity);
    stats.maxPopularity = Math.max(stats.maxPopularity, popularity);

    stats.minVoteCount = Math.min(stats.minVoteCount, voteCount);
    stats.maxVoteCount = Math.max(stats.maxVoteCount, voteCount);

    if (item.voteAverage) {
      stats.ratingSum += item.voteAverage;
      stats.ratingCount++;
    }
    if (trendingRank > maxTrendingRank) {
      maxTrendingRank = trendingRank;
    }
  }

  // Handle empty types safely
  if (movieStats.minPopularity === Infinity) movieStats.minPopularity = 0;
  if (movieStats.minVoteCount === Infinity) movieStats.minVoteCount = 0;

  if (tvStats.minPopularity === Infinity) tvStats.minPopularity = 0;
  if (tvStats.minVoteCount === Infinity) tvStats.minVoteCount = 0;

  const movieGlobalAverage =
    movieStats.ratingCount > 0 ? movieStats.ratingSum / movieStats.ratingCount : 0;

  const tvGlobalAverage = tvStats.ratingCount > 0 ? tvStats.ratingSum / tvStats.ratingCount : 0;

  // 2️⃣ Score
  const scored = items.map<Media>(item => {
    const typeStats = item.type === 'movie' ? movieStats : tvStats;
    const globalAverage = item.type === 'movie' ? movieGlobalAverage : tvGlobalAverage;
    const score = scoreMedia(item, typeStats, maxTrendingRank, globalAverage);
    return { ...item, state: { ...item.state, score } };
  });

  // 3️⃣ Sort
  scored.sort((a, b) => (b.state?.score?.baseScore || 0) - (a.state?.score?.baseScore || 0));

  return scored;
}

// ============================================================================
// User Preference Scoring
// ============================================================================

/**
 * Apply user preference scoring to media items
 * Calculates genre and keyword match scores, combines with base scores
 * Formula: 70% base + 15% genre + 15% keyword
 * Note: When keywords are absent, keywordScore copies genreScore (effectively 30% genre weight)
 */
export function scoreMediaItemsForUser(
  items: Media[],
  genrePreferences: Map<number, UserGenrePreference>,
  keywordPreferences: Map<number, UserKeywordPreference> = new Map()
): Media[] {
  if (genrePreferences.size === 0 && keywordPreferences.size === 0) {
    return items;
  }

  // Bayesian smoothing to prevent small-sample bias (3 pseudo-ratings at 0 score)
  // Lower prior = more responsive to initial preferences while still preventing extremes
  const PRIOR_WEIGHT = 3;
  const PRIOR_SCORE = 0;

  const scored = items.map<Media>(item => {
    let genreScore = 0;
    let keywordScore = 0;

    // Helper: Calculate score contribution with diminishing returns
    const scoreContribution = (normalized: number) =>
      Math.sqrt(Math.max(0, normalized)) - Math.sqrt(Math.max(0, -normalized));

    // ---------- GENRE SCORING ----------
    if (genrePreferences.size > 0 && item.genres?.length) {
      let rawScore = 0;

      // Process all genres (typically 2-4 per item)
      for (const genre of item.genres) {
        const pref = genrePreferences.get(genre.id);
        if (pref) {
          // Bayesian normalized score - already on reasonable scale (roughly -1 to +1)
          const normalized =
            (pref.score + PRIOR_WEIGHT * PRIOR_SCORE) / (pref.count + PRIOR_WEIGHT);
          rawScore += scoreContribution(normalized);
        }
      }

      // Sigmoid for [0, 1] range: 0 = disliked, 0.5 = neutral, 1 = liked
      genreScore = 1 / (1 + Math.exp(-rawScore));
    }

    // ---------- KEYWORD SCORING ----------
    if (keywordPreferences.size > 0 && item.keywords?.length) {
      // Process ALL matching keywords (not just top N)
      // The sqrt() diminishing returns prevent keyword spam from dominating
      // This captures cumulative signal: many disliked keywords = strong negative signal
      const rawScore = item.keywords.reduce((sum, kw) => {
        const pref = keywordPreferences.get(kw.id);
        if (!pref) return sum;

        // Bayesian normalized score - already on reasonable scale (roughly -1 to +1)
        const normalized = (pref.score + PRIOR_WEIGHT * PRIOR_SCORE) / (pref.count + PRIOR_WEIGHT);
        // const normalized = pref.score / pref.count;
        return sum + scoreContribution(normalized);
      }, 0);

      // Sigmoid for [0, 1] range: 0 = disliked, 0.5 = neutral, 1 = liked
      keywordScore = 1 / (1 + Math.exp(-rawScore));
    } else if (!item.keywords?.length) {
      // If no keywords exist, copy genre score to avoid penalizing items without keywords
      // This effectively gives genres 30% weight (15% + 15%) when keywords are absent
      keywordScore = genreScore;
    }

    // ---------- BASE SCORE ----------
    const baseScore = item.state?.score?.baseScore || 0;

    // ---------- FINAL SCORE ----------
    const userScore = 0.5 * genreScore + 0.5 * keywordScore; // For display purposes (0 to 1 range)
    const finalScore = 0.7 * baseScore + 0.3 * userScore;

    const score = {
      ...(item.state?.score ?? {
        recencyScore: 0,
        trendingScore: 0,
        popularityScore: 0,
        weightedRating: 0,
        baseScore: 0,
      }),
      genreScore,
      keywordScore,
      userScore,
      finalScore,
    };

    return { ...item, state: { ...item.state, score } };
  });

  scored.sort((a, b) => (b.state?.score?.finalScore || 0) - (a.state?.score?.finalScore || 0));

  return scored;
}
