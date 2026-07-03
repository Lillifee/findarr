import { CreateInteractionSchema, InteractionsQuerySchema } from '@findarr/shared/interaction';
import type { FastifyInstance } from 'fastify';

import { protectedRoute } from '../utils/routes.js';

export const interactionRoutes = (fastify: FastifyInstance) => {
  // All interaction routes require authentication
  fastify.addHook('preHandler', fastify.requireAuth);

  // Create or toggle a media interaction (like/dislike)
  fastify.post('/', async (request) =>
    fastify.interaction.createInteraction(
      CreateInteractionSchema.parse(request.body),
      request.user,
    ),
  );

  // Get user's own voted media (both likes and dislikes) - enriched with TMDB data
  // Supports pagination via query parameter
  fastify.get(
    '/',
    protectedRoute(async (request) =>
      fastify.interaction.getUserInteractionsEnriched(
        request.user.id,
        InteractionsQuerySchema.parse(request.query),
      ),
    ),
  );

  fastify.get(
    '/attention',
    protectedRoute(async (request) =>
      fastify.interaction.getUserActivityAttentionEnriched(
        request.user,
        InteractionsQuerySchema.parse(request.query),
      ),
    ),
  );
};
