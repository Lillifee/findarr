import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as mediaServiceModule from '../services/media.js';
import * as tmdbClientModule from '../tmdb/client.js';
import * as tmdbServiceModule from '../tmdb/service.js';
import mediaPlugin from './media.js';

describe('mediaPlugin', () => {
  let app: FastifyInstance;

  const mockInitialize = vi.fn();
  const mockMediaService = {
    initialize: mockInitialize,
  };

  const mockTMDBClient = {};
  const mockTMDBService = {};

  beforeEach(() => {
    app = Fastify();

    vi.spyOn(tmdbClientModule, 'createTMDBClient').mockReturnValue(
      mockTMDBClient as unknown as tmdbClientModule.TMDBClient
    );

    vi.spyOn(tmdbServiceModule, 'createTMDBService').mockReturnValue(
      mockTMDBService as unknown as tmdbServiceModule.TMDBService
    );

    vi.spyOn(mediaServiceModule, 'createMediaService').mockReturnValue(
      mockMediaService as unknown as mediaServiceModule.MediaService
    );

    mockInitialize.mockResolvedValue(42);
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('should create TMDB client and service and initialize media service', async () => {
    await app.register(mediaPlugin, {
      tmdbAccessToken: 'token',
      tmdbBaseUrl: 'http://example.com',
    });

    await app.ready();

    expect(tmdbClientModule.createTMDBClient).toHaveBeenCalledWith('token', 'http://example.com');
    expect(app.media).toBe(mockMediaService);
    expect(mockInitialize).toHaveBeenCalled();
  });
});
