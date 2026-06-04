import { CreateInteractionSchema, InteractionsQuerySchema } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';

import { protectedRoute } from '../utils/routes.js';
import {
  createInteraction,
  getUserActivityAttentionEnriched,
  getUserInteractionsEnriched,
} from './service.js';

export const interactionRoutes = (fastify: FastifyInstance) => {
  // All interaction routes require authentication
  fastify.addHook('preHandler', fastify.requireAuth);

  // Create or toggle a media interaction (like/dislike)
  fastify.post('/', async (request) =>
    createInteraction(
      fastify.tmdb,
      fastify.radarr,
      fastify.sonarr,
      fastify.catalog,
      fastify.db,
      CreateInteractionSchema.parse(request.body),
      request.user,
    ),
  );

  // Get user's own voted media (both likes and dislikes) - enriched with TMDB data
  // Supports pagination via query parameter
  fastify.get(
    '/',
    protectedRoute(async (request) =>
      getUserInteractionsEnriched(
        fastify.tmdb,
        fastify.db,
        request.user.id,
        InteractionsQuerySchema.parse(request.query),
      ),
    ),
  );

  fastify.get(
    '/attention',
    protectedRoute(async (request) =>
      getUserActivityAttentionEnriched(
        fastify.tmdb,
        fastify.db,
        request.user,
        InteractionsQuerySchema.parse(request.query),
      ),
    ),
  );
};
