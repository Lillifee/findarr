import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Media } from '../../../shared/dist/types.js';
import { createTestMedia } from '../utils/testHelper.js';
import { scoreMediaItems } from './scoring.js';

const mockNow = new Date('2026-01-01').getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(mockNow);
});

describe('scoreMediaItems', () => {
  const createMovie = (props?: Partial<Media>): Media => {
    const { state, ...rest } = props || {};
    return createTestMedia({
      type: 'movie',
      popularity: 10,
      voteAverage: 7,
      voteCount: 100,
      date: '2025-12-01',
      state: {
        trendingRank: 1,
        ...state,
      },
      ...rest,
    });
  };

  it('should normalize trending rank correctly', () => {
    const items: Media[] = [
      createMovie({ id: 1, state: { trendingRank: 1 } }),
      createMovie({ id: 2, state: { trendingRank: 10 } }),
    ];

    const result = scoreMediaItems(items);

    const first = result.find(i => i.id === 1);
    const second = result.find(i => i.id === 2);

    expect(first?.state?.score?.trendingScore).toBeGreaterThan(
      second?.state?.score?.trendingScore || 0
    );
  });

  it('should decay recency over time', () => {
    const items: Media[] = [
      createMovie({ id: 1, date: '2025-12-31' }), // 1 day old
      createMovie({ id: 2, date: '2020-01-01' }), // very old
    ];

    const result = scoreMediaItems(items);

    const recent = result.find(i => i.id === 1);
    const old = result.find(i => i.id === 2);

    expect(recent?.state?.score?.recencyScore).toBeGreaterThan(
      old?.state?.score?.recencyScore || 0
    );
  });

  it('should normalize popularity per type independently', () => {
    const items: Media[] = [
      createMovie({ id: 1, popularity: 10 }),
      createMovie({ id: 2, popularity: 20 }),
      createMovie({ id: 3, type: 'tv', popularity: 100 }),
      createMovie({ id: 4, type: 'tv', popularity: 50 }),
    ];

    const result = scoreMediaItems(items);

    const movie1 = result.find(i => i.id === 1);
    const movie2 = result.find(i => i.id === 2);
    const tv1 = result.find(i => i.id === 3);
    const tv2 = result.find(i => i.id === 4);

    // Movie with popularity 10 should have lower score than movie with 20
    expect(movie1?.state?.score?.popularityScore).toBeLessThan(
      movie2?.state?.score?.popularityScore || 0
    );
    // TV with popularity 50 should have lower score than TV with 100
    expect(tv2?.state?.score?.popularityScore).toBeLessThan(
      tv1?.state?.score?.popularityScore || 0
    );
  });

  it('should sort items by baseScore descending', () => {
    const items: Media[] = [
      createMovie({
        id: 1,
        popularity: 10,
        voteAverage: 5,
        voteCount: 1,
        state: { trendingRank: 50 },
        date: '2010-01-01',
      }),
      createMovie({
        id: 2,
        popularity: 100,
        voteAverage: 9,
        voteCount: 1000,
        state: { trendingRank: 1 },
        date: '2025-12-01',
      }),
    ];

    const result = scoreMediaItems(items);
    expect(result[0]?.id).toBe(2);
  });

  it('should handle missing date gracefully', () => {
    const items: Media[] = [createMovie({ id: 1, date: undefined })];

    const result = scoreMediaItems(items);
    expect(result[0]?.state?.score?.recencyScore).toBe(0);
  });
});
