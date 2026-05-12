import { CreateInteractionSchema, InteractionsQuerySchema } from '@findarr/shared';
import type { FastifyPluginAsync } from 'fastify';
import { protectedRoute } from '../utils/routes.js';
import {
  createInteraction,
  getUserActivityAttentionEnriched,
  getUserInteractionsEnriched,
} from './service.js';

const interactionRoutes: FastifyPluginAsync = async fastify => {
  // All interaction routes require authentication
  fastify.addHook('preHandler', fastify.requireAuth);

  // Create or toggle a media interaction (like/dislike)
  fastify.post('/', request =>
    createInteraction(
      fastify.tmdb,
      fastify.radarr,
      fastify.sonarr,
      fastify.catalog,
      fastify.db,
      CreateInteractionSchema.parse(request.body),
      request.user
    )
  );

  // Get user's own voted media (both likes and dislikes) - enriched with TMDB data
  // Supports pagination via query parameter
  fastify.get(
    '/',
    protectedRoute(request =>
      getUserInteractionsEnriched(
        fastify.tmdb,
        fastify.db,
        request.user.id,
        InteractionsQuerySchema.parse(request.query)
      )
    )
  );

  fastify.get(
    '/attention',
    protectedRoute(request =>
      getUserActivityAttentionEnriched(
        fastify.tmdb,
        fastify.db,
        request.user,
        InteractionsQuerySchema.parse(request.query)
      )
    )
  );
};

export { interactionRoutes };
