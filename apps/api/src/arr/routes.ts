import { ArrLinkQuerySchema, isDefined } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';

export function arrRoutes(fastify: FastifyInstance) {
  // Protect ARR routes - require authentication
  fastify.addHook('preHandler', fastify.requireAuth);

  // Radarr link endpoint: GET /radarr-link?mediaId=123
  fastify.get('/radarr-link', async (request, reply) => {
    const query = ArrLinkQuerySchema.parse(request.query);
    const url = await fastify.radarr.resolveMediaUrl(query.mediaId);

    if (!isDefined(url)) {
      return reply.code(404).send({ error: 'Radarr link not available' });
    }

    return reply.redirect(url);
  });

  // Sonarr link endpoint: GET /sonarr-link?mediaId=123
  fastify.get('/sonarr-link', async (request, reply) => {
    const query = ArrLinkQuerySchema.parse(request.query);
    const url = await fastify.sonarr.resolveMediaUrl(query.mediaId);

    if (!isDefined(url)) {
      return reply.code(404).send({ error: 'Sonarr link not available' });
    }

    return reply.redirect(url);
  });
}
