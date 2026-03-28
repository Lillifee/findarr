import type { FastifyInstance } from 'fastify';
import { isValidSchedulerName } from './registry.js';

/**
 * Scheduler API routes
 * GET /api/schedulers - Public (view all scheduler states)
 * GET /api/schedulers/:name - Public (view specific scheduler state)
 * POST /api/admin/schedulers/:name/trigger - Admin only (manual trigger)
 * POST /api/admin/schedulers/:name/start - Admin only (enable scheduler)
 * POST /api/admin/schedulers/:name/stop - Admin only (disable scheduler)
 */

interface SchedulerParams {
  name: string;
}

export async function schedulerRoutes(fastify: FastifyInstance): Promise<void> {
  // Public: Get all scheduler states
  fastify.get('/schedulers', async () => fastify.scheduler.getState());

  // Public: Get specific scheduler state
  fastify.get<{ Params: SchedulerParams }>('/schedulers/:name', async request => {
    const { name } = request.params;

    if (!isValidSchedulerName(name)) {
      throw new Error(`Invalid scheduler name: ${name}`);
    }

    return fastify.scheduler.getState(name);
  });
}

export async function adminSchedulerRoutes(fastify: FastifyInstance): Promise<void> {
  // Admin only: Manually trigger scheduler
  fastify.post<{ Params: SchedulerParams }>(
    '/schedulers/:name/trigger',
    {
      preHandler: fastify.requireAdmin,
    },
    async request => {
      const { name } = request.params;

      if (!isValidSchedulerName(name)) {
        throw new Error(`Invalid scheduler name: ${name}`);
      }

      await fastify.scheduler.trigger(name);
      return { success: true, message: `Scheduler '${name}' triggered` };
    }
  );

  // Admin only: Start/enable scheduler
  fastify.post<{ Params: SchedulerParams }>(
    '/schedulers/:name/start',
    {
      preHandler: fastify.requireAdmin,
    },
    async request => {
      const { name } = request.params;

      if (!isValidSchedulerName(name)) {
        throw new Error(`Invalid scheduler name: ${name}`);
      }

      fastify.scheduler.start(name);
      return { success: true, message: `Scheduler '${name}' started` };
    }
  );

  // Admin only: Stop/disable scheduler
  fastify.post<{ Params: SchedulerParams }>(
    '/schedulers/:name/stop',
    {
      preHandler: fastify.requireAdmin,
    },
    async request => {
      const { name } = request.params;

      if (!isValidSchedulerName(name)) {
        throw new Error(`Invalid scheduler name: ${name}`);
      }

      fastify.scheduler.stop(name);
      return { success: true, message: `Scheduler '${name}' stopped` };
    }
  );
}
