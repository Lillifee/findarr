import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import type { ServerEnv } from '@findarr/shared';
import { createTMDBClient } from '../tmdb';
import { createMediaService, type MediaService } from '../services/media';

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

  // Create TMDB client
  const tmdbClient = createTMDBClient(env.TMDB_ACCESS_TOKEN, env.TMDB_BASE_URL);

  // Create media service
  const mediaService = createMediaService(tmdbClient);

  // Load genres at startup
  await mediaService.loadGenres();

  // Decorate fastify instance
  fastify.decorate('media', mediaService);
}

export default fp(mediaPlugin, { name: 'media' });
export { mediaPlugin };
