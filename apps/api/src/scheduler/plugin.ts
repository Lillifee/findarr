import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { createSchedulers } from './registry.js';
import { createSchedulerService, type SchedulerService } from './service.js';

declare module 'fastify' {
  interface FastifyInstance {
    scheduler: SchedulerService;
  }
}

const schedulerPlugin = (fastify: FastifyInstance) => {
  // Create scheduler service with registry (pass service instances)
  const schedulers = createSchedulers(fastify);
  const schedulerService = createSchedulerService(fastify, schedulers);

  // Decorate Fastify instance
  fastify.decorate('scheduler', schedulerService);

  const log = fastify.appLog.scope('scheduler');
  log.info('Scheduler plugin registered');

  // Cleanup on server close
  fastify.addHook('onClose', () => {
    schedulerService.stopOrchestration();
    log.info('Scheduler service stopped');
  });
};

export default fp(schedulerPlugin, {
  name: 'scheduler',
  dependencies: ['arr', 'lib', 'catalog', 'logger'],
});
