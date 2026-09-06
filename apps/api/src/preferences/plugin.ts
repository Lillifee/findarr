import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { createPreferencesService, type PreferencesService } from './service.js';

declare module 'fastify' {
  interface FastifyInstance {
    preferences: PreferencesService;
  }
}

const preferencesPlugin = (fastify: FastifyInstance) => {
  fastify.decorate('preferences', createPreferencesService(fastify));
};

export default fp(preferencesPlugin, {
  name: 'preferences',
  dependencies: ['database', 'tmdb', 'user'],
});
