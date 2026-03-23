import {
  SearchQuerySchema,
  PopularQuerySchema,
  DetailsQuerySchema,
  GenresQuerySchema,
  DiscoverQuerySchema,
} from '@findarr/shared';
import type { FastifyInstance } from 'fastify';

export async function catalogRoutes(fastify: FastifyInstance) {
  // Protect all catalog routes - require authentication
  fastify.addHook('preHandler', fastify.requireAuth);

  // Search endpoint: GET /search?query=batman&type=both
  fastify.get('/search', r => fastify.catalog.search(SearchQuerySchema.parse(r.query), r.user?.id));

  // Popular endpoint: GET /popular?page=1&type=both (cached with custom scoring)
  fastify.get('/popular', r =>
    fastify.catalog.popular(PopularQuerySchema.parse(r.query), r.user?.id)
  );

  // Discover endpoint: GET /discover?type=both&recent_days=30 (direct TMDB passthrough)
  fastify.get('/discover', r =>
    fastify.catalog.discover(DiscoverQuerySchema.parse(r.query), r.user?.id)
  );

  // Details endpoint: GET /details?id=123&type=movie&language=en-US
  // Returns enriched media with DB state if authenticated
  fastify.get('/details', r =>
    fastify.catalog.getDetails(DetailsQuerySchema.parse(r.query), r.user?.id)
  );

  // Genres endpoint: GET /genres?type=movie
  fastify.get('/genres', r => fastify.catalog.getGenres(GenresQuerySchema.parse(r.query)));
}
