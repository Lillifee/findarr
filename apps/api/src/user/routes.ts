import { UserSettingsQuerySchema } from '@findarr/shared/settings';
import type { FastifyInstance } from 'fastify';

import { protectedRoute } from '../utils/routes.js';
import { getUserSettings, saveUserSettings } from './service.js';

export const settingsRoutes = (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', fastify.requireAuth);

  fastify.get(
    '/',
    protectedRoute(async (request) => getUserSettings(fastify.db, request.user.id)),
  );

  fastify.put(
    '/',
    protectedRoute(async (request) =>
      saveUserSettings(fastify.db, request.user.id, UserSettingsQuerySchema.parse(request.body)),
    ),
  );
};
