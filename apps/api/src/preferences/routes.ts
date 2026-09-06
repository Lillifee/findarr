import type { FastifyInstance } from 'fastify';

import { protectedRoute } from '../utils/routes.js';

export const preferencesRoutes = (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', fastify.requireAuth);

  fastify.get(
    '/',
    protectedRoute(async (request) => fastify.preferences.listForUser(request.user.id)),
  );
};
