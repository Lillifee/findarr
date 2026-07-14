import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

import { createMediaService, type MediaService } from './service.js';

// Extend Fastify instance with the media enrichment service
declare module 'fastify' {
  interface FastifyInstance {
    media: MediaService;
  }
}

type MediaPluginOptions = FastifyPluginOptions;

const mediaPlugin: FastifyPluginAsync<MediaPluginOptions> = async (fastify) => {
  fastify.decorate('media', createMediaService(fastify));
  fastify.appLog.scope('media').info('Media plugin registered');
};

export default fp(mediaPlugin, {
  name: 'media',
  dependencies: ['database', 'tmdb', 'user'],
});
