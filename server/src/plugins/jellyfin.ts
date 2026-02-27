import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { createJellyfinClient } from '../jellyfin/client.js';
import { createJellyfinService, type JellyfinService } from '../jellyfin/service.js';

// Extend Fastify instance with Jellyfin service
declare module 'fastify' {
  interface FastifyInstance {
    jellyfin: JellyfinService;
  }
}

interface JellyfinPluginOptions extends FastifyPluginOptions {
  jellyfinUrl: string;
  jellyfinApiKey: string;
}

const jellyfinPlugin: FastifyPluginAsync<JellyfinPluginOptions> = async (fastify, options) => {
  const { jellyfinUrl, jellyfinApiKey } = options;

  // Create Jellyfin client and service
  const jellyfinClient = createJellyfinClient(jellyfinUrl, jellyfinApiKey);
  const jellyfinService = createJellyfinService(jellyfinClient);

  // Decorate fastify instance
  fastify.decorate('jellyfin', jellyfinService);
  fastify.log.info('Jellyfin plugin registered');
};

export default fp(jellyfinPlugin, {
  name: 'jellyfin',
  dependencies: ['database'], // Needs database for sync
});
