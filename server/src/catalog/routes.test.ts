import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestUser } from '../utils/testHelper.js';
import { catalogRoutes } from './routes.js';
import { type CatalogService } from './service.js';

describe('catalogRoutes', () => {
  let app: FastifyInstance;
  const user = createTestUser();

  const mockCatalog: CatalogService = {
    search: vi.fn().mockResolvedValue({ results: [], totalPages: 1 }),
    popular: vi.fn().mockResolvedValue({ results: [], totalPages: 1 }),
    discover: vi.fn().mockResolvedValue({ results: [], totalPages: 1 }),
    getDetails: vi.fn().mockResolvedValue({}),
    getGenres: vi.fn().mockResolvedValue([]),
    initialize: vi.fn(),
  } as unknown as CatalogService;

  beforeEach(async () => {
    app = Fastify();

    // decorate catalog and auth hook
    app.decorate('catalog', mockCatalog);
    app.decorate('requireAuth', async () => {});

    // inject authenticated user
    app.addHook('preHandler', async req => {
      req.user = user;
    });

    await catalogRoutes(app);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('should call catalog.search', async () => {
    const query = { query: 'batman', type: 'both', page: '1' };
    const res = await app.inject({ method: 'GET', url: '/search', query });

    expect(res.statusCode).toBe(200);
    expect(mockCatalog.search).toHaveBeenCalledWith({ ...query, page: 1 }, user.id);
  });

  it('should call catalog.popular', async () => {
    const query = {
      page: '1',
      type: 'both',
      regionGroups: ['western', 'asian'],
      withGenres: ['Fantasy', 'Music'],
    };
    const res = await app.inject({ method: 'GET', url: '/popular', query });

    expect(res.statusCode).toBe(200);
    expect(mockCatalog.popular).toHaveBeenCalledWith(
      {
        ...query,
        page: 1,
        regionGroups: ['western', 'asian'],
        withGenres: ['Fantasy', 'Music'],
      },
      user.id
    );
  });

  it('should call catalog.discover', async () => {
    const query = { type: 'both', recentDays: '24' };
    const res = await app.inject({ method: 'GET', url: '/discover', query });

    expect(res.statusCode).toBe(200);
    expect(mockCatalog.discover).toHaveBeenCalledWith(
      {
        ...query,
        recentDays: 24,
        regionGroups: [],
        withGenres: [],
      },
      user.id
    );
  });

  it('should call catalog.getDetails', async () => {
    const query = { id: '123', type: 'movie', language: 'en-US' };
    const res = await app.inject({ method: 'GET', url: '/details', query });

    expect(res.statusCode).toBe(200);
    expect(mockCatalog.getDetails).toHaveBeenCalledWith({ ...query, id: 123 }, user.id);
  });

  it('should call catalog.getGenres', async () => {
    const query = {};
    const res = await app.inject({ method: 'GET', url: '/genres', query });

    expect(res.statusCode).toBe(200);
    expect(mockCatalog.getGenres).toHaveBeenCalledWith(query);
  });
});
