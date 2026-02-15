import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { type MediaService } from '../services/media.js';
import { createUser } from '../utils/testHelper.js';
import { mediaRoutes } from './media.js';

describe('mediaRoutes', () => {
  let app: FastifyInstance;
  const user = createUser();

  const mockMedia: MediaService = {
    search: vi.fn().mockResolvedValue({ results: [], total_pages: 1 }),
    popular: vi.fn().mockResolvedValue({ results: [], total_pages: 1 }),
    discover: vi.fn().mockResolvedValue({ results: [], total_pages: 1 }),
    getDetails: vi.fn().mockResolvedValue({}),
    getGenres: vi.fn().mockResolvedValue([]),
    initialize: vi.fn(),
  } as unknown as MediaService;

  beforeEach(async () => {
    app = Fastify();

    // decorate media and auth hook
    app.decorate('media', mockMedia);
    app.decorate('requireAuth', async () => {});

    // inject authenticated user
    app.addHook('preHandler', async req => {
      req.user = user;
    });

    await mediaRoutes(app);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('should call media.search', async () => {
    const query = { query: 'batman', type: 'both', page: '1' };
    const res = await app.inject({ method: 'GET', url: '/search', query });

    expect(res.statusCode).toBe(200);
    expect(mockMedia.search).toHaveBeenCalledWith({ ...query, page: 1 });
  });

  it('should call media.popular', async () => {
    const query = {
      page: '1',
      type: 'both',
      regionGroups: ['western', 'asian'],
      withGenres: ['Fantasy', 'Music'],
    };
    const res = await app.inject({ method: 'GET', url: '/popular', query });

    expect(res.statusCode).toBe(200);
    expect(mockMedia.popular).toHaveBeenCalledWith({
      ...query,
      page: 1,
      regionGroups: ['western', 'asian'],
      withGenres: ['Fantasy', 'Music'],
    });
  });

  it('should call media.discover', async () => {
    const query = { type: 'both', recentDays: '24' };
    const res = await app.inject({ method: 'GET', url: '/discover', query });

    expect(res.statusCode).toBe(200);
    expect(mockMedia.discover).toHaveBeenCalledWith({
      ...query,
      recentDays: 24,
      regionGroups: [],
      withGenres: [],
    });
  });

  it('should call media.getDetails', async () => {
    const query = { id: '123', type: 'movie', language: 'en-US' };
    const res = await app.inject({ method: 'GET', url: '/details', query });

    expect(res.statusCode).toBe(200);
    expect(mockMedia.getDetails).toHaveBeenCalledWith({ ...query, id: 123 });
  });

  it('should call media.getGenres', async () => {
    const query = {};
    const res = await app.inject({ method: 'GET', url: '/genres', query });

    expect(res.statusCode).toBe(200);
    expect(mockMedia.getGenres).toHaveBeenCalledWith(query);
  });
});
