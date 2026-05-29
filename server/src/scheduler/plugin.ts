import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { createSchedulers } from './registry.js';
import { createSchedulerService, type SchedulerService } from './service.js';

declare module 'fastify' {
  interface FastifyInstance {
    scheduler: SchedulerService;
  }
}

const schedulerPlugin: FastifyPluginAsync = async (fastify) => {
  // Create scheduler service with registry (pass service instances)
  const schedulers = createSchedulers(fastify);
  const schedulerService = createSchedulerService(fastify, schedulers);

  // Decorate Fastify instance
  fastify.decorate('scheduler', schedulerService);

  fastify.log.info({ name: 'scheduler' }, 'Scheduler plugin registered');

  // Cleanup on server close
  fastify.addHook('onClose', async () => {
    schedulerService.stopOrchestration();
    fastify.log.info({ name: 'scheduler' }, 'Scheduler service stopped');
  });
};

export default fp(schedulerPlugin, {
  name: 'scheduler',
  dependencies: ['arr', 'jellyfin', 'catalog'],
});
