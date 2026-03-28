import { CreateInteractionSchema } from '@findarr/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createInteraction, getUserInteractionsEnriched, getRequestedMedia } from './service.js';

const RequestedMediaQuerySchema = z.object({
  status: z
    .string()
    .optional()
    .transform(val => (val ? val.split(',') : undefined))
    .pipe(
      z.array(z.enum(['pending', 'requested', 'downloading', 'downloaded', 'available'])).optional()
    ),
});

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
  fastify.get('/', request =>
    getUserInteractionsEnriched(fastify.tmdb, fastify.db, request.user?.id)
  );

  // Get requested media - enriched with TMDB data
  fastify.get('/requested', async request => {
    const { status } = RequestedMediaQuerySchema.parse(request.query);
    return getRequestedMedia(fastify.tmdb, fastify.db, status);
  });
};

export { interactionRoutes };
