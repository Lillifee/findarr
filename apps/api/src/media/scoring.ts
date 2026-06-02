import {
  isDefined,
  type Media,
  type MediaScore,
  type MediaType,
  type UserGenrePreference,
  type UserKeywordPreference,
} from '@findarr/shared';

/**
 * Maximum trending rank (5 pages × 20 items per page from TMDB)
 * Used for normalizing trending scores
 */
export const MAX_TRENDING_RANK = 100;

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const clamp = (v: number) => Math.max(0, Math.min(1, v));

// ============================================================================
// Types
// ============================================================================

/**
 * Media statistics for normalizing scores
 * Describes the distribution of media characteristics (popularity, votes, ratings)
 * Precomputed from catalog cache and stored in database
 * Max values only increase, min values only decrease over time (growth strategy)
 */
export type MediaStats = {
  mediaType: MediaType;
  maxPopularity: number;
  maxVoteCount: number;
  avgRating: number;
  updatedAt: number;
};

// ============================================================================
// Batch Scoring with Precomputed Stats
// ============================================================================

/**
 * Score media items using precomputed global stats from database
 * Works on arrays of any size (including single items)
 * Stats are computed during catalog sync and grow over time
 */
export function scoreMediaItems(
  items: Media[],
  movieStats: MediaStats,
  tvStats: MediaStats,
): Media[] {
  if (items.length === 0) return items;

  const MIN_VOTES = 50;

  const scored = items.map<Media>((item) => {
    const stats = item.type === 'movie' ? movieStats : tvStats;
    const globalAverage = stats.avgRating;

    // Normalize popularity (log scale)
    const popularityScore = Math.log10(item.popularity + 1) / Math.log10(stats.maxPopularity + 1);

    // Bayesian weighted rating
    const bayes =
      (item.voteCount / (item.voteCount + MIN_VOTES)) * (item.voteAverage || 0) +
      (MIN_VOTES / (item.voteCount + MIN_VOTES)) * globalAverage;
    const weightedRating = bayes / 10;

    // Trending score (0 if not trending)
    const trendingScore = isDefined(item.trendingRank)
      ? clamp(1 - (item.trendingRank - 1) / MAX_TRENDING_RANK)
      : 0;

    // Recency score
    const recencyScore = isDefined(item.date)
      ? Math.exp(-Math.abs(Date.now() - new Date(item.date).getTime()) / MS_PER_DAY / 365)
      : 0;

    // Base score (popularity + rating, no trending penalty)
    const baseScore = 0.3 * popularityScore + 0.7 * weightedRating;

    // Trending-boosted score (for popular page sorting)
    const baseTrendingScore = 0.6 * baseScore + 0.2 * trendingScore + 0.2 * recencyScore;

    const score: MediaScore = {
      recencyScore,
      trendingScore,
      popularityScore,
      weightedRating,
      baseScore,
      baseTrendingScore,
      genreScore: 0,
      keywordScore: 0,
      userScore: 0,
      finalScore: baseScore,
      finalTrendingScore: baseTrendingScore,
    };

    return { ...item, state: { ...item.state, score } };
  });

  return scored;
}

// ============================================================================
// User Preference Scoring
// ============================================================================

/**
 * Apply user preference scoring to media items
 * Calculates genre and keyword match scores, combines with base scores
 * Note: When keywords are absent, keywordScore copies genreScore (effectively 30% genre weight)
 */
export function scoreMediaItemsForUser(
  items: Media[],
  genrePreferences: Map<number, UserGenrePreference>,
  keywordPreferences: Map<number, UserKeywordPreference> = new Map(),
): Media[] {
  if (genrePreferences.size === 0 && keywordPreferences.size === 0) {
    return items;
  }

  // Bayesian smoothing to prevent small-sample bias (10 pseudo-ratings at 0 score)
  const PRIOR_WEIGHT = 10;
  const PRIOR_SCORE = 0;

  // Helper: Calculate score contribution with diminishing returns
  const scoreContribution = (normalized: number) =>
    Math.sqrt(Math.max(0, normalized)) - Math.sqrt(Math.max(0, -normalized));

  const scored = items.map<Media>((item) => {
    // Neutral defaults (0.5) so unmatched preferences do not implicitly demote items.
    let genreScore = 0.5;
    let keywordScore = 0.5;

    // ---------- GENRE SCORING ----------
    if (genrePreferences.size > 0 && item.genres?.length) {
      let rawScore = 0;
      let matched = false;

      for (const genre of item.genres) {
        const pref = genrePreferences.get(genre.id);
        if (pref) {
          matched = true;
          const normalized =
            (pref.score + PRIOR_WEIGHT * PRIOR_SCORE) / (pref.count + PRIOR_WEIGHT);
          rawScore += scoreContribution(normalized);
        }
      }

      if (matched) {
        const signed = Math.tanh(rawScore);
        genreScore = (signed + 1) / 2;
      }
    }

    // ---------- KEYWORD SCORING ----------
    if (keywordPreferences.size > 0 && isDefined(item.keywords)) {
      let rawScore = 0;
      let matched = false;

      for (const kw of item.keywords) {
        const pref = keywordPreferences.get(kw.id);
        if (!pref) continue;

        matched = true;
        const normalized = (pref.score + PRIOR_WEIGHT * PRIOR_SCORE) / (pref.count + PRIOR_WEIGHT);
        rawScore += scoreContribution(normalized);
      }

      if (matched) {
        const signed = Math.tanh(rawScore);
        keywordScore = (signed + 1) / 2;
      }
    } else if (!isDefined(item.keywords)) {
      // If no keywords exist, copy genre score to avoid penalizing items without keywords
      keywordScore = genreScore;
    }

    // ---------- BASE SCORE ----------
    const baseScore = item.state?.score?.baseScore ?? 0;
    const baseTrendingScore = item.state?.score?.baseTrendingScore ?? 0;

    // ---------- FINAL SCORES ----------
    const userScore = 0.5 * genreScore + 0.5 * keywordScore;

    const finalScore = 0.7 * baseScore + 0.3 * userScore;
    const finalTrendingScore = 0.7 * baseTrendingScore + 0.3 * userScore;

    const score: MediaScore = {
      ...(item.state?.score ?? {
        recencyScore: 0,
        trendingScore: 0,
        popularityScore: 0,
        weightedRating: 0,
        baseScore: 0,
        baseTrendingScore: 0,
      }),
      genreScore,
      keywordScore,
      userScore,
      finalScore,
      finalTrendingScore,
    };

    return { ...item, state: { ...item.state, score } };
  });

  return scored;
}
