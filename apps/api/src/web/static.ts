import { join } from 'node:path';

import { fastifyStatic } from '@fastify/static';
import { isDefined } from '@findarr/shared';
import dotenv from 'dotenv';
import { type FastifyInstance } from 'fastify';

dotenv.config();

const currentDirectory = import.meta.dirname;
const clientDistDir = join(currentDirectory, '..', '..', '..', 'web', 'dist');
const clientAssetsDir = join(clientDistDir, 'assets');

export async function registerStatic(server: FastifyInstance) {
  // Serve Vite build assets
  await server.register(fastifyStatic, { root: clientAssetsDir, prefix: '/assets/' });

  // Root document
  server.get('/', (_request, reply) => reply.sendFile('index.html', clientDistDir));

  // SPA fallback
  server.get('/*', (request, reply) => {
    const requestPath = request.url.split('?')[0];

    if (
      !isDefined(requestPath) ||
      requestPath?.startsWith('/api') ||
      requestPath?.startsWith('/health') ||
      requestPath?.startsWith('/assets/')
    ) {
      reply.callNotFound();
      return;
    }

    reply.sendFile('index.html', clientDistDir);
  });
}
