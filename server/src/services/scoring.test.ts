import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Media } from '../../../shared/dist/types.js';
import { createMedia } from '../utils/testHelper.js';
import { scoreMediaItems } from './scoring.js';

const mockNow = new Date('2026-01-01').getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(mockNow);
});

describe('scoreMediaItems', () => {
  const createMovie = (props?: Partial<Media>): Media =>
    createMedia({
      type: 'movie',
      popularity: 10,
      voteAverage: 7,
      voteCount: 100,
      trendingRank: 1,
      date: '2025-12-01',
      ...props,
    });

  it('should normalize trending rank correctly', () => {
    const items: Media[] = [
      createMovie({ id: 1, trendingRank: 1 }),
      createMovie({ id: 2, trendingRank: 10 }),
    ];

    const result = scoreMediaItems(items);

    const first = result.find(i => i.id === 1);
    const second = result.find(i => i.id === 2);

    expect(first?.score?.trendingScore).toBeGreaterThan(second?.score?.trendingScore || 0);
  });

  it('should decay recency over time', () => {
    const items: Media[] = [
      createMovie({ id: 1, date: '2025-12-31' }), // 1 day old
      createMovie({ id: 2, date: '2020-01-01' }), // very old
    ];

    const result = scoreMediaItems(items);

    const recent = result.find(i => i.id === 1);
    const old = result.find(i => i.id === 2);

    expect(recent?.score?.recencyScore).toBeGreaterThan(old?.score?.recencyScore || 0);
  });

  it('should normalize popularity per type independently', () => {
    const items: Media[] = [
      createMovie({ id: 1, popularity: 100 }),
      createMovie({ id: 2, type: 'tv', popularity: 10 }),
    ];

    const result = scoreMediaItems(items);

    const movie = result.find(i => i.id === 1);
    const tv = result.find(i => i.id === 2);

    expect(movie?.score?.popularityScore).toBe(0);
    expect(tv?.score?.popularityScore).toBe(0);
  });

  it('should sort items by baseScore descending', () => {
    const items: Media[] = [
      createMovie({
        id: 1,
        popularity: 10,
        voteAverage: 5,
        voteCount: 1,
        trendingRank: 50,
        date: '2010-01-01',
      }),
      createMovie({
        id: 2,
        popularity: 100,
        voteAverage: 9,
        voteCount: 1000,
        trendingRank: 1,
        date: '2025-12-01',
      }),
    ];

    const result = scoreMediaItems(items);
    expect(result[0]?.id).toBe(2);
  });

  it('should handle missing date gracefully', () => {
    const items: Media[] = [createMovie({ id: 1, date: undefined })];

    const result = scoreMediaItems(items);
    expect(result[0]?.score?.recencyScore).toBe(0);
  });
});
