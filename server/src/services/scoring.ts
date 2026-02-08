import type { Media } from '@findarr/shared';

/**
 * Calculate custom popularity score for a media item
 * Applies trending boosts, vote-based quality scoring, and age-based adjustments
 */
export const calculateCustomPopularity = (item: Media) => {
  const basePop = item.popularity || 0;
  const voteAverage = item.vote_average || 0;
  const voteCount = item.vote_count || 0;

  let customPopularity = basePop;

  // Apply trending boost
  if (item.trending_rank) {
    const trendingBoost = Math.max(0, 500 - (item.trending_rank - 1) * 10);

    customPopularity += trendingBoost;
    if (item.trending_rank <= 10) customPopularity += 200;
    if (item.trending_rank <= 5) customPopularity += 150;
    if (item.trending_rank === 1) customPopularity += 200;
  }

  // Apply vote-based quality boost
  if (voteCount > 0 && voteAverage > 0) {
    const qualityBoost = Math.max(0, (voteAverage - 6) * 10);

    let ageAdjustedVoteCount = voteCount;
    let agePenalty = 0;
    let recencyBoost = 0;

    if (item.date) {
      const releaseYear = new Date(item.date).getFullYear();
      const currentYear = new Date().getFullYear();
      const ageInYears = Math.max(1, currentYear - releaseYear);

      // Age-adjusted vote count
      ageAdjustedVoteCount = voteCount / Math.sqrt(ageInYears);

      // Age penalties
      if (ageInYears >= 8) {
        const ageFactor = Math.min(ageInYears - 7, 35);
        agePenalty = Math.pow(1.4, ageFactor) - 1;
      }
      if (ageInYears >= 15) agePenalty += 100;
      if (ageInYears >= 20) agePenalty += 200;
      if (ageInYears >= 30) agePenalty += 400;

      // Recency boosts
      if (ageInYears <= 5) {
        const recencyMap = [30, 25, 20, 15, 10, 5];
        recencyBoost = recencyMap[ageInYears] || 0;
      }
    }

    const volumeBoost = Math.min(15, Math.log10(ageAdjustedVoteCount + 1) * 6);
    let voteBoost = qualityBoost + volumeBoost;

    const exceptionalBoost = voteAverage >= 8.5 && ageAdjustedVoteCount >= 500 ? 10 : 0;
    voteBoost = Math.min(50, voteBoost + exceptionalBoost);

    customPopularity += voteBoost + recencyBoost - agePenalty;
  }

  return customPopularity;
};
