import {
  SearchQuerySchema,
  PopularQuerySchema,
  DetailsQuerySchema,
  GenresQuerySchema,
  DiscoverQuerySchema,
} from '@findarr/shared';
import type { FastifyInstance } from 'fastify';

export async function mediaRoutes(fastify: FastifyInstance) {
  // Protect all media routes - require authentication
  fastify.addHook('preHandler', fastify.requireAuth);

  // Search endpoint: GET /search?query=batman&type=both
  fastify.get('/search', async r => fastify.media.search(SearchQuerySchema.parse(r.query)));

  // Popular endpoint: GET /popular?page=1&type=both (cached with custom scoring)
  fastify.get('/popular', async r => fastify.media.popular(PopularQuerySchema.parse(r.query)));

  // Discover endpoint: GET /discover?type=both&recent_days=30 (direct TMDB passthrough)
  fastify.get('/discover', async r => fastify.media.discover(DiscoverQuerySchema.parse(r.query)));

  // Details endpoint: GET /details?id=123&type=movie&language=en-US
  fastify.get('/details', async r => fastify.media.getDetails(DetailsQuerySchema.parse(r.query)));

  // Genres endpoint: GET /genres?type=movie
  fastify.get('/genres', async r => fastify.media.getGenres(GenresQuerySchema.parse(r.query)));
}
