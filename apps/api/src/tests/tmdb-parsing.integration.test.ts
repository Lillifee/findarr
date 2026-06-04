import type { Genre } from '@findarr/shared/media';
import { describe, it, expect } from 'vite-plus/test';

import {
  TMDBSearchResponseSchema,
  TMDBMovieDetailsSchema,
  TMDBTVDetailsSchema,
  type TMDBMovieDetails,
  type TMDBTVDetails,
} from '../tmdb/schemas.js';
import { transformMedia, transformDetails } from '../tmdb/transformers.js';
import { loadFixture } from './helpers/fixtureHelper.js';

describe('TMDB Parsing Integration Tests - Real API Data', () => {
  // Mock genre map (in real app, this is loaded at startup)
  const genreMap = new Map<number, Genre>([
    [28, { id: 28, name: 'Action' }],
    [12, { id: 12, name: 'Adventure' }],
    [16, { id: 16, name: 'Animation' }],
    [35, { id: 35, name: 'Comedy' }],
    [80, { id: 80, name: 'Crime' }],
    [99, { id: 99, name: 'Documentary' }],
    [18, { id: 18, name: 'Drama' }],
    [10_751, { id: 10_751, name: 'Family' }],
    [14, { id: 14, name: 'Fantasy' }],
    [36, { id: 36, name: 'History' }],
    [27, { id: 27, name: 'Horror' }],
    [10_402, { id: 10_402, name: 'Music' }],
    [9648, { id: 9648, name: 'Mystery' }],
    [10_749, { id: 10_749, name: 'Romance' }],
    [878, { id: 878, name: 'Science Fiction' }],
    [10_770, { id: 10_770, name: 'TV Movie' }],
    [53, { id: 53, name: 'Thriller' }],
    [10_752, { id: 10_752, name: 'War' }],
    [37, { id: 37, name: 'Western' }],
    // TV genres
    [10_759, { id: 10_759, name: 'Action & Adventure' }],
    [10_762, { id: 10_762, name: 'Kids' }],
    [10_763, { id: 10_763, name: 'News' }],
    [10_764, { id: 10_764, name: 'Reality' }],
    [10_765, { id: 10_765, name: 'Sci-Fi & Fantasy' }],
    [10_766, { id: 10_766, name: 'Soap' }],
    [10_767, { id: 10_767, name: 'Talk' }],
    [10_768, { id: 10_768, name: 'War & Politics' }],
  ]);

  describe('Search responses', () => {
    it('should parse popular movies search response', () => {
      const fixture = loadFixture('tmdb/popular-movies.json');
      const parsed = TMDBSearchResponseSchema.parse(fixture);

      expect(parsed.results).toBeDefined();
      expect(parsed.results.length).toBeGreaterThan(0);
      expect(parsed.page).toBe(1);
      expect(parsed.total_results).toBeGreaterThan(0);

      // Verify first result has expected fields
      const [firstResult] = parsed.results;
      expect(firstResult).toBeDefined();
      expect(firstResult?.id).toBeDefined();

      if (firstResult?.type === 'movie') {
        expect(firstResult.title).toBeDefined();
        expect(firstResult.vote_average).toBeDefined();
        expect(firstResult.popularity).toBeDefined();
      }
    });

    it('should parse popular TV shows search response', () => {
      const fixture = loadFixture('tmdb/popular-tv.json');
      const parsed = TMDBSearchResponseSchema.parse(fixture);

      expect(parsed.results).toBeDefined();
      expect(parsed.results.length).toBeGreaterThan(0);

      // Verify first TV show has expected fields
      const [firstResult] = parsed.results;
      expect(firstResult).toBeDefined();
      expect(firstResult?.id).toBeDefined();

      if (firstResult?.type === 'tv') {
        expect(firstResult.name).toBeDefined();
        expect(firstResult.vote_average).toBeDefined();
      }
    });

    it('should parse trending daily response', () => {
      const fixture = loadFixture('tmdb/trending-daily.json');
      const parsed = TMDBSearchResponseSchema.parse(fixture);

      expect(parsed.results).toBeDefined();
      expect(parsed.results.length).toBeGreaterThan(0);
      expect(parsed.total_results).toBeGreaterThan(0);
    });

    it('should parse trending weekly response', () => {
      const fixture = loadFixture('tmdb/trending-weekly.json');
      const parsed = TMDBSearchResponseSchema.parse(fixture);

      expect(parsed.results).toBeDefined();
      expect(parsed.results.length).toBeGreaterThan(0);
    });

    it('should parse Batman search results', () => {
      const fixture = loadFixture('tmdb/search-batman.json');
      const parsed = TMDBSearchResponseSchema.parse(fixture);

      expect(parsed.results).toBeDefined();
      expect(parsed.results.length).toBeGreaterThan(0);
    });

    it('should contain at least one Batman movie in Batman search results', () => {
      const fixture = loadFixture('tmdb/search-batman.json');
      const parsed = TMDBSearchResponseSchema.parse(fixture);

      const batmanMovies = parsed.results
        .filter((r) => r.type === 'movie')
        .filter((r) => r.title?.toLowerCase().includes('batman'));

      expect(batmanMovies.length).toBeGreaterThan(0);
    });

    it('should parse Office TV search results', () => {
      const fixture = loadFixture('tmdb/search-office.json');
      const parsed = TMDBSearchResponseSchema.parse(fixture);

      expect(parsed.results).toBeDefined();
      expect(parsed.results.length).toBeGreaterThan(0);
    });
  });

  describe('Movie detail responses', () => {
    const movieIds = [550, 13, 603, 27_205, 157_336, 299_536, 155, 122];

    for (const id of movieIds) {
      it(`should parse movie-${id}.json (real TMDB response)`, () => {
        const fixture = loadFixture<TMDBMovieDetails>(`tmdb/movie-${id}.json`);
        const parsed = TMDBMovieDetailsSchema.parse(fixture);

        // Required fields
        expect(parsed.id).toBe(id);
        expect(parsed.title).toBeDefined();
        expect(parsed.overview).toBeDefined();
        expect(parsed.release_date).toBeDefined();
        expect(parsed.vote_average).toBeGreaterThanOrEqual(0);
        expect(parsed.vote_count).toBeGreaterThanOrEqual(0);
        expect(parsed.popularity).toBeGreaterThan(0);

        // Genres
        expect(parsed.genres).toBeDefined();
        expect(Array.isArray(parsed.genres)).toBe(true);

        // Keywords (with append_to_response)
        expect(parsed.keywords).toBeDefined();
        expect(Array.isArray(parsed.keywords?.keywords)).toBe(true);
      });
    }

    it('should transform Fight Club (550) to Media format', () => {
      const fixture = loadFixture<TMDBMovieDetails>('tmdb/movie-550.json');
      const parsed = TMDBMovieDetailsSchema.parse(fixture);
      const media = transformDetails(parsed);

      expect(media.tmdbId).toBe(550);
      expect(media.type).toBe('movie');
      expect(media.name).toBe('Fight Club');
      expect(media.genres.length).toBeGreaterThan(0);
      expect(media.keywords?.length).toBeGreaterThan(0);
      expect(media.voteAverage).toBeGreaterThan(0);
      expect(media.popularity).toBeGreaterThan(0);
    });

    it('should handle movies with missing keywords gracefully', () => {
      const fixture = loadFixture<TMDBMovieDetails>('tmdb/movie-13.json');
      const parsed = TMDBMovieDetailsSchema.parse(fixture);
      const media = transformDetails(parsed);

      expect(media.keywords).toBeDefined();
      expect(Array.isArray(media.keywords)).toBe(true);
    });

    it('should include IMDB ID when present', () => {
      const fixture = loadFixture<TMDBMovieDetails>('tmdb/movie-550.json');
      const parsed = TMDBMovieDetailsSchema.parse(fixture);
      const media = transformDetails(parsed);

      if (media.type === 'movie') {
        expect(media.imdbId).toBeDefined();
        expect(media.imdbId).toMatch(/^tt\d+$/u);
      }
    });
  });

  describe('TV show detail responses', () => {
    const tvIds = [1396, 1399, 46_952, 60_735, 94_605, 2316, 1668, 85_271];

    for (const id of tvIds) {
      it(`should parse tv-${id}.json (real TMDB response)`, () => {
        const fixture = loadFixture<TMDBTVDetails>(`tmdb/tv-${id}.json`);
        const parsed = TMDBTVDetailsSchema.parse(fixture);

        // Required fields
        expect(parsed.id).toBe(id);
        expect(parsed.name).toBeDefined();
        expect(parsed.overview).toBeDefined();
        expect(parsed.first_air_date).toBeDefined();
        expect(parsed.vote_average).toBeGreaterThanOrEqual(0);
        expect(parsed.vote_count).toBeGreaterThanOrEqual(0);
        expect(parsed.popularity).toBeGreaterThan(0);

        // TV-specific fields
        expect(parsed.number_of_seasons).toBeGreaterThanOrEqual(0);
        expect(parsed.number_of_episodes).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(parsed.episode_run_time)).toBe(true);

        // Genres
        expect(parsed.genres).toBeDefined();
        expect(Array.isArray(parsed.genres)).toBe(true);

        // Keywords
        expect(parsed.keywords).toBeDefined();
        expect(Array.isArray(parsed.keywords?.results)).toBe(true);
      });
    }

    it('should transform Breaking Bad (1396) to Media format', () => {
      const fixture = loadFixture<TMDBTVDetails>('tmdb/tv-1396.json');
      const parsed = TMDBTVDetailsSchema.parse(fixture);
      const media = transformDetails(parsed);

      expect(media.tmdbId).toBe(1396);
      expect(media.type).toBe('tv');
      expect(media.name).toBe('Breaking Bad');
      expect(media.genres.length).toBeGreaterThan(0);
      expect(media.voteAverage).toBeGreaterThan(0);

      if (media.type === 'tv') {
        expect(media.numberOfSeasons).toBeGreaterThan(0);
        expect(media.numberOfEpisodes).toBeGreaterThan(0);
        expect(media.tvdbId).toBeDefined();
      }
    });

    it('should include TVDB ID when present', () => {
      const fixture = loadFixture<TMDBTVDetails>('tmdb/tv-1396.json');
      const parsed = TMDBTVDetailsSchema.parse(fixture);
      const media = transformDetails(parsed);

      if (media.type === 'tv') {
        expect(media.tvdbId).toBeDefined();
        expect(typeof media.tvdbId).toBe('number');
      }
    });
  });

  describe('Edge cases', () => {
    it('should parse low vote count movies', () => {
      const fixture = loadFixture('tmdb/edge-case-low-votes.json');
      const parsed = TMDBSearchResponseSchema.parse(fixture);

      expect(parsed.results).toBeDefined();
      expect(parsed.results.length).toBeGreaterThan(0);

      // Verify vote counts are low
      const allLowVotes = parsed.results.every((r) => r.vote_count <= 50);
      expect(allLowVotes).toBe(true);
    });

    it('should parse obscure but highly rated movies', () => {
      const fixture = loadFixture('tmdb/edge-case-obscure-high-rated.json');
      const parsed = TMDBSearchResponseSchema.parse(fixture);

      expect(parsed.results).toBeDefined();
      expect(parsed.results.length).toBeGreaterThan(0);

      // Verify ratings are high but vote counts are low
      expect(parsed.results.every((r) => r.vote_average >= 7)).toBe(true);
      expect(parsed.results.every((r) => r.vote_count >= 10)).toBe(true);
      expect(parsed.results.every((r) => r.vote_count <= 100)).toBe(true);
    });
  });

  describe('Search result transformation', () => {
    it('should transform popular movies to Media[]', () => {
      const fixture = loadFixture('tmdb/popular-movies.json');
      const parsed = TMDBSearchResponseSchema.parse(fixture);

      const mediaArray = parsed.results.map((item) => transformMedia(item, genreMap));

      expect(mediaArray.length).toBeGreaterThan(0);
      for (const media of mediaArray) {
        expect(media.tmdbId).toBeDefined();
        expect(media.type).toBe('movie');
        expect(media.name).toBeDefined();
        expect(media.popularity).toBeGreaterThan(0);
        expect(Array.isArray(media.genres)).toBe(true);
      }
    });

    it('should transform TV shows to Media[]', () => {
      const fixture = loadFixture('tmdb/popular-tv.json');
      const parsed = TMDBSearchResponseSchema.parse(fixture);

      const mediaArray = parsed.results.map((item) => transformMedia(item, genreMap));

      expect(mediaArray.length).toBeGreaterThan(0);
      for (const media of mediaArray) {
        expect(media.tmdbId).toBeDefined();
        expect(media.type).toBe('tv');
        expect(media.name).toBeDefined();
        expect(media.popularity).toBeGreaterThan(0);
      }
    });
  });

  describe('Required fields validation', () => {
    it('all movie fixtures should have required fields', () => {
      const movieIds = [550, 13, 603, 27_205, 157_336, 299_536, 155, 122];

      for (const id of movieIds) {
        const fixture = loadFixture<TMDBMovieDetails>(`tmdb/movie-${id}.json`);
        const parsed = TMDBMovieDetailsSchema.parse(fixture);
        const media = transformDetails(parsed);

        // Core Media fields
        expect(media.tmdbId).toBe(id);
        expect(media.name).toBeDefined();
        expect(typeof media.name).toBe('string');
        expect(media.name.length).toBeGreaterThan(0);
        expect(media.date).toBeDefined();
        expect(media.voteAverage).toBeGreaterThanOrEqual(0);
        expect(media.voteCount).toBeGreaterThanOrEqual(0);
        expect(media.popularity).toBeGreaterThan(0);
        expect(Array.isArray(media.genres)).toBe(true);
        expect(Array.isArray(media.keywords)).toBe(true);
      }
    });

    it('all TV fixtures should have required fields', () => {
      const tvIds = [1396, 1399, 46_952, 60_735, 94_605, 2316, 1668, 85_271];

      for (const id of tvIds) {
        const fixture = loadFixture<TMDBTVDetails>(`tmdb/tv-${id}.json`);
        const parsed = TMDBTVDetailsSchema.parse(fixture);
        const media = transformDetails(parsed);

        // Core Media fields
        expect(media.tmdbId).toBe(id);
        expect(media.name).toBeDefined();
        expect(typeof media.name).toBe('string');
        expect(media.name.length).toBeGreaterThan(0);
        expect(media.date).toBeDefined();
        expect(media.voteAverage).toBeGreaterThanOrEqual(0);
        expect(media.voteCount).toBeGreaterThanOrEqual(0);
        expect(media.popularity).toBeGreaterThan(0);
        expect(Array.isArray(media.genres)).toBe(true);
        expect(Array.isArray(media.keywords)).toBe(true);

        // TV-specific fields
        if (media.type === 'tv') {
          expect(media.numberOfSeasons).toBeGreaterThanOrEqual(0);
          expect(media.numberOfEpisodes).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('TMDB API compatibility', () => {
    it('should not break when TMDB adds new optional fields', () => {
      // Take a real fixture and add a new unknown field
      const fixture = loadFixture<TMDBMovieDetails>('tmdb/movie-550.json');
      const withNewField = {
        ...fixture,
        new_tmdb_field_2026: 'this is a new field TMDB added',
      };

      // Should parse without error (Zod strips unknown fields by default)
      expect(() => TMDBMovieDetailsSchema.parse(withNewField)).not.toThrow();
    });

    it('should parse all captured fixtures without errors', () => {
      // This is a comprehensive smoke test - if TMDB changes their API,
      // this test will catch it when fixtures are refreshed
      const movieIds = [550, 13, 603, 27_205, 157_336, 299_536, 155, 122];
      const tvIds = [1396, 1399, 46_952, 60_735, 94_605, 2316, 1668, 85_271];

      for (const id of movieIds) {
        const fixture = loadFixture(`tmdb/movie-${id}.json`);
        expect(() => TMDBMovieDetailsSchema.parse(fixture)).not.toThrow();
      }

      for (const id of tvIds) {
        const fixture = loadFixture(`tmdb/tv-${id}.json`);
        expect(() => TMDBTVDetailsSchema.parse(fixture)).not.toThrow();
      }
    });
  });
});
