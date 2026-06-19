import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { createPlexService, type PlexService } from './service.js';

// Extend Fastify instance with Plex service
declare module 'fastify' {
  interface FastifyInstance {
    plex: PlexService;
  }
}

const plexPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('plex', await createPlexService(fastify));
  fastify.log.info({ name: 'plex' }, 'Plex plugin registered');
};

export default fp(plexPlugin, {
  name: 'plex',
  dependencies: ['database'],
});
