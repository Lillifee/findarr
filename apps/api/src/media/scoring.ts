import type { Media, MediaScore, MediaType } from '@findarr/shared/media';
import {
  toPreferenceKey,
  type PreferenceSubject,
  type UserPreference,
} from '@findarr/shared/preferences';
import { isDefined, isNotEmpty } from '@findarr/shared/utils';

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
export function scoreMediaItems<T extends Media>(
  items: T[],
  movieStats: MediaStats,
  tvStats: MediaStats,
): T[] {
  if (items.length === 0) {
    return items;
  }

  const MIN_VOTES = 50;

  const scored = items.map<T>((item) => {
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
    const recencyScore = isNotEmpty(item.date)
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

// Helper: Calculate score contribution with diminishing returns
const scoreContribution = (normalized: number) =>
  Math.sqrt(Math.max(0, normalized)) - Math.sqrt(Math.max(0, -normalized));

type ScoringSubject = Pick<PreferenceSubject, 'kind' | 'subjectKey'>;

const scorePreferenceSubjects = (
  subjects: ScoringSubject[],
  preferences: Map<string, UserPreference>,
) => {
  let rawScore = 0;
  let matched = false;

  for (const subject of subjects) {
    const preference = preferences.get(toPreferenceKey(subject.kind, subject.subjectKey));
    if (!preference) {
      continue;
    }

    matched = true;
    rawScore += scoreContribution(preference.score / (preference.count + 10));
  }

  return {
    matched,
    score: matched ? (Math.tanh(rawScore) + 1) / 2 : 0.5,
  };
};

/**
 * Apply user preference scoring to media items
 * Calculates preference-dimension match scores and combines them with base scores.
 */
export function scoreMediaItemsForUser<T extends Media>(
  items: T[],
  preferences: Map<string, UserPreference>,
): T[] {
  if (preferences.size === 0) {
    return items;
  }

  const scored = items.map<T>((item) => {
    const genreResult = scorePreferenceSubjects(
      item.genres.map((genre) => ({ kind: 'genre', subjectKey: String(genre.id) })),
      preferences,
    );
    const keywordResult = scorePreferenceSubjects(
      (item.keywords ?? []).map((keyword) => ({
        kind: 'keyword',
        subjectKey: String(keyword.id),
      })),
      preferences,
    );
    const genreScore = genreResult.score;
    const keywordScore = keywordResult.score;

    // ---------- BASE SCORE ----------
    const baseScore = item.state?.score?.baseScore ?? 0;
    const baseTrendingScore = item.state?.score?.baseTrendingScore ?? 0;

    // ---------- USER SCORE ----------
    const matchedScores = [genreResult, keywordResult]
      .filter((result) => result.matched)
      .map((result) => result.score);

    const userScore =
      matchedScores.length > 0
        ? matchedScores.reduce((total, score) => total + score, 0) / matchedScores.length
        : 0.5;

    // ---------- FINAL SCORES ----------
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
