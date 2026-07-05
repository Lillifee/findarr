import path from 'node:path';

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ServerEnvSchema } from '@findarr/shared/env';
import dotenv from 'dotenv';
import fastify from 'fastify';

import { adminRoutes } from './admin/routes.js';
import arrPlugin from './arr/plugin.js';
import authPlugin from './auth/plugin.js';
import { authRoutes, protectedAuthRoutes } from './auth/routes.js';
import catalogPlugin from './catalog/plugin.js';
import { catalogRoutes } from './catalog/routes.js';
import databasePlugin from './db/plugin.js';
import interactionPlugin from './interaction/plugin.js';
import { interactionRoutes } from './interaction/routes.js';
import libPlugin from './lib/plugin.js';
import loggerPlugin from './logging/plugin.js';
import { adminLogsRoutes } from './logging/routes.js';
import { createLogStore } from './logging/service.js';
import schedulerPlugin from './scheduler/plugin.js';
import { adminSchedulerRoutes, schedulerRoutes } from './scheduler/routes.js';
import tmdbPlugin from './tmdb/plugin.js';
import { settingsRoutes } from './user/routes.js';
import { registerErrorHandler } from './utils/errors.js';
import { buildLogger } from './utils/logger.js';
import { registerStatic } from './web/static.js';

dotenv.config();

// Validate environment variables
const env = ServerEnvSchema.parse(process.env);
const dataPath = env.DATA_PATH;

const logStore = createLogStore();

const server = fastify({
  loggerInstance: buildLogger(env.NODE_ENV === 'production', logStore.createStream()),
});

async function start() {
  try {
    // Register global error handler
    registerErrorHandler(server);

    // Register CORS with credentials support
    await server.register(cors, {
      origin: env.NODE_ENV === 'development' ? ['http://localhost:5173'] : false,
      credentials: true,
    });

    // Register rate limiting
    await server.register(rateLimit, {
      max: 1000,
      timeWindow: '1 minute',
    });

    // Register plugins
    await server.register(loggerPlugin, { service: logStore });
    await server.register(databasePlugin, { dbPath: path.join(dataPath, 'findarr.db') });
    await server.register(authPlugin, { secretPath: path.join(dataPath, 'session.secret') });
    await server.register(tmdbPlugin);

    await server.register(libPlugin);
    await server.register(arrPlugin);
    await server.register(catalogPlugin);
    await server.register(interactionPlugin);
    await server.register(schedulerPlugin);

    // Health check endpoint
    server.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    // Register API routes
    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.register(protectedAuthRoutes, { prefix: '/api/auth' });
    await server.register(adminRoutes, { prefix: '/api/admin' });
    await server.register(interactionRoutes, { prefix: '/api/interactions' });
    await server.register(settingsRoutes, { prefix: '/api/settings' });
    await server.register(catalogRoutes, { prefix: '/api' });
    await server.register(schedulerRoutes, { prefix: '/api' });
    await server.register(adminSchedulerRoutes, { prefix: '/api/admin' });
    await server.register(adminLogsRoutes, { prefix: '/api/admin' });

    // Start scheduler orchestration
    server.scheduler.startOrchestration();

    // Serve static files in production
    if (env.NODE_ENV === 'production') {
      await registerStatic(server);
    }

    // Start server
    await server.listen({
      port: env.PORT,
      host: env.HOST,
    });
  } catch (error) {
    server.log.error({ name: 'server', err: error }, 'Failed to start');
    throw error;
  }
}

// Not top-level await: the API is bundled into a CommonJS Single Executable
// Application (SEA), whose format does not support top-level await.
// oxlint-disable-next-line unicorn/prefer-top-level-await
start().catch((error: unknown) => {
  server.log.error({ name: 'server', err: error }, 'Failed to start');
  process.exitCode = 1;
});
