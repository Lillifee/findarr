import { describe, it, expect } from 'vitest';
import {
  ServerEnvSchema,
  SearchQuerySchema,
  DetailsQuerySchema,
  LoginSchema,
  CreateUserSchema,
  CreateInteractionSchema,
  InteractionIdSchema,
  DiscoverQuerySchema,
  regionGroupKeys,
  genreKeys,
} from './index.js';

describe('schemas', () => {
  describe('ServerEnvSchema', () => {
    const validEnv = {
      TMDB_ACCESS_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      SESSION_SECRET: 'a'.repeat(32),
      JELLYFIN_URL: 'http://localhost:8096',
      JELLYFIN_API_KEY: 'test-api-key',
    };

    it('should require TMDB_ACCESS_TOKEN and SESSION_SECRET', () => {
      expect(ServerEnvSchema.safeParse({}).success).toBe(false);
      expect(ServerEnvSchema.safeParse({ TMDB_ACCESS_TOKEN: 'token' }).success).toBe(false);
      expect(ServerEnvSchema.safeParse({ SESSION_SECRET: 'a'.repeat(32) }).success).toBe(false);
    });

    it('should enforce SESSION_SECRET minimum length of 32 characters', () => {
      expect(ServerEnvSchema.safeParse({ ...validEnv, SESSION_SECRET: 'too-short' }).success).toBe(
        false
      );
      expect(
        ServerEnvSchema.safeParse({ ...validEnv, SESSION_SECRET: 'a'.repeat(32) }).success
      ).toBe(true);
    });

    it('should apply correct default values', () => {
      const result = ServerEnvSchema.parse(validEnv);

      expect(result.TMDB_BASE_URL).toBe('https://api.themoviedb.org/3');
      expect(result.PORT).toBe(3000);
      expect(result.HOST).toBe('0.0.0.0');
      expect(result.NODE_ENV).toBe('production');
      expect(result.DB_PATH).toBe('./data/findarr.db');
      expect(result.ADMIN_EMAIL).toBe('admin@findarr.local');
      expect(result.ADMIN_PASSWORD).toBe('changeme');
    });

    it('should coerce PORT from string to number', () => {
      const result = ServerEnvSchema.parse({ ...validEnv, PORT: '8080' });
      expect(result.PORT).toBe(8080);
      expect(typeof result.PORT).toBe('number');
    });

    it('should validate PORT range (1-65535)', () => {
      expect(ServerEnvSchema.safeParse({ ...validEnv, PORT: 0 }).success).toBe(false);
      expect(ServerEnvSchema.safeParse({ ...validEnv, PORT: 1 }).success).toBe(true);
      expect(ServerEnvSchema.safeParse({ ...validEnv, PORT: 65_535 }).success).toBe(true);
      expect(ServerEnvSchema.safeParse({ ...validEnv, PORT: 65_536 }).success).toBe(false);
    });

    it('should only accept valid NODE_ENV values', () => {
      expect(ServerEnvSchema.safeParse({ ...validEnv, NODE_ENV: 'development' }).success).toBe(
        true
      );
      expect(ServerEnvSchema.safeParse({ ...validEnv, NODE_ENV: 'staging' }).success).toBe(false);
    });

    it('should parse complete valid configuration', () => {
      const fullConfig = {
        TMDB_ACCESS_TOKEN: 'token123',
        SESSION_SECRET: 'super-secret-key-that-is-at-least-32-chars-long',
        TMDB_BASE_URL: 'https://custom-api.example.com',
        PORT: '8080',
        HOST: '127.0.0.1',
        NODE_ENV: 'development',
        DB_PATH: './data/dev.db',
        ADMIN_EMAIL: 'admin@findarr.local',
        ADMIN_PASSWORD: 'changeme',
        JELLYFIN_URL: 'http://localhost:8096',
        JELLYFIN_API_KEY: 'test-api-key',
      };

      const result = ServerEnvSchema.parse(fullConfig);

      expect(result).toMatchObject({
        TMDB_ACCESS_TOKEN: 'token123',
        SESSION_SECRET: 'super-secret-key-that-is-at-least-32-chars-long',
        PORT: 8080, // Should be coerced to number
        NODE_ENV: 'development',
        ADMIN_EMAIL: 'admin@findarr.local',
        ADMIN_PASSWORD: 'changeme',
      });
    });
  });

  describe('SearchQuerySchema', () => {
    it('should require query parameter', () => {
      expect(SearchQuerySchema.safeParse({}).success).toBe(false);
      expect(SearchQuerySchema.safeParse({ query: '' }).success).toBe(false);
      expect(SearchQuerySchema.safeParse({ query: 'batman' }).success).toBe(true);
    });

    it('should apply default values for page and type', () => {
      const result = SearchQuerySchema.parse({ query: 'batman' });
      expect(result.page).toBe(1);
      expect(result.type).toBe('both');
    });

    it('should coerce page from string to number', () => {
      const result = SearchQuerySchema.parse({ query: 'batman', page: '5' });
      expect(result.page).toBe(5);
      expect(typeof result.page).toBe('number');
    });

    it('should validate page range (1-1000)', () => {
      expect(SearchQuerySchema.safeParse({ query: 'test', page: 0 }).success).toBe(false);
      expect(SearchQuerySchema.safeParse({ query: 'test', page: 1 }).success).toBe(true);
      expect(SearchQuerySchema.safeParse({ query: 'test', page: 1000 }).success).toBe(true);
      expect(SearchQuerySchema.safeParse({ query: 'test', page: 1001 }).success).toBe(false);
    });

    it('should only accept valid type values', () => {
      expect(SearchQuerySchema.safeParse({ query: 'test', type: 'movie' }).success).toBe(true);
      expect(SearchQuerySchema.safeParse({ query: 'test', type: 'tv' }).success).toBe(true);
      expect(SearchQuerySchema.safeParse({ query: 'test', type: 'both' }).success).toBe(true);
      expect(SearchQuerySchema.safeParse({ query: 'test', type: 'person' }).success).toBe(false);
    });
  });

  describe('DiscoverQuerySchema', () => {
    it('should accept empty object and apply defaults', () => {
      const result = DiscoverQuerySchema.parse({});
      expect(result.page).toBeUndefined(); // optional
      expect(result.type).toBeUndefined(); // optional
      expect(result.recentDays).toBeUndefined(); // optional
      expect(result.regionGroups).toEqual([]); // default applied
      expect(result.withGenres).toEqual([]); // default applied
    });

    it('should coerce string numbers to numbers for page and recentDays', () => {
      const result = DiscoverQuerySchema.parse({
        page: '5',
        recentDays: '30',
      });
      expect(result.page).toBe(5);
      expect(result.recentDays).toBe(30);
    });

    it('should reject invalid page numbers', () => {
      expect(DiscoverQuerySchema.safeParse({ page: 0 }).success).toBe(false);
      expect(DiscoverQuerySchema.safeParse({ page: 1001 }).success).toBe(false);
      expect(DiscoverQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
    });

    it('should reject invalid recentDays', () => {
      expect(DiscoverQuerySchema.safeParse({ recentDays: 0 }).success).toBe(false);
      expect(DiscoverQuerySchema.safeParse({ recentDays: 5000 }).success).toBe(false);
      expect(DiscoverQuerySchema.safeParse({ recentDays: 'abc' }).success).toBe(false);
    });

    it('should accept valid type values', () => {
      expect(DiscoverQuerySchema.safeParse({ type: 'movie' }).success).toBe(true);
      expect(DiscoverQuerySchema.safeParse({ type: 'tv' }).success).toBe(true);
      expect(DiscoverQuerySchema.safeParse({ type: 'both' }).success).toBe(true);
      expect(DiscoverQuerySchema.safeParse({ type: 'invalid' }).success).toBe(false);
    });

    it('should accept valid regionGroups and withGenres arrays', () => {
      const validRegion = regionGroupKeys[0];
      const validGenre = genreKeys[0];

      expect(DiscoverQuerySchema.safeParse({ regionGroups: [validRegion] }).success).toBe(true);
      expect(DiscoverQuerySchema.safeParse({ withGenres: [validGenre] }).success).toBe(true);

      // invalid values should fail
      expect(DiscoverQuerySchema.safeParse({ regionGroups: ['invalid'] }).success).toBe(false);
      expect(DiscoverQuerySchema.safeParse({ withGenres: ['invalid'] }).success).toBe(false);

      // single value without array should be coerced to a valid array
      const singleValue = DiscoverQuerySchema.safeParse({ regionGroups: validRegion });
      expect(singleValue.data?.regionGroups).toEqual([validRegion]);

      // invalid types should be coerced to empty arrays
      const invalidType = DiscoverQuerySchema.safeParse({ regionGroups: 42 });
      expect(invalidType.data?.regionGroups).toEqual([]);

      // empty string should be coerced to empty array
      const emptyValue = DiscoverQuerySchema.safeParse({ regionGroups: '' });
      expect(emptyValue.data?.regionGroups).toEqual([]);
    });

    it('should handle full valid input', () => {
      const input = {
        page: 10,
        type: 'movie',
        recentDays: 30,
        regionGroups: [regionGroupKeys[0]],
        withGenres: [genreKeys[0]],
      };
      const result = DiscoverQuerySchema.parse(input);
      expect(result).toEqual(input);
    });
  });
  describe('DetailsQuerySchema', () => {
    it('should require id and type', () => {
      expect(DetailsQuerySchema.safeParse({}).success).toBe(false);
      expect(DetailsQuerySchema.safeParse({ id: 123 }).success).toBe(false);
      expect(DetailsQuerySchema.safeParse({ type: 'movie' }).success).toBe(false);
      expect(DetailsQuerySchema.safeParse({ id: 123, type: 'movie' }).success).toBe(true);
    });

    it('should coerce id from string to number', () => {
      const result = DetailsQuerySchema.parse({ id: '550', type: 'movie' });
      expect(result.id).toBe(550);
      expect(typeof result.id).toBe('number');
    });

    it('should only accept movie or tv type', () => {
      expect(DetailsQuerySchema.safeParse({ id: 123, type: 'movie' }).success).toBe(true);
      expect(DetailsQuerySchema.safeParse({ id: 123, type: 'tv' }).success).toBe(true);
      expect(DetailsQuerySchema.safeParse({ id: 123, type: 'person' }).success).toBe(false);
    });
  });

  describe('LoginSchema', () => {
    it('should require email and password', () => {
      expect(LoginSchema.safeParse({}).success).toBe(false);
      expect(LoginSchema.safeParse({ email: 'test@example.com' }).success).toBe(false);
      expect(LoginSchema.safeParse({ password: 'password123' }).success).toBe(false);
    });

    it('should validate email format', () => {
      expect(LoginSchema.safeParse({ email: 'invalid', password: 'pass' }).success).toBe(false);
      expect(LoginSchema.safeParse({ email: 'test@example.com', password: 'pass' }).success).toBe(
        true
      );
    });

    it('should require non-empty password', () => {
      expect(LoginSchema.safeParse({ email: 'test@example.com', password: '' }).success).toBe(
        false
      );
      expect(LoginSchema.safeParse({ email: 'test@example.com', password: 'x' }).success).toBe(
        true
      );
    });
  });

  describe('CreateUserSchema', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    };

    it('should require email, password, and displayName', () => {
      expect(CreateUserSchema.safeParse({}).success).toBe(false);
      expect(CreateUserSchema.safeParse({ email: 'test@test.com' }).success).toBe(false);
      expect(CreateUserSchema.safeParse(validUser).success).toBe(true);
    });

    it('should enforce password minimum length of 8 characters', () => {
      expect(CreateUserSchema.safeParse({ ...validUser, password: 'short' }).success).toBe(false);
      expect(CreateUserSchema.safeParse({ ...validUser, password: '12345678' }).success).toBe(true);
    });

    it('should default role to user', () => {
      const result = CreateUserSchema.parse(validUser);
      expect(result.role).toBe('user');
    });

    it('should only accept valid role values', () => {
      expect(CreateUserSchema.safeParse({ ...validUser, role: 'user' }).success).toBe(true);
      expect(CreateUserSchema.safeParse({ ...validUser, role: 'admin' }).success).toBe(true);
      expect(CreateUserSchema.safeParse({ ...validUser, role: 'moderator' }).success).toBe(false);
    });
  });

  describe('CreateMediaInteractionSchema', () => {
    const validRequest = {
      mediaType: 'movie' as const,
      tmdbId: 550,
      action: 'liked' as const,
    };

    it('should require mediaType and tmdbId', () => {
      expect(CreateInteractionSchema.safeParse({}).success).toBe(false);
      expect(CreateInteractionSchema.safeParse({ mediaType: 'movie' }).success).toBe(false);
      expect(
        CreateInteractionSchema.safeParse({ mediaType: 'movie', tmdbId: 123, action: 'liked' })
          .success
      ).toBe(true);
    });

    it('should only accept movie or tv mediaType', () => {
      expect(
        CreateInteractionSchema.safeParse({ ...validRequest, mediaType: 'movie' }).success
      ).toBe(true);
      expect(CreateInteractionSchema.safeParse({ ...validRequest, mediaType: 'tv' }).success).toBe(
        true
      );
      expect(
        CreateInteractionSchema.safeParse({ ...validRequest, mediaType: 'person' }).success
      ).toBe(false);
    });

    it('should require positive integer tmdbId', () => {
      expect(CreateInteractionSchema.safeParse({ ...validRequest, tmdbId: 0 }).success).toBe(false);
      expect(CreateInteractionSchema.safeParse({ ...validRequest, tmdbId: -1 }).success).toBe(
        false
      );
      expect(CreateInteractionSchema.safeParse({ ...validRequest, tmdbId: 1 }).success).toBe(true);
    });
  });

  describe('InteractionIdSchema', () => {
    it('should require id', () => {
      expect(InteractionIdSchema.safeParse({}).success).toBe(false);
      expect(InteractionIdSchema.safeParse({ id: 1 }).success).toBe(true);
    });

    it('should coerce id from string to number', () => {
      const result = InteractionIdSchema.parse({ id: '123' });
      expect(result.id).toBe(123);
      expect(typeof result.id).toBe('number');
    });

    it('should require positive integer id', () => {
      expect(InteractionIdSchema.safeParse({ id: 0 }).success).toBe(false);
      expect(InteractionIdSchema.safeParse({ id: -1 }).success).toBe(false);
      expect(InteractionIdSchema.safeParse({ id: 1.5 }).success).toBe(false);
      expect(InteractionIdSchema.safeParse({ id: 1 }).success).toBe(true);
    });
  });
});
