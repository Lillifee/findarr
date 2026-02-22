import type { Media } from '@findarr/shared';
import { describe, it, expect } from 'vitest';
import { filterByCriteria } from './filter.js';

describe('filter service', () => {
  const baseItem: Media = {
    id: 123,
    type: 'movie',
    name: 'The Wrecking Crew',
    date: '2026-01-28',
    posterPath: '/theImage.jpg',
    backdropPath: '/theBackdrop.jpg',
    overview: 'description',
    voteAverage: 6.838,
    voteCount: 546,
    popularity: 242.0676,
    originalLanguage: 'en',
    originCountry: ['US'],
    genres: [
      { id: 28, name: 'Action' },
      { id: 35, name: 'Comedy' },
      { id: 80, name: 'Crime' },
      { id: 9648, name: 'Mystery' },
    ],
    trendingRank: 17,
    customPopularity: 630.4476,
  };

  it('should pass when all filters match', () => {
    const result = filterByCriteria(baseItem, {
      type: 'movie',
      regions: ['western'],
      genres: ['Action'],
    });

    expect(result).toBe(true);
  });

  it('should filter by type', () => {
    const result = filterByCriteria(baseItem, {
      type: 'tv',
      regions: [],
      genres: [],
    });

    expect(result).toBe(false);
  });

  it('should allow when type is both', () => {
    const result = filterByCriteria(baseItem, {
      type: 'both',
      regions: [],
      genres: [],
    });

    expect(result).toBe(true);
  });

  it('should filter by language if region selected', () => {
    const result = filterByCriteria(
      { ...baseItem, originalLanguage: 'ja' },
      {
        type: 'both',
        regions: ['western'],
        genres: [],
      }
    );

    expect(result).toBe(false);
  });

  it('should filter by country if region selected', () => {
    const result = filterByCriteria(
      { ...baseItem, originCountry: ['JP'] },
      {
        type: 'both',
        regions: ['western'],
        genres: [],
      }
    );

    expect(result).toBe(false);
  });

  it('should filter by genre', () => {
    const result = filterByCriteria(baseItem, {
      type: 'both',
      regions: [],
      genres: ['Fantasy'],
    });

    expect(result).toBe(false);
  });
});
