import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { createMediaService, type MediaService } from '../services/media.js';
import { createTMDBClient } from '../tmdb/client.js';
import { createTMDBService } from '../tmdb/service.js';

// Extend Fastify instance with media service
declare module 'fastify' {
  interface FastifyInstance {
    media: MediaService;
  }
}

interface MediaPluginOptions extends FastifyPluginOptions {
  tmdbAccessToken: string;
  tmdbBaseUrl: string;
}

const mediaPlugin: FastifyPluginAsync<MediaPluginOptions> = async (fastify, options) => {
  const { tmdbAccessToken, tmdbBaseUrl } = options;

  // Create TMDB client and service
  const tmdbClient = createTMDBClient(tmdbAccessToken, tmdbBaseUrl);
  const tmdbService = createTMDBService(tmdbClient);
  const mediaService = createMediaService(tmdbService);

  // Initialize all data sources
  await mediaService.initialize();

  // Decorate fastify instance
  fastify.decorate('media', mediaService);
};

export default fp(mediaPlugin, {
  name: 'media',
});
