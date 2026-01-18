import { MediaQuerySchema, MediaParamsSchema, SearchQuerySchema } from '@findarr/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function mediaRoutes(fastify: FastifyInstance) {
  // Search endpoint: GET /search?query=batman&type=both
  fastify.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queryParams = SearchQuerySchema.parse(request.query);
      const results = await fastify.tmdb.searchMedia(
        queryParams.query,
        queryParams.type,
        queryParams.page,
        queryParams.include_adult,
        queryParams.language
      );
      return results;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to search media' });
    }
  });

  // Details endpoint: GET /:type/:id where type is 'movie' or 'tv'
  fastify.get('/:type/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = MediaParamsSchema.parse(request.params);
      const query = MediaQuerySchema.parse(request.query);
      const language = query.language || 'en-US';

      const result = await fastify.tmdb.getMediaDetails(params.id, params.type, language);
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get media details' });
    }
  });
}
