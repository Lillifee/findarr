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
  const context = { db: fastify.db, log: fastify.log, scheduler: fastify.scheduler };

  fastify.decorate('radarr', await createArrService(arrConfig.radarr, context));
  fastify.decorate('sonarr', await createArrService(arrConfig.sonarr, context));
  fastify.log.info({ name: 'arr' }, 'Arr plugin registered (Radarr + Sonarr)');
};

export default fp(arrPlugin, {
  name: 'arr',
  dependencies: ['database'],
});
