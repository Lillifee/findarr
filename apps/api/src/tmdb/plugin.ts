import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

import { createTMDBService, type TMDBService } from './service.js';

// Extend Fastify instance with tmdb service
declare module 'fastify' {
  interface FastifyInstance {
    tmdb: TMDBService;
  }
}

type TMDBPluginOptions = FastifyPluginOptions;

const tmdbPlugin: FastifyPluginAsync<TMDBPluginOptions> = async (fastify) => {
  fastify.decorate('tmdb', await createTMDBService(fastify));
  fastify.appLog.scope('tmdb').info('TMDB plugin registered');
};

export default fp(tmdbPlugin, {
  name: 'tmdb',
  dependencies: ['database', 'logger', 'settings'],
});
