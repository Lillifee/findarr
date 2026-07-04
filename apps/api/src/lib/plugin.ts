import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { libConfig } from './config.js';
import { createLibService, type LibService } from './service.js';

declare module 'fastify' {
  interface FastifyInstance {
    jellyfin: LibService;
    plex: LibService;
  }
}

const libPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('jellyfin', await createLibService(libConfig.jellyfin, fastify));
  fastify.decorate('plex', await createLibService(libConfig.plex, fastify));
  fastify.appLog.scope('lib').info('Lib plugin registered (Jellyfin + Plex)');
};

export default fp(libPlugin, { name: 'lib', dependencies: ['database', 'logger'] });
