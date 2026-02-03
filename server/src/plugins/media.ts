import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import type { ServerEnv } from '@findarr/shared';
import { createTMDBClient, createTMDBService } from '../tmdb';
import { createMediaService, type MediaService } from '../services';

// Extend Fastify instance with media service
declare module 'fastify' {
  interface FastifyInstance {
    media: MediaService;
  }
}

interface MediaPluginOptions extends FastifyPluginOptions {
  env: ServerEnv;
}

async function mediaPlugin(fastify: FastifyInstance, options: MediaPluginOptions) {
  const { env } = options;

  // Create TMDB client and service
  const tmdbClient = createTMDBClient(env.TMDB_ACCESS_TOKEN, env.TMDB_BASE_URL);
  const tmdbService = createTMDBService(tmdbClient);
  const mediaService = createMediaService(tmdbService);

  // Initialize all data sources
  await mediaService.initialize();

  // Decorate fastify instance
  fastify.decorate('media', mediaService);
}

export default fp(mediaPlugin, { name: 'media' });
export { mediaPlugin };
