import {
  LogLevelBodySchema,
  LogLevelSchema,
  type LogLevelResponse,
  type LogsResponse,
} from '@findarr/shared/logs';
import type { FastifyInstance } from 'fastify';

export const adminLogsRoutes = (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', fastify.requireAdmin);

  fastify.get('/logs', (): LogsResponse => ({ entries: fastify.logs.getLogs() }));

  fastify.get(
    '/logs/level',
    (): LogLevelResponse => ({ level: LogLevelSchema.catch('info').parse(fastify.log.level) }),
  );

  fastify.put('/logs/level', (request): LogLevelResponse => {
    const { level } = LogLevelBodySchema.parse(request.body);
    fastify.log.level = level;
    return { level };
  });
};
