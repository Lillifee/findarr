import type { Media, MovieDetails, User } from '@findarr/shared';
import type { DB } from '../db/setup.js';
import type { MediaDbRow } from '../services/media.js';
import type { UserWithPassword } from '../services/user.js';

export const mockDb = {} as unknown as DB;

export const createUser = (props?: Partial<User>): User => ({
  id: 1,
  email: 'user@test.com',
  displayName: 'user',
  role: 'user',
  createdAt: Date.now(),
  ...props,
});

export const createAdminUser = (props?: Partial<User>): User => ({
  ...createUser(),
  role: 'admin',
  ...props,
});

export const createUserWithPassword = (props?: Partial<UserWithPassword>): UserWithPassword => ({
  ...createUser(),
  passwordHash: 'hashed',
  ...props,
});

export const createMediaDbRow = (props?: Partial<MediaDbRow>): MediaDbRow => ({
  id: 1,
  mediaType: 'movie',
  tmdbId: 123,
  jellyfinId: null,
  status: 'pending',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...props,
});

export const createMedia = (props?: Partial<Media>): Media => ({
  id: 0,
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

export const createMediaDetail = (props?: Partial<MovieDetails>): MovieDetails => ({
  ...createMedia(),
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
