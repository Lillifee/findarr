import type { LogsResponse } from '@findarr/shared/logs';
import type { FastifyInstance } from 'fastify';

export const adminLogsRoutes = (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', fastify.requireAdmin);

  fastify.get('/logs', (): LogsResponse => ({ entries: fastify.logs.getLogs() }));
};
