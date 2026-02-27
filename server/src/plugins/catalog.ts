import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createCatalogService, type CatalogService } from '../services/catalog.js';

// Extend Fastify instance with catalog service
declare module 'fastify' {
  interface FastifyInstance {
    catalog: CatalogService;
  }
}

const catalogPlugin: FastifyPluginAsync = async fastify => {
  // Create catalog service using existing db and tmdb services
  const catalogService = createCatalogService(fastify.db, fastify.tmdb);

  // Initialize all data sources
  await catalogService.initialize();

  // Decorate fastify instance with catalog service
  fastify.decorate('catalog', catalogService);
  fastify.log.info('Catalog plugin registered');
};

export default fp(catalogPlugin, {
  name: 'catalog',
  dependencies: ['database', 'tmdb'],
});
