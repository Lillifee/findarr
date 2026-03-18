import {
  isDefined,
  type CreateUser,
  type Media,
  type MovieDetails,
  type TVDetails,
  type User,
} from '@findarr/shared';
import { createUser } from '../auth/repository.js';
import type { DB } from '../db/setup.js';
export const mockDb = {} as unknown as DB;

// Utility functions to assert

export function assertDefined<T>(value: T): asserts value is NonNullable<T> {
  if (!isDefined(value)) {
    throw new Error(`Expected value to be defined, but got ${value}`);
  }
}

// Factory functions to create test data

export const createTestUser = (props?: Partial<User>): User => ({
  id: 1,
  email: 'user@test.com',
  displayName: 'user',
  role: 'user',
  createdAt: Date.now(),
  ...props,
});

export const createTestMedia = (props?: Partial<Media>): Media => ({
  tmdbId: 0,
  type: 'movie',
  name: 'Test Movie',
  date: '2026-01-28',
  posterPath: '/path/to/poster.jpg',
  backdropPath: '/path/to/backdrop.jpg',
  overview: 'Test overview',
  voteAverage: 0,
  voteCount: 0,
  popularity: 100,
  originalLanguage: 'en',
  originCountry: ['US'],
  genres: [],
  ...props,
});

export const createTestTVDetail = (props?: Partial<TVDetails>): TVDetails => ({
  ...createTestMedia({ type: 'tv' }),
  type: 'tv',
  originalName: 'Test Show',
  episodeRunTime: [45],
  showType: 'Scripted',
  numberOfSeasons: 1,
  numberOfEpisodes: 10,
  status: 'Returning Series',
  homepage: undefined,
  tvdbId: undefined,
  imdbId: undefined,
  ...props,
});

export const createTestMovieDetail = (props?: Partial<MovieDetails>): MovieDetails => ({
  ...createTestMedia(),
  type: 'movie',
  tagline: 'Test tagline',
  runtime: 120,
  budget: 12,
  revenue: 34,
  status: 'Released',
  homepage: 'https://example.com',
  imdbId: 'tt1234567',
  ...props,
});

// Factory function to create data in the database for testing

export const createTestUserInDb = async (db: DB, props?: Partial<CreateUser>) =>
  await createUser(db, {
    email: 'user@test.com',
    password: 'password',
    displayName: 'Test User',
    role: 'user',
    ...props,
  });
