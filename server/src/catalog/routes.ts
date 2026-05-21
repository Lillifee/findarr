import {
  AvailableMediaQuerySchema,
  SearchQuerySchema,
  DetailsQuerySchema,
  GenresQuerySchema,
  DiscoverQuerySchema,
  PopularQuerySchema,
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

  // Popular endpoint: GET /popular?type=both&page=2&feedId=...
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
      fastify.catalog.details(DetailsQuerySchema.parse(request.query), request.user.id)
    )
  );

  // Genres endpoint: GET /genres?type=movie
  fastify.get('/genres', request => fastify.catalog.genres(GenresQuerySchema.parse(request.query)));

  // Available overview endpoint: GET /available?type=both&limit=12
  fastify.get(
    '/available',
    protectedRoute(request =>
      fastify.catalog.available(AvailableMediaQuerySchema.parse(request.query), request.user.id)
    )
  );

  // Next unvoted endpoint: GET /next
  // Returns the next unvoted item from popular media for swipe/vote feature
  // Requires authentication and supports same filters as popular page
  fastify.get(
    '/next',
    protectedRoute(request =>
      fastify.catalog.nextUnvoted(PopularQuerySchema.parse(request.query), request.user.id)
    )
  );
}
