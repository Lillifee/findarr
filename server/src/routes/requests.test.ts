import type { MediaRequest, MediaRequestWithUser, User } from '@findarr/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DB } from '../db/setup.js';
import * as requestService from '../services/request.js';
import { requestRoutes, adminRequestRoutes } from './requests.js';

describe('requestRoutes', () => {
  let app: FastifyInstance;

  const mockDb = {} as unknown as DB;

  const mockUser: User = {
    id: 1,
    email: 'user@test.com',
    display_name: 'Test User',
    role: 'user',
    created_at: Date.now(),
  };

  const mediaRequest: MediaRequest = {
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

  const mediaRequestWithUser: MediaRequestWithUser = {
    ...mediaRequest,
    user_email: mockUser.email,
    user_display_name: mockUser.display_name,
  };

  beforeEach(async () => {
    app = Fastify();

    // decorate db and auth hooks
    app.decorate('db', mockDb);
    app.decorate('requireAuth', async () => {});
    app.decorate('requireAdmin', async () => {});

    // inject authenticated user
    app.addHook('preHandler', async req => {
      req.user = mockUser;
    });

    // mock services
    vi.spyOn(requestService, 'createRequest').mockResolvedValue(mediaRequest);
    vi.spyOn(requestService, 'getUserRequests').mockResolvedValue([mediaRequest]);
    vi.spyOn(requestService, 'getAllRequests').mockResolvedValue([mediaRequestWithUser]);
    vi.spyOn(requestService, 'updateRequestStatus').mockResolvedValue();
    vi.spyOn(requestService, 'getUserRequestById').mockResolvedValue(mediaRequest);

    await app.register(requestRoutes, { prefix: '/requests' });
    await app.register(adminRequestRoutes, { prefix: '/requests/admin' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('should create a request', async () => {
    const payload = {
      mediaType: 'movie',
      tmdbId: 123,
      title: 'Test Movie',
      posterPath: '/path/to/poster.jpg',
    };
    const res = await app.inject({ method: 'POST', url: '/requests', payload });

    expect(res.statusCode).toBe(200);
    expect(requestService.createRequest).toHaveBeenCalledWith(mockDb, payload, mockUser.id);
  });

  it('should return user requests', async () => {
    const res = await app.inject({ method: 'GET', url: '/requests' });

    expect(res.statusCode).toBe(200);
    expect(requestService.getUserRequests).toHaveBeenCalledWith(mockDb, mockUser.id);
  });

  it('should return user request by ID', async () => {
    const res = await app.inject({ method: 'GET', url: '/requests/1' });

    expect(res.statusCode).toBe(200);
    expect(requestService.getUserRequestById).toHaveBeenCalledWith(
      mockDb,
      1,
      mockUser.id,
      mockUser.role
    );
  });

  it('should return all requests (admin)', async () => {
    const res = await app.inject({ method: 'GET', url: '/requests/admin' });

    expect(res.statusCode).toBe(200);
    expect(requestService.getAllRequests).toHaveBeenCalledWith(mockDb);
  });

  it('should update request status (admin)', async () => {
    const payload = { status: 'approved' };
    const res = await app.inject({ method: 'PATCH', url: '/requests/admin/1', payload });

    expect(res.statusCode).toBe(200);
    expect(requestService.updateRequestStatus).toHaveBeenCalledWith(mockDb, 1, payload.status);
  });
});
