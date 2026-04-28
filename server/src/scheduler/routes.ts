import { SchedulerParamsSchema } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';

export async function schedulerRoutes(fastify: FastifyInstance): Promise<void> {
  // Public: Get all scheduler states
  fastify.get('/schedulers', async () => fastify.scheduler.getState());

  // Public: Get specific scheduler state
  fastify.get('/schedulers/:name', async request =>
    fastify.scheduler.getState(SchedulerParamsSchema.parse(request.params))
  );
}

export async function adminSchedulerRoutes(fastify: FastifyInstance): Promise<void> {
  // Admin only: Manually trigger scheduler
  fastify.post('/schedulers/:name/trigger', { preHandler: fastify.requireAdmin }, async request => {
    await fastify.scheduler.trigger(SchedulerParamsSchema.parse(request.params));
  });

  // Admin only: Start/enable scheduler
  fastify.post('/schedulers/:name/start', { preHandler: fastify.requireAdmin }, async request => {
    fastify.scheduler.start(SchedulerParamsSchema.parse(request.params));
  });

  // Admin only: Stop/disable scheduler
  fastify.post('/schedulers/:name/stop', { preHandler: fastify.requireAdmin }, async request => {
    fastify.scheduler.stop(SchedulerParamsSchema.parse(request.params));
  });
}
