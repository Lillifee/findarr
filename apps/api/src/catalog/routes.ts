import {
  SearchQuerySchema,
  DiscoverQuerySchema,
  DetailsQuerySchema,
  GenresQuerySchema,
  PopularQuerySchema,
} from '@findarr/shared/catalog';
import type { FastifyInstance } from 'fastify';

import { protectedRoute } from '../utils/routes.js';

export const catalogRoutes = (fastify: FastifyInstance) => {
  // Protect all catalog routes - require authentication
  fastify.addHook('preHandler', fastify.requireAuth);

  // Search endpoint: GET /search?query=batman&type=both
  fastify.get(
    '/search',
    protectedRoute(async (request) =>
      fastify.catalog.search(SearchQuerySchema.parse(request.query), request.user.id),
    ),
  );

  fastify.get(
    '/discover',
    protectedRoute(async (request) =>
      fastify.catalog.listDiscoveredMedia(
        DiscoverQuerySchema.parse(request.query),
        request.user.id,
      ),
    ),
  );

  // Details endpoint: GET /details?id=123&type=movie&language=en-US
  // Returns enriched media with DB state if authenticated
  fastify.get(
    '/details',
    protectedRoute(async (request) =>
      fastify.catalog.getMediaDetails(DetailsQuerySchema.parse(request.query), request.user.id),
    ),
  );

  // Genres endpoint: GET /genres?type=movie
  fastify.get('/genres', async (request) =>
    fastify.catalog.listGenres(GenresQuerySchema.parse(request.query)),
  );

  fastify.get(
    '/queue',
    protectedRoute(async (request) =>
      fastify.catalog.getVoteQueue(PopularQuerySchema.parse(request.query), request.user.id),
    ),
  );
};
