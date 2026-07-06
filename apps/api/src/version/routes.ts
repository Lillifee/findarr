import type { VersionInfo } from '@findarr/shared/version';
import type { FastifyInstance } from 'fastify';

export const versionRoutes = (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', fastify.requireAdmin);

  fastify.get(
    '/version',
    async (): Promise<VersionInfo> => fastify.versionService.getVersionInfo(),
  );
};
