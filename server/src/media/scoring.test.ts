import type { Media, UserGenrePreference, UserKeywordPreference } from '@findarr/shared';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assertDefined, createTestMedia } from '../utils/testHelper.js';
import { scoreMediaItems, scoreMediaItemsForUser, type MediaStats } from './scoring.js';

const mockNow = new Date('2026-01-01').getTime();

// Mock media stats for testing
const mockMovieStats: MediaStats = {
  mediaType: 'movie',
  minPopularity: 0,
  maxPopularity: 100,
  minVoteCount: 0,
  maxVoteCount: 1000,
  maxAvgRating: 8,
  updatedAt: Date.now(),
};

const mockTVStats: MediaStats = {
  mediaType: 'tv',
  minPopularity: 0,
  maxPopularity: 100,
  minVoteCount: 0,
  maxVoteCount: 1000,
  maxAvgRating: 8,
  updatedAt: Date.now(),
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(mockNow);
});

describe('scoreSingleMediaItem', () => {
  const createMovie = (props?: Partial<Media>): Media => {
    const { state, ...rest } = props || {};
    return createTestMedia({
      type: 'movie',
      popularity: 10,
      voteAverage: 7,
      voteCount: 100,
      date: '2025-12-01',
      trendingRank: 1,
      state: {
        ...state,
      },
      ...rest,
    });
  };

  it('should normalize trending rank correctly', () => {
    const items = [
      createMovie({ tmdbId: 1, trendingRank: 1 }),
      createMovie({ tmdbId: 2, trendingRank: 10 }),
    ];

    const result = scoreMediaItems(items, mockMovieStats, mockTVStats);
    const first = result[0];
    const second = result[1];

    expect(first?.state?.score?.trendingScore).toBeGreaterThan(
      second?.state?.score?.trendingScore || 0
    );
  });

  it('should decay recency over time', () => {
    const items = [
      createMovie({ tmdbId: 1, date: '2025-12-31' }), // 1 day old
      createMovie({ tmdbId: 2, date: '2020-01-01' }), // very old
    ];

    const result = scoreMediaItems(items, mockMovieStats, mockTVStats);
    const recent = result.find((i: Media) => i.tmdbId === 1);
    const old = result.find((i: Media) => i.tmdbId === 2);

    expect(recent?.state?.score?.recencyScore).toBeGreaterThan(
      old?.state?.score?.recencyScore || 0
    );
  });

  it('should normalize popularity per type independently', () => {
    const items = [
      createMovie({ tmdbId: 1, popularity: 10 }),
      createMovie({ tmdbId: 2, popularity: 20 }),
      createMovie({ tmdbId: 3, type: 'tv', popularity: 100 }),
      createMovie({ tmdbId: 4, type: 'tv', popularity: 50 }),
    ];

    const result = scoreMediaItems(items, mockMovieStats, mockTVStats);
    const movie1 = result.find((i: Media) => i.tmdbId === 1);
    const movie2 = result.find((i: Media) => i.tmdbId === 2);
    const tv1 = result.find((i: Media) => i.tmdbId === 3);
    const tv2 = result.find((i: Media) => i.tmdbId === 4);

    // Movie with popularity 10 should have lower score than movie with 20
    expect(movie1?.state?.score?.popularityScore).toBeLessThan(
      movie2?.state?.score?.popularityScore || 0
    );
    // TV with popularity 50 should have lower score than TV with 100
    expect(tv2?.state?.score?.popularityScore).toBeLessThan(
      tv1?.state?.score?.popularityScore || 0
    );
  });

  // TODO: Update remaining tests to use scoreMediaItems
  it.skip('should handle additional scoring scenarios', () => {
    // Tests to be updated for individual item scoring
  });
});

