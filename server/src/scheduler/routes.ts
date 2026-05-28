import { SchedulerParamsSchema } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';

export async function schedulerRoutes(fastify: FastifyInstance): Promise<void> {
  // Public: Get all scheduler states
  fastify.get('/schedulers', async () => fastify.scheduler.getState());
}

export async function adminSchedulerRoutes(
  fastify: FastifyInstance
): Promise<void> {
  fastify.addHook('preHandler', fastify.requireAdmin);

  // Admin only: Manually trigger scheduler
  fastify.post('/schedulers/:name/trigger', async request => {
    await fastify.scheduler.trigger(
      SchedulerParamsSchema.parse(request.params)
    );
  });

  // Admin only: Start/enable scheduler
  fastify.post('/schedulers/:name/start', async request => {
    fastify.scheduler.start(SchedulerParamsSchema.parse(request.params));
  });

  // Admin only: Stop/disable scheduler
  fastify.post('/schedulers/:name/stop', async request => {
    fastify.scheduler.stop(SchedulerParamsSchema.parse(request.params));
  });
}
