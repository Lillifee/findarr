import { JellyfinLinkQuerySchema } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';

export async function jellyfinRoutes(fastify: FastifyInstance) {
  // Protect Jellyfin routes - require authentication
  fastify.addHook('preHandler', fastify.requireAuth);

  // Jellyfin link endpoint: GET /jellyfin-link?mediaId=123
  // Resolves full Jellyfin URL only when user clicks
  fastify.get('/jellyfin-link', async (request, reply) => {
    const query = JellyfinLinkQuerySchema.parse(request.query);
    const url = await fastify.jellyfin.resolveMediaUrl(query.mediaId);

    if (!url) {
      return reply.code(404).send({ error: 'Jellyfin link not available' });
    }

    return reply.redirect(url);
  });
}
