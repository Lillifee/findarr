import {
  SearchQuerySchema,
  DiscoverQuerySchema,
  DetailsQuerySchema,
  GenresQuerySchema,
} from '@findarr/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function mediaRoutes(fastify: FastifyInstance) {
  // Search endpoint: GET /search?query=batman&type=both
  fastify.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queryParams = SearchQuerySchema.parse(request.query);
      const results = await fastify.tmdb.search(queryParams);
      return results;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to search media' });
    }
  });

  // Discover endpoint: GET /discover?type=both&sort_by=popularity.desc
  fastify.get('/discover', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queryParams = DiscoverQuerySchema.parse(request.query);
      const results = await fastify.tmdb.discover(queryParams);
      return results;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to discover media' });
    }
  });

  // Details endpoint: GET /details?id=123&type=movie&language=en-US
  fastify.get('/details', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queryParams = DetailsQuerySchema.parse(request.query);
      const result = await fastify.tmdb.getDetails(queryParams);
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get media details' });
    }
  });

  // Videos endpoint: GET /videos?id=123&type=movie&language=en-US
  fastify.get('/videos', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queryParams = DetailsQuerySchema.parse(request.query);
      const result = await fastify.tmdb.getVideos(queryParams);
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get media videos' });
    }
  });

  // Genres endpoint: GET /genres?type=movie
  fastify.get('/genres', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queryParams = GenresQuerySchema.parse(request.query);
      const result = await fastify.tmdb.getGenres(queryParams);
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get genres' });
    }
  });
}
