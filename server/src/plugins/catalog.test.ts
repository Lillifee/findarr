import Fastify, { type FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as catalogServiceModule from '../services/catalog.js';
import type { TMDBService } from '../tmdb/service.js';
import { mockDb } from '../utils/testHelper.js';
import catalogPlugin from './catalog.js';

const fakeDbPlugin = fp(
  async x => {
    x.decorate('db', mockDb);
  },
  { name: 'database' }
);

const mockTMDBService: TMDBService = {
  loadGenres: vi.fn().mockResolvedValue(undefined),
  search: vi.fn(),
  fetchDiscover: vi.fn(),
  fetchTrending: vi.fn(),
  getGenres: vi.fn().mockReturnValue([]),
  getDetails: vi.fn(),
};

const fakeTMDBPlugin = fp(
  async x => {
    x.decorate('tmdb', mockTMDBService);
  },
  { name: 'tmdb' }
);

describe('catalogPlugin', () => {
  let app: FastifyInstance;

  const mockInitialize = vi.fn();
  const mockCatalogService = {
    initialize: mockInitialize,
    search: vi.fn(),
    popular: vi.fn(),
    discover: vi.fn(),
    getDetails: vi.fn(),
    getGenres: vi.fn(),
  };

  beforeEach(async () => {
    app = Fastify();
    // Register fake database and tmdb plugins to satisfy dependencies
    await app.register(fakeDbPlugin);
    await app.register(fakeTMDBPlugin);

    vi.spyOn(catalogServiceModule, 'createCatalogService').mockReturnValue(
      mockCatalogService as unknown as catalogServiceModule.CatalogService
    );

    mockInitialize.mockResolvedValue(42);
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('should create catalog service using db and tmdb services and initialize it', async () => {
    await app.register(catalogPlugin);

    await app.ready();

    expect(catalogServiceModule.createCatalogService).toHaveBeenCalledWith(mockDb, mockTMDBService);
    expect(app.catalog).toBe(mockCatalogService);
    expect(mockInitialize).toHaveBeenCalled();
  });
});
