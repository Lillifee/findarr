import type { FastifyInstance } from 'fastify';
import { createMediaSearchRoute } from './media';

export async function searchRoutes(fastify: FastifyInstance) {
  // Search movies
  fastify.get('/movie', await createMediaSearchRoute(fastify, 'movie'));

  // Search TV shows
  fastify.get('/tv', await createMediaSearchRoute(fastify, 'tv'));
}
