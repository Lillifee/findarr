import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { getTmdbSettingsFull } from '../integration/repository.js';
import { createTMDBClient } from './client.js';
import { createTMDBService, type TMDBService } from './service.js';

// Extend Fastify instance with tmdb service
declare module 'fastify' {
  interface FastifyInstance {
    tmdb: TMDBService;
  }
}

type TMDBPluginOptions = FastifyPluginOptions;

const tmdbPlugin: FastifyPluginAsync<TMDBPluginOptions> = async fastify => {
  const tmdbSettings = await getTmdbSettingsFull(fastify.db);

  // Create TMDB client and service
  const tmdbClient = createTMDBClient();
  const tmdbService = createTMDBService(tmdbClient);

  await tmdbService.configure(tmdbSettings.tmdbAccessToken).catch(error => {
    fastify.log.warn(
      { name: 'tmdb', err: error },
      'Failed to initialize TMDB client with saved token'
    );
  });

  // Decorate fastify instance with TMDB service
  fastify.decorate('tmdb', tmdbService);
  fastify.log.info({ name: 'tmdb' }, 'TMDB plugin registered');
};

export default fp(tmdbPlugin, {
  name: 'tmdb',
  dependencies: ['database'],
});
