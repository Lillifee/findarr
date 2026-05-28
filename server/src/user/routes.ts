import { UserSettingsQuerySchema } from '@findarr/shared';
import type { FastifyPluginAsync } from 'fastify';
import { protectedRoute } from '../utils/routes.js';
import { getUserSettings, saveUserSettings } from './service.js';

export const settingsRoutes: FastifyPluginAsync = async fastify => {
  fastify.addHook('preHandler', fastify.requireAuth);

  fastify.get(
    '/',
    protectedRoute(request => getUserSettings(fastify.db, request.user.id))
  );

  fastify.put(
    '/',
    protectedRoute(request =>
      saveUserSettings(
        fastify.db,
        request.user.id,
        UserSettingsQuerySchema.parse(request.body)
      )
    )
  );
};
