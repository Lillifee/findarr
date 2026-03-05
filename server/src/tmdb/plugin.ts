import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { createTMDBClient } from './client.js';
import { createTMDBService, type TMDBService } from './service.js';

// Extend Fastify instance with tmdb service
declare module 'fastify' {
  interface FastifyInstance {
    tmdb: TMDBService;
  }
}

interface TMDBPluginOptions extends FastifyPluginOptions {
  tmdbAccessToken: string;
  tmdbBaseUrl: string;
}

const tmdbPlugin: FastifyPluginAsync<TMDBPluginOptions> = async (fastify, options) => {
  const { tmdbAccessToken, tmdbBaseUrl } = options;

  // Create TMDB client and service
  const tmdbClient = createTMDBClient(tmdbAccessToken, tmdbBaseUrl);
  const tmdbService = createTMDBService(tmdbClient);

  // Initialize TMDB service (load genres)
  await tmdbService.loadGenres();

  // Decorate fastify instance with TMDB service
  fastify.decorate('tmdb', tmdbService);
  fastify.log.info('TMDB plugin registered');
};

export default fp(tmdbPlugin, {
  name: 'tmdb',
});
