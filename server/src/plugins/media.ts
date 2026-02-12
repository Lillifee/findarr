import type { ServerEnv } from '@findarr/shared';
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
  env: ServerEnv;
}

const mediaPlugin: FastifyPluginAsync<MediaPluginOptions> = async (fastify, options) => {
  const { env } = options;

  // Create TMDB client and service
  const tmdbClient = createTMDBClient(env.TMDB_ACCESS_TOKEN, env.TMDB_BASE_URL);
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
