import { describe, it, expect } from 'vitest';
import {
  TMDBMovieSchema,
  TMDBTVSchema,
  TMDBGenreSchema,
  createAppendToResponse,
} from './schemas.js';

describe('tmdb/schemas', () => {
  describe('TMDBMovieSchema', () => {
    it('should parse and transform valid TMDB movie object', () => {
      const tmdbMovie = {
        id: 1,
        title: 'Test Movie',
        release_date: '2024-01-01',
        original_title: 'Test Movie',
        overview: 'A test movie',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.5,
        vote_count: 200,
        popularity: 100,
        genre_ids: [28, 12],
        original_language: 'en',
        adult: false,
        video: false,
      };

      const result = TMDBMovieSchema.parse(tmdbMovie);

      expect(result.type).toBe('movie');
      expect(result.id).toBe(1);
      expect(result.title).toBe('Test Movie');
    });

    it('should handle null/undefined optional fields', () => {
      const tmdbMovie = {
        id: 2,
        title: 'Movie',
        release_date: null,
        original_title: 'Movie',
        overview: null,
        poster_path: null,
        backdrop_path: null,
        vote_average: 0,
        vote_count: 0,
        popularity: 0,
        original_language: 'en',
      };

      const result = TMDBMovieSchema.parse(tmdbMovie);

      expect(result.type).toBe('movie');
      expect(result.release_date).toBeNull();
      expect(result.overview).toBeNull();
    });
  });

  describe('TMDBTVSchema', () => {
    it('should parse and transform valid TMDB TV show object', () => {
      const tmdbTV = {
        id: 1,
        name: 'Test Show',
        first_air_date: '2024-01-01',
        original_name: 'Test Show',
        overview: 'A test show',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8,
        vote_count: 150,
        popularity: 80,
        genre_ids: [18, 10_765],
        original_language: 'en',
        origin_country: ['US'],
      };

      const result = TMDBTVSchema.parse(tmdbTV);

      expect(result.type).toBe('tv');
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Show');
      expect(result.origin_country).toEqual(['US']);
    });

    it('should handle null/undefined optional fields', () => {
      const tmdbTV = {
        id: 2,
        name: 'Show',
        first_air_date: null,
        original_name: 'Show',
        overview: null,
        poster_path: null,
        backdrop_path: null,
        vote_average: 0,
        vote_count: 0,
        popularity: 0,
        original_language: 'en',
      };

      const result = TMDBTVSchema.parse(tmdbTV);

      expect(result.type).toBe('tv');
      expect(result.first_air_date).toBeNull();
      expect(result.overview).toBeNull();
    });
  });

  describe('TMDBGenreSchema', () => {
    it('should parse valid genre object', () => {
      const genre = {
        id: 28,
        name: 'Action',
      };

      const result = TMDBGenreSchema.parse(genre);

      expect(result.id).toBe(28);
      expect(result.name).toBe('Action');
    });
  });

  describe('createAppendToResponse', () => {
    it('should create comma-separated string from single value', () => {
      const result = createAppendToResponse('credits');
      expect(result).toBe('credits');
    });

    it('should create comma-separated string from multiple values', () => {
      const result = createAppendToResponse('credits', 'videos', 'images');
      expect(result).toBe('credits,videos,images');
    });

    it('should handle empty array', () => {
      const result = createAppendToResponse();
      expect(result).toBe('');
    });
  });
});
