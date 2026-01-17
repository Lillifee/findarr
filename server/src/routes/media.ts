import {
  MediaQuerySchema,
  MediaType,
  MovieIdParamsSchema,
  SearchQuerySchema,
  TVIdParamsSchema,
} from '@findarr/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function createMediaSearchRoute(fastify: FastifyInstance, mediaType: MediaType) {
  const serviceMethod = mediaType === 'movie' ? 'searchMovies' : 'searchTV';

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queryParams = SearchQuerySchema.parse(request.query);
      const results = await fastify.tmdb[serviceMethod](
        queryParams.query,
        queryParams.page,
        queryParams.include_adult,
        queryParams.language
      );
      return results;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to search media' });
    }
  };
}

export async function createMediaDetailsRoute(fastify: FastifyInstance, mediaType: MediaType) {
  const schema = mediaType === 'movie' ? MovieIdParamsSchema : TVIdParamsSchema;
  const serviceMethod = mediaType === 'movie' ? 'getMovieDetails' : 'getTVDetails';

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = schema.parse(request.params);
      const query = MediaQuerySchema.parse(request.query);
      const language = query.language || 'en-US';
      const result = await fastify.tmdb[serviceMethod](params.id, language);
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get media details' });
    }
  };
}
