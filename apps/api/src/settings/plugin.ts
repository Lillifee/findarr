import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { createSettingsService, type SettingsService } from './service.js';

declare module 'fastify' {
  interface FastifyInstance {
    settings: SettingsService;
  }
}

const settingsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('settings', createSettingsService(fastify.db));
  fastify.appLog.scope('settings').info('App settings plugin registered');
};

export default fp(settingsPlugin, {
  name: 'settings',
  dependencies: ['database', 'logger'],
});
