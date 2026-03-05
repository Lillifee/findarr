import { CreateInteractionSchema } from '@findarr/shared';
import type { FastifyPluginAsync } from 'fastify';
import {
  createInteraction,
  getUserInteractionsEnriched,
  getAllInteractionsEnriched,
} from '../services/interaction.js';

const interactionRoutes: FastifyPluginAsync = async fastify => {
  // All interaction routes require authentication
  fastify.addHook('preHandler', fastify.requireAuth);

  // Create or toggle a media interaction (like/dislike)
  fastify.post('/', request =>
    createInteraction(fastify.db, CreateInteractionSchema.parse(request.body), request.user)
  );

  // Get user's own voted media (both likes and dislikes) - enriched with TMDB data
  fastify.get('/', request =>
    getUserInteractionsEnriched(fastify.tmdb, fastify.db, request.user?.id)
  );
};

// Admin interaction routes
const adminInteractionRoutes: FastifyPluginAsync = async fastify => {
  fastify.addHook('preHandler', fastify.requireAdmin);

  // Get all media with interactions (admin only) - enriched with TMDB data
  fastify.get('/', () => getAllInteractionsEnriched(fastify.tmdb, fastify.db));
};

export { interactionRoutes, adminInteractionRoutes };
