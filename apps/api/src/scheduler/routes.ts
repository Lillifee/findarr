import { SchedulerParamsSchema } from '@findarr/shared/scheduler';
import type { FastifyInstance } from 'fastify';

export const schedulerRoutes = (fastify: FastifyInstance) => {
  // Public: Get all scheduler states
  fastify.get('/schedulers', () => fastify.scheduler.getState());
};

export const adminSchedulerRoutes = (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', fastify.requireAdmin);

  // Admin only: Manually trigger scheduler
  fastify.post('/schedulers/:name/trigger', async (request) => {
    await fastify.scheduler.trigger(SchedulerParamsSchema.parse(request.params));
  });

  // Admin only: Start/enable scheduler
  fastify.post('/schedulers/:name/start', (request) => {
    fastify.scheduler.start(SchedulerParamsSchema.parse(request.params));
  });

  // Admin only: Stop/disable scheduler
  fastify.post('/schedulers/:name/stop', (request) => {
    fastify.scheduler.stop(SchedulerParamsSchema.parse(request.params));
  });
};
