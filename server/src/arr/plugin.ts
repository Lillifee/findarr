import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { arrConfig } from './config.js';
import { createArrService, type ArrService } from './service.js';

declare module 'fastify' {
  interface FastifyInstance {
    radarr: ArrService<typeof arrConfig.radarr>;
    sonarr: ArrService<typeof arrConfig.sonarr>;
  }
}

const arrPlugin: FastifyPluginAsync = async fastify => {
  fastify.decorate('radarr', createArrService(fastify.db, arrConfig.radarr, fastify));
  fastify.decorate('sonarr', createArrService(fastify.db, arrConfig.sonarr, fastify));
  fastify.log.info('Arr plugin registered (Radarr + Sonarr)');
};

export default fp(arrPlugin, {
  name: 'arr',
  dependencies: ['database'],
});
