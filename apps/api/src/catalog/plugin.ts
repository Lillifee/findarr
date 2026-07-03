import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { createCatalogService, type CatalogService } from './service.js';

// Extend Fastify instance with catalog service
declare module 'fastify' {
  interface FastifyInstance {
    catalog: CatalogService;
  }
}

const catalogPlugin = (fastify: FastifyInstance) => {
  // Create catalog service using existing db and tmdb services
  const catalogService = createCatalogService(fastify);

  // Decorate fastify instance with catalog service
  fastify.decorate('catalog', catalogService);
  fastify.appLog.info({ name: 'catalog' }, 'Catalog plugin registered');
};

export default fp(catalogPlugin, {
  name: 'catalog',
  dependencies: ['database', 'tmdb'],
});
