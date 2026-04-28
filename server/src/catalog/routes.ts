import {
  SearchQuerySchema,
  PopularQuerySchema,
  DetailsQuerySchema,
  GenresQuerySchema,
  DiscoverQuerySchema,
} from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import { protectedRoute } from '../utils/routes.js';

export async function catalogRoutes(fastify: FastifyInstance) {
  // Protect all catalog routes - require authentication
  fastify.addHook('preHandler', fastify.requireAuth);

  // Search endpoint: GET /search?query=batman&type=both
  fastify.get(
    '/search',
    protectedRoute(request =>
      fastify.catalog.search(SearchQuerySchema.parse(request.query), request.user.id)
    )
  );

  // Popular endpoint: GET /popular?page=1&type=both (cached with custom scoring)
  fastify.get(
    '/popular',
    protectedRoute(request =>
      fastify.catalog.popular(PopularQuerySchema.parse(request.query), request.user.id)
    )
  );

  // Discover endpoint: GET /discover?type=both&recent_days=30 (direct TMDB passthrough)
  fastify.get(
    '/discover',
    protectedRoute(request =>
      fastify.catalog.discover(DiscoverQuerySchema.parse(request.query), request.user.id)
    )
  );

  // Details endpoint: GET /details?id=123&type=movie&language=en-US
  // Returns enriched media with DB state if authenticated
  fastify.get(
    '/details',
    protectedRoute(request =>
      fastify.catalog.getDetails(DetailsQuerySchema.parse(request.query), request.user.id)
    )
  );

  // Genres endpoint: GET /genres?type=movie
  fastify.get('/genres', request =>
    fastify.catalog.getGenres(GenresQuerySchema.parse(request.query))
  );

  // Next unvoted endpoint: GET /next
  // Returns the next unvoted item from popular media for swipe/vote feature
  // Requires authentication and supports same filters as popular page
  fastify.get(
    '/next',
    protectedRoute(request =>
      fastify.catalog.getNextUnvoted(PopularQuerySchema.parse(request.query), request.user.id)
    )
  );
}
