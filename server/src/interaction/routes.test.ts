import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as mediaService from '../media/repository.js';
import { createTestMedia, mockDb, createTestUser } from '../utils/testHelper.js';
import { interactionRoutes } from './routes.js';
import * as interactionService from './service.js';

describe('interactionRoutes', () => {
  let app: FastifyInstance;
  const user = createTestUser();
  const enrichedMedia = createTestMedia({
    state: {
      record: {
        id: 1,
        status: 'requested',
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
    vi.spyOn(interactionService, 'createInteraction').mockResolvedValue({
      id: 1,
      tmdbId: 123,
      mediaType: 'movie',
      jellyfinId: null,
      status: 'requested',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    vi.spyOn(mediaService, 'updateMediaStatus').mockResolvedValue();
    vi.spyOn(interactionService, 'getUserInteractionsEnriched').mockResolvedValue([enrichedMedia]);

    await app.register(interactionRoutes, { prefix: '/interactions' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('should create an interaction', async () => {
    const payload = {
      mediaType: 'movie',
      tmdbId: 123,
      action: 'liked',
    };
    const res = await app.inject({ method: 'POST', url: '/interactions', payload });

    expect(res.statusCode).toBe(200);
    expect(interactionService.createInteraction).toHaveBeenCalledWith(mockDb, payload, user);
  });

  it('should return user interactions', async () => {
    const res = await app.inject({ method: 'GET', url: '/interactions' });

    expect(res.statusCode).toBe(200);
    expect(interactionService.getUserInteractionsEnriched).toHaveBeenCalled();
  });
});
