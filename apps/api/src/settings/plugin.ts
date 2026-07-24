import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { createAdministrationService, type AdministrationService } from './administration';

declare module 'fastify' {
  interface FastifyInstance {
    administration: AdministrationService;
  }
}

const administrationPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('administration', createAdministrationService(fastify.db));
  fastify.appLog.scope('administration').info('Administration settings plugin registered');
};

export default fp(administrationPlugin, {
  name: 'administration',
  dependencies: ['database', 'logger'],
});
