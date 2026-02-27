import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as requestService from '../services/request.js';
import { createMedia, mockDb, createUser } from '../utils/testHelper.js';
import { requestRoutes, adminRequestRoutes } from './requests.js';

describe('requestRoutes', () => {
  let app: FastifyInstance;
  const user = createUser();
  const enrichedMedia = createMedia({
    state: {
      record: {
        id: 1,
        status: 'pending',
        jellyfinId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  });

  beforeEach(async () => {
    app = Fastify();

    // decorate db and auth hooks
    app.decorate('db', mockDb);
    app.decorate('requireAuth', async () => {});
    app.decorate('requireAdmin', async () => {});

    // Mock tmdb service
    app.decorate('tmdb', {
      loadGenres: vi.fn().mockResolvedValue(undefined),
      search: vi.fn(),
      fetchDiscover: vi.fn(),
      fetchTrending: vi.fn(),
      getGenres: vi.fn().mockReturnValue([]),
      getDetails: vi.fn(),
    });

    // Mock catalog service
    app.decorate('catalog', {
      initialize: vi.fn().mockResolvedValue(undefined),
      search: vi.fn(),
      popular: vi.fn(),
      discover: vi.fn(),
      getDetails: vi.fn(),
      getGenres: vi.fn(),
    });

    // inject authenticated user
    app.addHook('preHandler', async req => {
      req.user = user;
    });

    // Mock service methods
    vi.spyOn(requestService, 'createRequest').mockResolvedValue({
      id: 1,
      tmdbId: 123,
      mediaType: 'movie',
      jellyfinId: null,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    vi.spyOn(requestService, 'getUserRequestsEnriched').mockResolvedValue([enrichedMedia]);
    vi.spyOn(requestService, 'getAllRequestsEnriched').mockResolvedValue([enrichedMedia]);
    vi.spyOn(requestService, 'updateRequestStatus').mockResolvedValue();
    vi.spyOn(requestService, 'getUserRequestById').mockReturnValue({
      id: 1,
      tmdbId: 123,
      mediaType: 'movie',
      jellyfinId: null,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

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
    };
    const res = await app.inject({ method: 'POST', url: '/requests', payload });

    expect(res.statusCode).toBe(200);
    expect(requestService.createRequest).toHaveBeenCalledWith(mockDb, payload, user.id);
  });

  it('should return user requests', async () => {
    const res = await app.inject({ method: 'GET', url: '/requests' });

    expect(res.statusCode).toBe(200);
    expect(requestService.getUserRequestsEnriched).toHaveBeenCalled();
  });

  it('should return user request by ID', async () => {
    const res = await app.inject({ method: 'GET', url: '/requests/1' });

    expect(res.statusCode).toBe(200);
    expect(requestService.getUserRequestById).toHaveBeenCalledWith(mockDb, 1, user.id, user.role);
  });

  it('should return all requests (admin)', async () => {
    const res = await app.inject({ method: 'GET', url: '/requests/admin' });

    expect(res.statusCode).toBe(200);
    expect(requestService.getAllRequestsEnriched).toHaveBeenCalled();
  });

  it('should update request status (admin)', async () => {
    const payload = { status: 'approved' };
    const res = await app.inject({ method: 'PATCH', url: '/requests/admin/1', payload });

    expect(res.statusCode).toBe(200);
    expect(requestService.updateRequestStatus).toHaveBeenCalledWith(mockDb, 1, payload.status);
  });
});
