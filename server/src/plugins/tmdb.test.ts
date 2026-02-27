import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as tmdbClientModule from '../tmdb/client.js';
import * as tmdbServiceModule from '../tmdb/service.js';
import tmdbPlugin from './tmdb.js';

describe('tmdbPlugin', () => {
  let app: FastifyInstance;

  const mockLoadGenres = vi.fn();
  const mockTMDBClient = {};
  const mockTMDBService = {
    loadGenres: mockLoadGenres,
  };

  beforeEach(async () => {
    app = Fastify();

    vi.spyOn(tmdbClientModule, 'createTMDBClient').mockReturnValue(
      mockTMDBClient as unknown as tmdbClientModule.TMDBClient
    );

    vi.spyOn(tmdbServiceModule, 'createTMDBService').mockReturnValue(
      mockTMDBService as unknown as tmdbServiceModule.TMDBService
    );

    mockLoadGenres.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('should create TMDB client and service and initialize genres', async () => {
    await app.register(tmdbPlugin, {
      tmdbAccessToken: 'token',
      tmdbBaseUrl: 'http://example.com',
    });

    await app.ready();

    expect(tmdbClientModule.createTMDBClient).toHaveBeenCalledWith('token', 'http://example.com');
    expect(tmdbServiceModule.createTMDBService).toHaveBeenCalledWith(mockTMDBClient);
    expect(app.tmdb).toBe(mockTMDBService);
    expect(mockLoadGenres).toHaveBeenCalled();
  });
});
