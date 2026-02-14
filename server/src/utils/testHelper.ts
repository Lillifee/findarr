import type { MediaRequest, MediaRequestWithUser, User } from '@findarr/shared';
import type { DB } from '../db/setup.js';
import type { UserWithPassword } from '../services/user.js';

export const mockDb = {} as unknown as DB;

export const mockUser: User = {
  id: 1,
  email: 'user@test.com',
  display_name: 'user',
  role: 'user',
  created_at: Date.now(),
};

export const mockAdminUser: User = {
  ...mockUser,
  role: 'admin',
};

export const mockUserWithPassword: UserWithPassword = {
  ...mockUser,
  password_hash: 'hashed',
};

export const mockMediaRequest: MediaRequest = {
  id: 1,
  user_id: 1,
  media_type: 'movie',
  tmdb_id: 123,
  title: 'Test Movie',
  poster_path: '/path/to/poster.jpg',
  status: 'pending',
  requested_at: Date.now(),
  updated_at: Date.now(),
};

export const mockMediaRequestWithUser: MediaRequestWithUser = {
  ...mockMediaRequest,
  user_email: mockUser.email,
  user_display_name: mockUser.display_name,
};
