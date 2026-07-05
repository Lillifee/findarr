import path from 'node:path';
import { isSea } from 'node:sea';

import { fastifyStatic } from '@fastify/static';
import { isDefined } from '@findarr/shared/utils';
import dotenv from 'dotenv';
import type { FastifyInstance } from 'fastify';

dotenv.config();

const clientDistDir = isSea()
  ? path.join(path.dirname(process.execPath), 'web', 'dist')
  : path.join(import.meta.dirname, '..', '..', '..', 'web', 'dist');

const clientAssetsDir = path.join(clientDistDir, 'assets');

export async function registerStatic(server: FastifyInstance) {
  // Serve Vite build assets
  await server.register(fastifyStatic, { root: clientAssetsDir, prefix: '/assets/' });

  // Root document
  server.get('/', (_request, reply) => reply.sendFile('index.html', clientDistDir));

  // SPA fallback
  server.get('/*', (request, reply) => {
    const [requestPath] = request.url.split('?');

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
