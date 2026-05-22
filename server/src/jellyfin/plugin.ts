import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createJellyfinService, type JellyfinService } from './service.js';

// Extend Fastify instance with Jellyfin service
declare module 'fastify' {
  interface FastifyInstance {
    jellyfin: JellyfinService;
  }
}

const jellyfinPlugin: FastifyPluginAsync = async fastify => {
  fastify.decorate('jellyfin', await createJellyfinService(fastify));
  fastify.log.info({ name: 'jellyfin' }, 'Jellyfin plugin registered');
};

export default fp(jellyfinPlugin, {
  name: 'jellyfin',
  dependencies: ['database'],
});
