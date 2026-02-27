import type { Media, MediaScore } from '@findarr/shared';

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

  const trendingScore = item.state?.trendingRank
    ? clamp(1 - (item.state.trendingRank - 1) / maxTrendingRank)
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
    finalScore: 0,
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
    const trendingRank = item.state?.trendingRank || 0;

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
