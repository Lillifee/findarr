import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { arrConfig } from '../arr/config.js';
import type { ArrService } from '../arr/service.js';
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
        tvdbId: null,
        arrId: null,
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
      findByExternalId: vi.fn(),
    });

    // Mock radarr service
    app.decorate('radarr', {
      config: arrConfig.radarr,
      request: vi.fn(),
      testConnection: vi.fn(),
      isConfigured: vi.fn().mockResolvedValue(true),
      getProfiles: vi.fn(),
      getRootFolders: vi.fn(),
      getLibrary: vi.fn().mockResolvedValue([]),
      getQueue: vi.fn().mockResolvedValue({ records: [] }),
    } satisfies ArrService<typeof arrConfig.radarr>);

    // Mock sonarr service
    app.decorate('sonarr', {
      config: arrConfig.sonarr,
      request: vi.fn(),
      testConnection: vi.fn(),
      isConfigured: vi.fn().mockResolvedValue(true),
      getProfiles: vi.fn(),
      getRootFolders: vi.fn(),
      getLibrary: vi.fn().mockResolvedValue([]),
      getQueue: vi.fn().mockResolvedValue({ records: [] }),
    } satisfies ArrService<typeof arrConfig.sonarr>);

    // Mock catalog service
    app.decorate('catalog', {
      initialize: vi.fn().mockResolvedValue(undefined),
      search: vi.fn(),
      popular: vi.fn(),
      discover: vi.fn(),
      getDetails: vi.fn(),
      getGenres: vi.fn(),
    });

    app.decorate('scheduler', {
      start: vi.fn(),
      stop: vi.fn(),
      trigger: vi.fn(),
      getState: vi.fn(),
      startOrchestration: vi.fn(),
      stopOrchestration: vi.fn(),
    });

    // inject authenticated user
    app.addHook('preHandler', async req => {
      req.user = user;
    });

    // Mock service methods
    vi.spyOn(interactionService, 'createInteraction').mockResolvedValue(
      createTestMedia({
        tmdbId: 123,
        type: 'movie',
        state: {
          record: {
            id: 1,
            status: 'requested',
            jellyfinId: null,
            tvdbId: null,
            arrId: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
      })
    );
    vi.spyOn(mediaService, 'updateMediaStatus').mockResolvedValue();
    vi.spyOn(interactionService, 'getUserInteractionsEnriched').mockResolvedValue([enrichedMedia]);
    vi.spyOn(interactionService, 'getRequestedMedia').mockResolvedValue([enrichedMedia]);

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
    expect(interactionService.createInteraction).toHaveBeenCalledWith(
      app.tmdb,
      app.radarr,
      app.sonarr,
      app.catalog,
      app.db,
      payload,
      user
    );
  });

  it('should return user interactions', async () => {
    const res = await app.inject({ method: 'GET', url: '/interactions' });

    expect(res.statusCode).toBe(200);
    expect(interactionService.getUserInteractionsEnriched).toHaveBeenCalled();
  });

  it('should get requested media', async () => {
    const res = await app.inject({ method: 'GET', url: '/interactions/requested' });

    expect(res.statusCode).toBe(200);
    expect(interactionService.getRequestedMedia).toHaveBeenCalledWith(app.tmdb, app.db, undefined);
  });

  it('should get requested media with status filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/interactions/requested',
      query: { status: 'requested,downloading' },
    });

    expect(res.statusCode).toBe(200);
    expect(interactionService.getRequestedMedia).toHaveBeenCalledWith(app.tmdb, app.db, [
      'requested',
      'downloading',
    ]);
  });
});
