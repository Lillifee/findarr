import { UserSettingsQuerySchema } from '@findarr/shared/settings';
import type { FastifyInstance } from 'fastify';

import { protectedRoute } from '../utils/routes.js';

export const settingsRoutes = (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', fastify.requireAuth);

  fastify.get(
    '/',
    protectedRoute(async (request) => fastify.user.getSettings(request.user.id)),
  );

  fastify.put(
    '/',
    protectedRoute(async (request) =>
      fastify.user.saveSettings(request.user.id, UserSettingsQuerySchema.parse(request.body)),
    ),
  );
};
