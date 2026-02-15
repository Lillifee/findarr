import type {
  Media,
  MediaRequest,
  MediaRequestWithUser,
  MovieDetails,
  User,
} from '@findarr/shared';
import type { DB } from '../db/setup.js';
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

export const createMediaRequest = (props?: Partial<MediaRequest>): MediaRequest => ({
  id: 1,
  userId: 1,
  mediaType: 'movie',
  tmdbId: 123,
  title: 'Test Movie',
  posterPath: '/path/to/poster.jpg',
  status: 'pending',
  requestedAt: Date.now(),
  updatedAt: Date.now(),
  ...props,
});

export const createMediaRequestWithUser = (
  props?: Partial<MediaRequestWithUser>
): MediaRequestWithUser => ({
  ...createMediaRequest(),
  userEmail: 'user@test.com',
  userDisplayName: 'user',
  ...props,
});

export const createMedia = (props?: Partial<Media>): Media => ({
  id: 0,
  type: 'movie',
  name: 'Test Movie',
  date: '2026-01-28',
  poster_path: '/path/to/poster.jpg',
  overview: 'Test overview',
  vote_average: 0,
  vote_count: 0,
  popularity: 100,
  original_language: 'en',
  origin_country: ['US'],
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
  imdb_id: 'tt1234567',
  ...props,
});
