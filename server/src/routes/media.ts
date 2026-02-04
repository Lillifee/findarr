import {
  SearchQuerySchema,
  DiscoverQuerySchema,
  PopularQuerySchema,
  DetailsQuerySchema,
  GenresQuerySchema,
} from '@findarr/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError, type z } from 'zod';

export async function mediaRoutes(x: FastifyInstance) {
  // Search endpoint: GET /search?query=batman&type=both
  registerRoute(x, '/search', SearchQuerySchema, (x, q) => x.media.search(q));

  // Popular endpoint: GET /popular?page=1&type=both (cached with custom scoring)
  registerRoute(x, '/popular', PopularQuerySchema, (x, q) => x.media.popular(q));

  // Discover endpoint: GET /discover?type=both&recent_days=30 (direct TMDB passthrough)
  registerRoute(x, '/discover', DiscoverQuerySchema, (x, q) => x.media.discover(q));

  // Details endpoint: GET /details?id=123&type=movie&language=en-US
  registerRoute(x, '/details', DetailsQuerySchema, (x, q) => x.media.getDetails(q));

  // Genres endpoint: GET /genres?type=movie
  registerRoute(x, '/genres', GenresQuerySchema, (x, q) => x.media.getGenres(q));
}

/**
 * Helper to create and register a route handler with automatic query parsing and error handling
 */
function registerRoute<TSchema extends z.ZodTypeAny, TResult>(
  fastify: FastifyInstance,
  route: string,
  schema: TSchema,
  handler: (server: FastifyInstance, params: z.infer<TSchema>) => Promise<TResult>
) {
  const action = route.replace(/^\//, ''); // Remove leading /
  const errorMessage = `Failed to ${action}`;

  fastify.get(route, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = schema.parse(request.query);
      return await handler(fastify, params);
    } catch (error) {
      // Distinguish validation errors from server errors
      if (error instanceof ZodError) {
        request.log.warn({ error }, 'Validation error');
        return reply.status(400).send({
          error: 'Invalid request parameters',
          details: error.issues,
        });
      }

      request.log.error(error);
      return reply.status(500).send({ error: errorMessage });
    }
  });
}
