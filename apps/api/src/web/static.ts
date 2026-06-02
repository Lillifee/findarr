import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fastifyStatic } from '@fastify/static';
import { isDefined } from '@findarr/shared';
import dotenv from 'dotenv';
import { type FastifyInstance } from 'fastify';

dotenv.config();

const currentDirectory = dirname(fileURLToPath(import.meta.url));
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
