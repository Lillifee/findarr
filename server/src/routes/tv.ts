import type { FastifyInstance } from 'fastify';
import { createMediaDetailsRoute } from './media';

export async function tvRoutes(fastify: FastifyInstance) {
  // Get TV show details
  fastify.get('/:id', await createMediaDetailsRoute(fastify, 'tv'));
}
