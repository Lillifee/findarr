import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { createInteractionService, type InteractionService } from './service.js';

// Extend Fastify instance with the interaction service
declare module 'fastify' {
  interface FastifyInstance {
    interaction: InteractionService;
  }
}

const interactionPlugin = (fastify: FastifyInstance) => {
  // Create interaction service using existing services
  const interactionService = createInteractionService(fastify);

  fastify.decorate('interaction', interactionService);
  fastify.appLog.scope('interaction').info('Interaction plugin registered');
};

export default fp(interactionPlugin, {
  name: 'interaction',
  dependencies: ['database', 'tmdb', 'arr', 'catalog', 'user', 'media', 'administration'],
});
