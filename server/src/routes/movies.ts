import type { FastifyInstance } from 'fastify';
import { createMediaDetailsRoute } from './media';

export async function movieRoutes(fastify: FastifyInstance) {
  // Get movie details
  fastify.get('/:id', await createMediaDetailsRoute(fastify, 'movie'));
}