describe.skip('scoreMediaItemsForUser - TODO: Update tests', () => {
  const defaultScore = {
    recencyScore: 0.5,
    trendingScore: 0.5,
    popularityScore: 0.5,
    weightedRating: 0.5,
    baseScore: 0.5,
    baseTrendingScore: 0.5,
    genreScore: 0,
    keywordScore: 0,
    userScore: 0,
    finalScore: 0.5,
    finalTrendingScore: 0.5,
  };

  const createMovie = (props?: Partial<Media>): Media =>
    createTestMedia({
      type: 'movie',
      popularity: 10,
      voteAverage: 7,
      voteCount: 100,
      date: '2025-12-01',
      genres: [{ id: 28, name: 'Action' }],
      keywords: [],
      state: {
        score: defaultScore,
      },
      ...props,
    });

  describe('Bayesian normalization with count tracking', () => {
    it('should apply Bayesian smoothing to prevent single-rating extremes', () => {
      const items: Media[] = [createMovie({ tmdbId: 1, genres: [{ id: 28, name: 'Action' }] })];

      // Single like: (1+0)/(1+2) = 0.333
      const genrePrefs = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 1, count: 1 }],
      ]);

      const scored = scoreMediaItemsForUser(items, genrePrefs);
      const genreScore = scored[0]?.state?.score?.userScore || 0;

      // Should be positive but not ext (< 1.0 due to Bayesian prior)
      expect(genreScore).toBeGreaterThan(0);
      expect(genreScore).toBeLessThan(1);
    });

    it('should increase confidence with more ratings (higher count)', () => {
      const items: Media[] = [createMovie({ tmdbId: 1, genres: [{ id: 28, name: 'Action' }] })];

      // 1 like out of 1 rating: (1+0)/(1+2) = 0.333
      const lowConfidence = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 1, count: 1 }],
      ]);

      // 5 likes out of 5 ratings: (5+0)/(5+2) = 0.714
      const highConfidence = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 5, count: 5 }],
      ]);

      const scoredLow = scoreMediaItemsForUser(items, lowConfidence);
      const scoredHigh = scoreMediaItemsForUser(items, highConfidence);

      const lowScore = scoredLow[0]?.state?.score?.userScore || 0;
      const highScore = scoredHigh[0]?.state?.score?.userScore || 0;

      // More ratings = higher confidence = higher score (for same positive ratio)
      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should not punish rare preferences (no max normalization)', () => {
      const items: Media[] = [
        createMovie({ tmdbId: 1, genres: [{ id: 28, name: 'Action' }] }),
        createMovie({ tmdbId: 2, genres: [{ id: 99, name: 'Documentary' }] }),
      ];

      // Action: rated many times with high score
      // Documentary: rated once with high ratio (rare but loved)
      const genrePrefs = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 10, count: 10 }], // 10/12 = 0.833
        [99, { genreId: 99, genreName: 'Documentary', score: 1, count: 1 }], // 1/3 = 0.333
      ]);

      const scored = scoreMediaItemsForUser(items, genrePrefs);

      const actionScore = scored.find(m => m.tmdbId === 1)?.state?.score?.userScore || 0;
      const docScore = scored.find(m => m.tmdbId === 2)?.state?.score?.userScore || 0;

      // Both should contribute positively, documentary not punished for being rare
      expect(actionScore).toBeGreaterThan(0);
      expect(docScore).toBeGreaterThan(0);
      // Action should score higher due to more confidence (higher count)
      expect(actionScore).toBeGreaterThan(docScore);
    });

    it('should handle negative preferences correctly', () => {
      const items: Media[] = [
        createMovie({ tmdbId: 1, genres: [{ id: 28, name: 'Action' }] }),
        createMovie({ tmdbId: 2, genres: [{ id: 35, name: 'Comedy' }] }),
      ];

      const genrePrefs = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 5, count: 5 }], // liked
        [35, { genreId: 35, genreName: 'Comedy', score: -3, count: 6 }], // disliked
      ]);

      const scored = scoreMediaItemsForUser(items, genrePrefs);

      const actionScore = scored.find(m => m.tmdbId === 1)?.state?.score?.userScore || 0;
      const comedyScore = scored.find(m => m.tmdbId === 2)?.state?.score?.userScore || 0;

      expect(actionScore).toBeGreaterThan(0);
      expect(comedyScore).toBeLessThan(0);
    });

    it('should track count independently from score (toggle behavior)', () => {
      const items: Media[] = [createMovie({ tmdbId: 1, genres: [{ id: 28, name: 'Action' }] })];

      // User toggled preference 3 times: like (+1), dislike (-1), like (+1)
      // Final score: 1, but count: 3 (represents decision confidence)
      const genrePrefs = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 1, count: 3 }],
      ]);

      const scored = scoreMediaItemsForUser(items, genrePrefs);
      const userScore = scored[0]?.state?.score?.userScore || 0;

      // Should be positive and higher than single rating due to count=3
      // (1+0)/(3+2) = 0.2 normalized score with count=3
      expect(userScore).toBeGreaterThan(0);
    });
  });

  describe('keyword scoring with cumulative signal', () => {
    it('should process ALL matching keywords (not just top N)', () => {
      const items: Media[] = [
        createMovie({
          tmdbId: 1,
          keywords: [
            { id: 100, name: 'keyword1' },
            { id: 101, name: 'keyword2' },
            { id: 102, name: 'keyword3' },
            { id: 103, name: 'keyword4' },
            { id: 104, name: 'keyword5' },
            { id: 105, name: 'keyword6' },
            { id: 106, name: 'keyword7' },
          ],
        }),
      ];

      // Like 2, dislike 5 - cumulative signal should be negative
      const keywordPrefs = new Map<number, UserKeywordPreference>([
        [100, { keywordId: 100, keywordName: 'keyword1', score: 1, count: 1 }],
        [101, { keywordId: 101, keywordName: 'keyword2', score: 1, count: 1 }],
        [102, { keywordId: 102, keywordName: 'keyword3', score: -0.5, count: 1 }],
        [103, { keywordId: 103, keywordName: 'keyword4', score: -0.5, count: 1 }],
        [104, { keywordId: 104, keywordName: 'keyword5', score: -0.5, count: 1 }],
        [105, { keywordId: 105, keywordName: 'keyword6', score: -0.5, count: 1 }],
        [106, { keywordId: 106, keywordName: 'keyword7', score: -0.5, count: 1 }],
      ]);

      const scored = scoreMediaItemsForUser(items, new Map(), keywordPrefs);
      const userScore = scored[0]?.state?.score?.userScore || 0;

      // With 5 dislikes vs 2 likes, cumulative signal should be negative
      expect(userScore).toBeLessThan(0);
    });

    it('should handle media with no matching preferences', () => {
      const items: Media[] = [createMovie({ tmdbId: 1, keywords: [{ id: 999, name: 'unknown' }] })];

      const keywordPrefs = new Map<number, UserKeywordPreference>([
        [100, { keywordId: 100, keywordName: 'superhero', score: 1, count: 1 }],
      ]);

      const scored = scoreMediaItemsForUser(items, new Map(), keywordPrefs);
      const userScore = scored[0]?.state?.score?.userScore || 0;

      // No matching keywords = userScore should be 0
      expect(userScore).toBe(0);
    });
  });

  describe('combined genre and keyword scoring', () => {
    it('should combine both genre and keyword scores', () => {
      const items: Media[] = [
        createMovie({
          tmdbId: 1,
          genres: [{ id: 28, name: 'Action' }],
          keywords: [{ id: 100, name: 'superhero' }],
        }),
      ];

      const genrePrefs = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 5, count: 5 }],
      ]);

      const keywordPrefs = new Map<number, UserKeywordPreference>([
        [100, { keywordId: 100, keywordName: 'superhero', score: 3, count: 3 }],
      ]);

      const scored = scoreMediaItemsForUser(items, genrePrefs, keywordPrefs);
      const userScore = scored[0]?.state?.score?.userScore || 0;

      // Both genre and keyword contribute positively
      expect(userScore).toBeGreaterThan(0);
    });

    it('should blend base score with user preferences in finalScore', () => {
      const items: Media[] = [
        createMovie({
          tmdbId: 1,
          state: {
            score: {
              recencyScore: 0.5,
              trendingScore: 0.5,
              popularityScore: 0.5,
              weightedRating: 0.5,
              baseScore: 0.8,
              baseTrendingScore: 0.8,
              genreScore: 0,
              keywordScore: 0,
              userScore: 0,
              finalScore: 0.8,
              finalTrendingScore: 0.8,
            },
          },
          genres: [{ id: 28, name: 'Action' }],
        }),
      ];

      const genrePrefs = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 5, count: 5 }],
      ]);

      const scored = scoreMediaItemsForUser(items, genrePrefs);
      const finalScore = scored[0]?.state?.score?.finalScore || 0;
      const baseScore = scored[0]?.state?.score?.baseScore || 0;

      // finalScore should be influenced by both base and user preferences
      // Formula: 0.7 * baseScore + 0.15 * genreMatch + 0.15 * keywordMatch
      expect(finalScore).toBeGreaterThan(baseScore * 0.7); // User pref adds to it
      expect(finalScore).toBeLessThan(baseScore + 1); // But doesn't explode
    });

    it('should sort by finalScore after applying user preferences', () => {
      const items: Media[] = [
        createMovie({
          tmdbId: 1,
          state: {
            score: {
              ...defaultScore,
              baseScore: 0.9,
              finalScore: 0.9,
            },
          },
          genres: [{ id: 35, name: 'Comedy' }], // disliked
        }),
        createMovie({
          tmdbId: 2,
          state: {
            score: {
              ...defaultScore,
              baseScore: 0.5,
              finalScore: 0.5,
            },
          },
          genres: [{ id: 28, name: 'Action' }], // liked
        }),
      ];

      // Strong preference difference
      const genrePrefs = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 20, count: 20 }], // strong like
        [35, { genreId: 35, genreName: 'Comedy', score: -50, count: 20 }], // very strong dislike
      ]);

      const scored = scoreMediaItemsForUser(items, genrePrefs);

      // Despite higher baseScore (0.9), comedy movie should rank lower due to strong negative preference
      // Action movie (baseScore 0.5) should rank higher due to strong positive preference
      expect(scored[0]?.tmdbId).toBe(2); // Action movie comes first
      expect(scored[1]?.tmdbId).toBe(1); // Comedy movie demoted
    });
  });

  describe('edge cases', () => {
    it('should return items unchanged when no preferences exist', () => {
      const items: Media[] = [createMovie({ tmdbId: 1 })];

      const scored = scoreMediaItemsForUser(items, new Map(), new Map());

      expect(scored[0]?.state?.score?.userScore).toBe(0);
      expect(scored[0]?.state?.score?.finalScore).toBe(scored[0]?.state?.score?.baseScore);
    });

    it('should handle media with no genres or keywords', () => {
      const items: Media[] = [createMovie({ tmdbId: 1, genres: [], keywords: [] })];

      const genrePrefs = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 5, count: 5 }],
      ]);

      const scored = scoreMediaItemsForUser(items, genrePrefs);

      expect(scored[0]?.state?.score?.userScore).toBe(0);
    });

    it('should handle zero count gracefully (should not happen but defensive)', () => {
      const items: Media[] = [createMovie({ tmdbId: 1, genres: [{ id: 28, name: 'Action' }] })];

      // Should not happen in practice but test defensive code
      const genrePrefs = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 1, count: 0 }],
      ]);

      // Should not crash or produce NaN
      expect(() => scoreMediaItemsForUser(items, genrePrefs)).not.toThrow();
    });

    it('should copy genre score to keyword score when item has no keywords', () => {
      const baseScore = 0.5;
      const items: Media[] = [
        createMovie({
          tmdbId: 1,
          state: { score: { ...defaultScore, baseScore } },
          genres: [{ id: 28, name: 'Action' }],
          keywords: [], // No keywords
        }),
        createMovie({
          tmdbId: 2,
          state: { score: { ...defaultScore, baseScore } },
          genres: [{ id: 28, name: 'Action' }],
          keywords: [{ id: 123, name: 'hero' }], // Has keywords
        }),
      ];

      const genrePrefs = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 3, count: 3 }],
      ]);

      const keywordPrefs = new Map<number, UserKeywordPreference>([
        [123, { keywordId: 123, keywordName: 'hero', score: 0, count: 1 }], // Neutral keyword
      ]);

      const scored = scoreMediaItemsForUser(items, genrePrefs, keywordPrefs);

      const item1 = scored.find(m => m.tmdbId === 1);
      const item2 = scored.find(m => m.tmdbId === 2);

      assertDefined(item1);
      assertDefined(item2);

      // Both should have genreScore > 0
      expect(item1.state?.score?.genreScore).toBeGreaterThan(0);
      expect(item2.state?.score?.genreScore).toBeGreaterThan(0);

      // Item 1 (no keywords) should have keywordScore = genreScore (copied)
      expect(item1.state?.score?.keywordScore).toBe(item1.state?.score?.genreScore);

      // Item 1 should not be penalized - finalScore should equal 70% base + 30% genre
      // Because keywordScore = genreScore: 0.15*genre + 0.15*keyword = 0.15*genre + 0.15*genre = 0.3*genre
      const expectedFinalScore1 =
        0.7 * baseScore +
        0.15 * (item1?.state?.score?.genreScore ?? 0) +
        0.15 * (item1?.state?.score?.genreScore ?? 0);
      expect(item1?.state?.score?.finalScore).toBeCloseTo(expectedFinalScore1, 5);

      // Item 2 should use 15% genre + 15% calculated keyword
      const expectedFinalScore2 =
        0.7 * baseScore +
        0.15 * (item2?.state?.score?.genreScore ?? 0) +
        0.15 * (item2?.state?.score?.keywordScore ?? 0);
      expect(item2?.state?.score?.finalScore).toBeCloseTo(expectedFinalScore2, 5);
    });

    it('should handle items with no keywords but with genre preferences', () => {
      const baseScore = 0.6;
      const items: Media[] = [
        createMovie({
          tmdbId: 1,
          state: { score: { ...defaultScore, baseScore } },
          genres: [
            { id: 28, name: 'Action' },
            { id: 12, name: 'Adventure' },
          ],
          keywords: [], // No keywords available
        }),
      ];

      const genrePrefs = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 5, count: 5 }],
        [12, { genreId: 12, genreName: 'Adventure', score: 3, count: 3 }],
      ]);

      const scored = scoreMediaItemsForUser(items, genrePrefs);

      const item = scored[0];

      assertDefined(item);

      // Should calculate genreScore based on both genres
      expect(item.state?.score?.genreScore).toBeGreaterThan(0);

      // keywordScore should equal genreScore (not 0)
      expect(item.state?.score?.keywordScore).toBe(item.state?.score?.genreScore);

      // finalScore should be 70% base + 30% genre (effectively)
      const expectedFinalScore =
        0.7 * baseScore +
        0.15 * (item?.state?.score?.genreScore ?? 0) +
        0.15 * (item?.state?.score?.genreScore ?? 0);
      expect(item?.state?.score?.finalScore).toBeCloseTo(expectedFinalScore, 5);

      // Verify it's not penalized (finalScore > baseScore since genres are liked)
      expect(item.state?.score?.finalScore).toBeGreaterThan(baseScore);
    });

    it('should not copy genre score when keywords exist but have no preferences', () => {
      const baseScore = 0.5;
      const items: Media[] = [
        createMovie({
          tmdbId: 1,
          state: { score: { ...defaultScore, baseScore } },
          genres: [{ id: 28, name: 'Action' }],
          keywords: [{ id: 999, name: 'unrated' }], // Has keywords but no preferences for them
        }),
      ];

      const genrePrefs = new Map<number, UserGenrePreference>([
        [28, { genreId: 28, genreName: 'Action', score: 5, count: 5 }],
      ]);

      const keywordPrefs = new Map<number, UserKeywordPreference>([
        [123, { keywordId: 123, keywordName: 'hero', score: 3, count: 3 }], // Different keyword
      ]);

      const scored = scoreMediaItemsForUser(items, genrePrefs, keywordPrefs);

      const item = scored[0];

      assertDefined(item);

      // Should have genreScore > 0
      expect(item.state?.score?.genreScore).toBeGreaterThan(0);

      // keywordScore should be 0 (keywords exist but no matching preferences)
      expect(item.state?.score?.keywordScore).toBe(0);

      // Should NOT copy genreScore to keywordScore
      expect(item.state?.score?.keywordScore).not.toBe(item.state?.score?.genreScore);
    });
  });
});
