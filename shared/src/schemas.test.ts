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
} from './index.js';

describe('schemas', () => {
  describe('ServerEnvSchema', () => {
    const validEnv = {
      HOST: '0.0.0.0',
      PORT: '8585',
    };

    it('should allow startup without TMDB or session env configuration', () => {
      expect(ServerEnvSchema.safeParse({}).success).toBe(true);
      expect(ServerEnvSchema.safeParse(validEnv).success).toBe(true);
    });

    it('should apply correct default values', () => {
      const result = ServerEnvSchema.parse(validEnv);

      expect(result.PORT).toBe(8585);
      expect(result.HOST).toBe('0.0.0.0');
      expect(result.NODE_ENV).toBe('production');
      expect(result.DATA_PATH).toBe('./data');
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
        true,
      );
      expect(ServerEnvSchema.safeParse({ ...validEnv, NODE_ENV: 'staging' }).success).toBe(false);
    });

    it('should parse complete valid configuration', () => {
      const fullConfig = {
        PORT: '8080',
        HOST: '127.0.0.1',
        NODE_ENV: 'development',
        DATA_PATH: './data/dev',
      };

      const result = ServerEnvSchema.parse(fullConfig);

      expect(result).toMatchObject({
        PORT: 8080, // Should be coerced to number
        NODE_ENV: 'development',
        DATA_PATH: './data/dev',
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

    it('should ignore user settings fields that are server-owned', () => {
      expect(DiscoverQuerySchema.parse({ regions: ['western'] })).toEqual({ genres: [] });
      expect(DiscoverQuerySchema.parse({ language: 'de-DE' })).toEqual({ genres: [] });
    });

    it('should accept genre filters from query params', () => {
      expect(DiscoverQuerySchema.parse({ genres: ['Action'] })).toEqual({
        genres: ['Action'],
      });
      expect(DiscoverQuerySchema.parse({ genres: 'Action' })).toEqual({
        genres: ['Action'],
      });
    });

    it('should handle full valid input', () => {
      const input = {
        page: 10,
        type: 'movie',
        recentDays: 30,
        genres: ['Action'],
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
        true,
      );
    });

    it('should require non-empty password', () => {
      expect(LoginSchema.safeParse({ email: 'test@example.com', password: '' }).success).toBe(
        false,
      );
      expect(LoginSchema.safeParse({ email: 'test@example.com', password: 'x' }).success).toBe(
        true,
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
          .success,
      ).toBe(true);
    });

    it('should only accept movie or tv mediaType', () => {
      expect(
        CreateInteractionSchema.safeParse({ ...validRequest, mediaType: 'movie' }).success,
      ).toBe(true);
      expect(CreateInteractionSchema.safeParse({ ...validRequest, mediaType: 'tv' }).success).toBe(
        true,
      );
      expect(
        CreateInteractionSchema.safeParse({ ...validRequest, mediaType: 'person' }).success,
      ).toBe(false);
    });

    it('should require positive integer tmdbId', () => {
      expect(CreateInteractionSchema.safeParse({ ...validRequest, tmdbId: 0 }).success).toBe(false);
      expect(CreateInteractionSchema.safeParse({ ...validRequest, tmdbId: -1 }).success).toBe(
        false,
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
