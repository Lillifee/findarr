import type {
  Media,
  MediaScore,
  MediaScoreSignal,
  MediaScoreSignalPreferenceType,
  MediaType,
} from '@findarr/shared/media';
import {
  toPreferenceKey,
  type PreferenceKind,
  type PreferenceSubject,
  type UserPreference,
  type UserRatingCounts,
} from '@findarr/shared/preferences';
import { isDefined, isNotEmpty } from '@findarr/shared/utils';

import { getTopCast } from '../preferences/helpers.js';

/**
 * Maximum trending rank (5 pages × 20 items per page from TMDB)
 * Used for normalizing trending scores
 */
export const MAX_TRENDING_RANK = 100;

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const BAYESIAN_PRIOR_VOTES = 50;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

// ============================================================================
// Types
// ============================================================================

/**
 * Media statistics for normalizing scores
 * Describes the distribution of media characteristics (popularity, votes, ratings)
 * Precomputed from catalog cache and stored in database
 * Maximum values only increase over time (growth strategy)
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

  return items.map<T>((item) => {
    const stats = item.type === 'movie' ? movieStats : tvStats;
    const priorMeanRating = stats.avgRating;

    // Normalize popularity (log scale)
    const popularityScore = Math.log10(item.popularity + 1) / Math.log10(stats.maxPopularity + 1);

    // Bayesian weighted rating
    const bayesianRating =
      (item.voteCount / (item.voteCount + BAYESIAN_PRIOR_VOTES)) * (item.voteAverage || 0) +
      (BAYESIAN_PRIOR_VOTES / (item.voteCount + BAYESIAN_PRIOR_VOTES)) * priorMeanRating;
    const weightedRating = bayesianRating / 10;

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
      userScore: 0,
      finalScore: baseScore,
      finalTrendingScore: baseTrendingScore,
      explanation: {
        positiveSignals: [],
        mixedSignals: [],
        negativeSignals: [],
      },
    };

    return { ...item, state: { ...item.state, score } };
  });
}

// ============================================================================
// User Preference Scoring
// ============================================================================

// A few ratings should not create a strong recommendation. These extra
// imaginary ratings keep scores closer to neutral until more ratings exist.
const SUBJECT_LIFT_PRIOR_RATINGS = 5;
const USER_BASELINE_PRIOR_RATINGS = 10;
const MIN_SUBJECT_RATINGS = 2;

// Keywords count a little less because they can be noisy.
// Top cast counts a little more because it is usually a more specific match.
const PREFERENCE_KIND_MULTIPLIERS: Record<PreferenceKind, number> = {
  genre: 1,
  keyword: 0.8,
  cast: 1.2,
};

const NO_USER_RATINGS: UserRatingCounts = { likes: 0, dislikes: 0 };

// This is how often the user normally likes something. A user who likes only
// 30% of titles may still favor a subject they like 40% of the time.
// New users start near 50% until they have enough ratings.
const getUserLikeBaseline = ({ likes, dislikes }: UserRatingCounts) =>
  (likes + USER_BASELINE_PRIOR_RATINGS * 0.5) / (likes + dislikes + USER_BASELINE_PRIOR_RATINGS);

// Compare the actual likes for a subject with the number expected from the
// user's usual like rate. More ratings make the result stronger.
const getSmoothedLift = (positiveCount: number, evidenceCount: number, userLikeBaseline: number) =>
  (positiveCount - userLikeBaseline * evidenceCount) / (evidenceCount + SUBJECT_LIFT_PRIOR_RATINGS);

const toPreferenceSubjects = (
  kind: PreferenceKind,
  items: readonly { id: number; name: string }[],
): PreferenceSubject[] =>
  items.map((item) => ({ kind, subjectKey: String(item.id), subjectName: item.name }));

const scorePreferenceKind = (
  kind: PreferenceKind,
  subjects: PreferenceSubject[],
  preferences: Map<string, UserPreference>,
  userLikeBaseline: number,
) => {
  let totalPositiveCount = 0;
  let evidenceCount = 0;
  const evidenceSignals: MediaScoreSignal[] = [];

  for (const subject of subjects) {
    const preference = preferences.get(toPreferenceKey(subject.kind, subject.subjectKey));
    if (!preference || preference.count < MIN_SUBJECT_RATINGS) {
      continue;
    }

    // Stored preferences keep the difference and total, so rebuild the counts.
    const positiveCount = (preference.count + preference.score) / 2;
    const negativeCount = preference.count - positiveCount;
    const subjectPref = 0.5 + getSmoothedLift(positiveCount, preference.count, userLikeBaseline);
    const prefType = subjectPref > 0.6 ? 'positive' : subjectPref < 0.4 ? 'negative' : 'mixed';
    const strength = Math.abs(subjectPref - 0.5) * 2;

    totalPositiveCount += positiveCount;
    evidenceCount += preference.count;
    evidenceSignals.push({
      kind: subject.kind,
      subjectKey: subject.subjectKey,
      name: subject.subjectName,
      preferenceType: prefType,
      strength,
      positiveCount,
      negativeCount,
    });
  }

  return {
    evidenceSignals,
    // Combine all subjects of the same kind first.
    // A movie should not score higher just because it has more genre or keyword tags.
    preferenceScore:
      evidenceSignals.length > 0
        ? 0.5 + getSmoothedLift(totalPositiveCount, evidenceCount, userLikeBaseline)
        : 0.5,
    kindMultiplier: evidenceCount > 0 ? PREFERENCE_KIND_MULTIPLIERS[kind] : 0,
  };
};

const getStrongestSignals = (
  signals: MediaScoreSignal[],
  preferenceType: MediaScoreSignalPreferenceType,
) =>
  signals
    .filter((signal) => signal.preferenceType === preferenceType)
    .toSorted((first, second) => second.strength - first.strength)
    .slice(0, 3);

/**
 * Apply user preference scoring to media items
 * Calculates the personal match score and combines it with the catalog score.
 */
