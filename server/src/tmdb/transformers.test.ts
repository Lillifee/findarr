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
        overview: 'Test overview',
        poster_path: '/path/to/poster.jpg',
        backdrop_path: '/path/to/backdrop.jpg',
        vote_average: 8,
        vote_count: 100,
        popularity: 50,
        genre_ids: [1],
        original_language: 'en',
        adult: false,
        video: false,
      };

      const result = transformMedia(movie, genreMap);

      expect(result).toMatchInlineSnapshot(`
        {
          "backdropPath": "/path/to/backdrop.jpg",
          "date": "2024-01-01",
          "genres": [
            {
              "id": 1,
              "name": "Action",
            },
          ],
          "name": "Movie",
          "originCountry": undefined,
          "originalLanguage": "en",
          "overview": "Test overview",
          "popularity": 50,
          "posterPath": "/path/to/poster.jpg",
          "tmdbId": 1,
          "type": "movie",
          "voteAverage": 8,
          "voteCount": 100,
        }
      `);
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
        overview: 'Test overview',
        poster_path: '/path/to/poster.jpg',
        backdrop_path: '/path/to/backdrop.jpg',
        vote_average: 7,
        vote_count: 50,
        popularity: 40,
        genre_ids: [1],
        original_language: 'en',
        origin_country: ['US'],
      };

      const result = transformMedia(tv, genreMap, { trendingRank: 1 });

      expect(result).toMatchInlineSnapshot(`
        {
          "backdropPath": "/path/to/backdrop.jpg",
          "date": "2023-01-01",
          "genres": [
            {
              "id": 1,
              "name": "Action",
            },
          ],
          "name": "Show",
          "originCountry": [
            "US",
          ],
          "originalLanguage": "en",
          "overview": "Test overview",
          "popularity": 40,
          "posterPath": "/path/to/poster.jpg",
          "tmdbId": 2,
          "trendingRank": 1,
          "type": "tv",
          "voteAverage": 7,
          "voteCount": 50,
        }
      `);
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

      const result = transformMedia(movie, genreMap, { trendingRank: 999 });

      expect(result.trendingRank).toBe(999);
    });
  });

  describe('transformDetails', () => {
    it('should transform TMDB movie details to application movie details', () => {
      const details: TMDBMovieDetails = {
        id: 1,
        type: 'movie',
        title: 'Movie',
        release_date: '2024-01-01',
        original_title: 'Movie',
        overview: 'Test overview',
        poster_path: '/path/to/poster.jpg',
        backdrop_path: '/path/to/backdrop.jpg',
        vote_average: 8,
        vote_count: 100,
        popularity: 50,
        original_language: 'en',
        genres: [],
        runtime: null,
        budget: 0,
        revenue: 0,
        status: 'Released',
        tagline: 'Test tagline',
        homepage: 'https://example.com',
        imdb_id: 'tt1234567',
      };

      const result = transformDetails(details);
      expect(result).toMatchInlineSnapshot(`
        {
          "backdropPath": "/path/to/backdrop.jpg",
          "budget": 0,
          "date": "2024-01-01",
          "genres": [],
          "homepage": "https://example.com",
          "imdbId": "tt1234567",
          "keywords": [],
          "name": "Movie",
          "originCountry": undefined,
          "originalLanguage": "en",
          "overview": "Test overview",
          "popularity": 50,
          "posterPath": "/path/to/poster.jpg",
          "revenue": 0,
          "runtime": undefined,
          "status": "Released",
          "tagline": "Test tagline",
          "tmdbId": 1,
          "type": "movie",
          "voteAverage": 8,
          "voteCount": 100,
        }
      `);
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
      expect(result).toMatchInlineSnapshot(`
        {
          "backdropPath": undefined,
          "date": undefined,
          "episodeRunTime": [
            45,
          ],
          "genres": [],
          "homepage": undefined,
          "keywords": [],
          "name": "Show",
          "numberOfEpisodes": 10,
          "numberOfSeasons": 1,
          "originCountry": [
            "US",
          ],
          "originalLanguage": "en",
          "originalName": "Show",
          "overview": undefined,
          "popularity": 40,
          "posterPath": undefined,
          "showType": "Scripted",
          "status": "Ended",
          "tmdbId": 2,
          "type": "tv",
          "voteAverage": 7,
          "voteCount": 50,
        }
      `);
    });
  });
});
