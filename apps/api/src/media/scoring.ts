import type { Media, MediaScore, MediaScoreSignal, MediaType } from '@findarr/shared/media';
import {
  toPreferenceKey,
  type PreferenceKind,
  type PreferenceSubject,
  type UserPreference,
} from '@findarr/shared/preferences';
import { isDefined, isNotEmpty } from '@findarr/shared/utils';

import { getTopCast } from '../preferences/subjects.js';

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
      castScore: 0,
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

  return scored;
}

// ============================================================================
// User Preference Scoring
// ============================================================================

const PRIOR_WEIGHT = 5;
const MIN_SIGNAL_EVIDENCE = 2;
const PREFERENCE_KIND_WEIGHT: Record<PreferenceKind, number> = {
  genre: 1,
  keyword: 0.8,
  cast: 1.2,
};

const scorePreferenceSubjects = (
  kind: PreferenceKind,
  subjects: PreferenceSubject[],
  preferences: Map<string, UserPreference>,
) => {
  let preferenceScore = 0;
  let evidenceCount = 0;
  const signals: MediaScoreSignal[] = [];

  for (const subject of subjects) {
    const preference = preferences.get(toPreferenceKey(subject.kind, subject.subjectKey));
    if (!preference || preference.count < MIN_SIGNAL_EVIDENCE) {
      continue;
    }

    const affinity = 0.5 + preference.score / (2 * (preference.count + PRIOR_WEIGHT));
    const positiveCount = (preference.count + preference.score) / 2;
    const negativeCount = preference.count - positiveCount;
    const positiveShare = positiveCount / preference.count;
    const sentiment = positiveShare > 0.6 ? 'positive' : positiveShare < 0.4 ? 'negative' : 'mixed';

    preferenceScore += preference.score;
    evidenceCount += preference.count;
    signals.push({
      kind: subject.kind,
      subjectKey: subject.subjectKey,
      name: subject.subjectName,
      sentiment,
      strength: Math.abs(affinity - 0.5) * 2,
      positiveCount,
      negativeCount,
    });
  }

  return {
    signals,
    score: signals.length > 0 ? 0.5 + preferenceScore / (2 * (evidenceCount + PRIOR_WEIGHT)) : 0.5,
    weight:
      evidenceCount > 0
        ? (evidenceCount / (evidenceCount + PRIOR_WEIGHT)) * PREFERENCE_KIND_WEIGHT[kind]
        : 0,
  };
};

const bySignalStrength = (first: MediaScoreSignal, second: MediaScoreSignal) =>
  second.strength - first.strength;

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
      'genre',
      item.genres.map((genre) => ({
        kind: 'genre',
        subjectKey: String(genre.id),
        subjectName: genre.name,
      })),
      preferences,
    );
    const keywordResult = scorePreferenceSubjects(
      'keyword',
      (item.keywords ?? []).map((keyword) => ({
        kind: 'keyword',
        subjectKey: String(keyword.id),
        subjectName: keyword.name,
      })),
      preferences,
    );
    const castResult = scorePreferenceSubjects(
      'cast',
      getTopCast(item.cast).map((member) => ({
        kind: 'cast',
        subjectKey: String(member.id),
        subjectName: member.name,
      })),
      preferences,
    );
    const genreScore = genreResult.score;
    const keywordScore = keywordResult.score;
    const castScore = castResult.score;

    // ---------- BASE SCORE ----------
    const baseScore = item.state?.score?.baseScore ?? 0;
    const baseTrendingScore = item.state?.score?.baseTrendingScore ?? 0;

    // ---------- USER SCORE ----------
    const matchedResults = [genreResult, keywordResult, castResult].filter(
      (result) => result.weight > 0,
    );
    const totalWeight = matchedResults.reduce((total, result) => total + result.weight, 0);

    const userScore =
      totalWeight > 0
        ? matchedResults.reduce((total, result) => total + result.score * result.weight, 0) /
          totalWeight
        : 0.5;

    // ---------- FINAL SCORES ----------
    const finalScore = 0.7 * baseScore + 0.3 * userScore;
    const finalTrendingScore = 0.7 * baseTrendingScore + 0.3 * userScore;

    // ---------- EXPLANATION ----------
    const signals = [...genreResult.signals, ...keywordResult.signals, ...castResult.signals];

    const positiveSignals = signals
      .filter((signal) => signal.sentiment === 'positive')
      .toSorted(bySignalStrength)
      .slice(0, 3);

    const mixedSignals = signals
      .filter((signal) => signal.sentiment === 'mixed')
      .toSorted(bySignalStrength)
      .slice(0, 3);

    const negativeSignals = signals
      .filter((signal) => signal.sentiment === 'negative')
      .toSorted(bySignalStrength)
      .slice(0, 3);

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
      castScore,
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

  return scored;
}