export function scoreMediaItemsForUser<T extends Media>(
  items: T[],
  preferences: Map<string, UserPreference>,
  ratingCounts: UserRatingCounts = NO_USER_RATINGS,
): T[] {
  if (preferences.size === 0) {
    return items;
  }

  const userLikeBaseline = getUserLikeBaseline(ratingCounts);

  return items.map<T>((item) => {
    const genreResult = scorePreferenceKind(
      'genre',
      toPreferenceSubjects('genre', item.genres),
      preferences,
      userLikeBaseline,
    );
    const keywordResult = scorePreferenceKind(
      'keyword',
      toPreferenceSubjects('keyword', item.keywords ?? []),
      preferences,
      userLikeBaseline,
    );
    const castResult = scorePreferenceKind(
      'cast',
      toPreferenceSubjects('cast', getTopCast(item.cast)),
      preferences,
      userLikeBaseline,
    );
    // ---------- BASE SCORE ----------
    const baseScore = item.state?.score?.baseScore ?? 0;
    const baseTrendingScore = item.state?.score?.baseTrendingScore ?? 0;

    // ---------- USER SCORE ----------
    const activeKindScores = [genreResult, keywordResult, castResult].filter(
      (result) => result.kindMultiplier > 0,
    );
    // Start at neutral. Kinds the user favors raise the score, kinds they avoid lower it.
    // Matching kinds add together and conflicting kinds cancel out.
    const userScore = clamp(
      0.5 +
        activeKindScores.reduce(
          (total, result) => total + (result.preferenceScore - 0.5) * result.kindMultiplier,
          0,
        ),
    );

    // ---------- FINAL SCORES ----------
    const finalScore = 0.7 * baseScore + 0.3 * userScore;
    const finalTrendingScore = 0.7 * baseTrendingScore + 0.3 * userScore;

    // ---------- EXPLANATION ----------
    const evidenceSignals = [
      ...genreResult.evidenceSignals,
      ...keywordResult.evidenceSignals,
      ...castResult.evidenceSignals,
    ];

    const positiveSignals = getStrongestSignals(evidenceSignals, 'positive');
    const mixedSignals = getStrongestSignals(evidenceSignals, 'mixed');
    const negativeSignals = getStrongestSignals(evidenceSignals, 'negative');

    const score: MediaScore = {
      ...(item.state?.score ?? {
        recencyScore: 0,
        trendingScore: 0,
        popularityScore: 0,
        weightedRating: 0,
        baseScore: 0,
        baseTrendingScore: 0,
      }),
      userScore,
      finalScore,
      finalTrendingScore,
      explanation: {
        positiveSignals,
        mixedSignals,
        negativeSignals,
      },
    };

    return { ...item, state: { ...item.state, score } };
  });
}
