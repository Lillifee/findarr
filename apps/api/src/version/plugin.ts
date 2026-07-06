import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { createVersionService, type VersionService } from './service.js';

declare module 'fastify' {
  interface FastifyInstance {
    versionService: VersionService;
  }
}

const versionPlugin = (fastify: FastifyInstance) => {
  fastify.decorate('versionService', createVersionService(fastify.appLog));
};

export default fp(versionPlugin, {
  name: 'version',
  dependencies: ['logger'],
});
