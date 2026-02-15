import { describe, it, expect } from 'vitest';
import type { TMDBMovie, TMDBTVShow, TMDBMovieDetails, TMDBTVDetails } from './schemas.js';
import { transformMedia, transformDetails } from './transformers.js';

describe('tmdb/transformers', () => {
  const genreMap = new Map<number, { id: number; name: string }>([[1, { id: 1, name: 'Action' }]]);

  describe('transformMedia', () => {
    it('should transform TMDB movie to application movie type', () => {
      const movie: TMDBMovie = {
        id: 1,
        type: 'movie',
        title: 'Movie',
        release_date: '2024-01-01',
        original_title: 'Movie',
        overview: null,
        poster_path: null,
        backdrop_path: null,
        vote_average: 8,
        vote_count: 100,
        popularity: 50,
        genre_ids: [1],
        original_language: 'en',
        adult: false,
        video: false,
      };

      const result = transformMedia(movie, genreMap);

      expect(result.type).toBe('movie');
      expect(result.genres[0]?.name).toBe('Action');
    });

    it('should transform TMDB movie with no genre_ids', () => {
      const movie: TMDBMovie = {
        id: 3,
        type: 'movie',
        title: 'Movie No Genres',
        release_date: '2024-01-01',
        original_title: 'Movie No Genres',
        overview: null,
        poster_path: null,
        backdrop_path: null,
        vote_average: 8,
        vote_count: 100,
        popularity: 50,
        original_language: 'en',
        adult: false,
        video: false,
      };

      const result = transformMedia(movie, genreMap);

      expect(result.type).toBe('movie');
      expect(result.genres).toEqual([]);
    });

    it('should transform TMDB TV show to application TV type', () => {
      const tv: TMDBTVShow = {
        id: 2,
        type: 'tv',
        name: 'Show',
        first_air_date: '2023-01-01',
        original_name: 'Show',
        overview: null,
        poster_path: null,
        backdrop_path: null,
        vote_average: 7,
        vote_count: 50,
        popularity: 40,
        genre_ids: [1],
        original_language: 'en',
        origin_country: ['US'],
      };

      const result = transformMedia(tv, genreMap, { trendingRank: 1 });

      expect(result.type).toBe('tv');
      expect(result.trendingRank).toBe(1);
    });

    it('should apply custom fields when provided', () => {
      const movie: TMDBMovie = {
        id: 4,
        type: 'movie',
        title: 'Custom Movie',
        release_date: '2024-01-01',
        original_title: 'Custom Movie',
        overview: null,
        poster_path: null,
        backdrop_path: null,
        vote_average: 8,
        vote_count: 100,
        popularity: 50,
        genre_ids: [],
        original_language: 'en',
        adult: false,
        video: false,
      };

      const result = transformMedia(movie, genreMap, { customPopularity: 999 });

      expect(result.customPopularity).toBe(999);
    });
  });

  describe('transformDetails', () => {
    it('should transform TMDB movie details to application movie details', () => {
      const details: TMDBMovieDetails = {
        id: 1,
        type: 'movie',
        title: 'Movie',
        release_date: null,
        original_title: 'Movie',
        overview: null,
        poster_path: null,
        backdrop_path: null,
        vote_average: 8,
        vote_count: 100,
        popularity: 50,
        original_language: 'en',
        genres: [],
        runtime: null,
        budget: 0,
        revenue: 0,
        status: 'Released',
        tagline: null,
        homepage: null,
        imdb_id: null,
      };

      const result = transformDetails(details);
      expect(result.type).toBe('movie');
    });

    it('should transform TMDB TV details to application TV details', () => {
      const details: TMDBTVDetails = {
        id: 2,
        type: 'tv',
        show_type: 'Scripted',
        name: 'Show',
        first_air_date: null,
        original_name: 'Show',
        overview: null,
        poster_path: null,
        backdrop_path: null,
        vote_average: 7,
        vote_count: 50,
        popularity: 40,
        original_language: 'en',
        origin_country: ['US'],
        genres: [],
        episode_run_time: [45],
        number_of_episodes: 10,
        number_of_seasons: 1,
        status: 'Ended',
        homepage: null,
      };

      const result = transformDetails(details);
      expect(result.type).toBe('tv');
    });
  });
});
