import path from 'node:path';

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ServerEnvSchema } from '@findarr/shared';
import dotenv from 'dotenv';
import Fastify from 'fastify';

import { adminRoutes } from './admin/routes.js';
import arrPlugin from './arr/plugin.js';
import { arrRoutes } from './arr/routes.js';
import authPlugin from './auth/plugin.js';
import { authRoutes, protectedAuthRoutes } from './auth/routes.js';
import catalogPlugin from './catalog/plugin.js';
import { catalogRoutes } from './catalog/routes.js';
import databasePlugin from './db/plugin.js';
import { interactionRoutes } from './interaction/routes.js';
import jellyfinPlugin from './jellyfin/plugin.js';
import { jellyfinRoutes } from './jellyfin/routes.js';
import schedulerPlugin from './scheduler/plugin.js';
import { adminSchedulerRoutes, schedulerRoutes } from './scheduler/routes.js';
import tmdbPlugin from './tmdb/plugin.js';
import { settingsRoutes } from './user/routes.js';
import { registerErrorHandler } from './utils/errors.js';
import { registerStatic } from './web/static.js';

dotenv.config();

// Validate environment variables
const env = ServerEnvSchema.parse(process.env);
const dataPath = env.DATA_PATH;

const server = Fastify({
  disableRequestLogging: true,
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname,req,res',
        singleLine: true,
        messageFormat: '{msg}',
      },
    },
    serializers: {
      err: (err: Error & { code?: string; status?: number; response?: { data?: unknown } }) => ({
        type: err.name,
        message: err.message,
        code: err.code,
        status: err.status,
        data: err.response?.data,
        stack: err.stack ?? 'no stack trace',
      }),
    },
  },
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
    await server.register(databasePlugin, { dbPath: path.join(dataPath, 'findarr.db') });
    await server.register(authPlugin, { secretPath: path.join(dataPath, 'session.secret') });
    await server.register(tmdbPlugin);

    await server.register(jellyfinPlugin);
    await server.register(arrPlugin);
    await server.register(catalogPlugin);
    await server.register(schedulerPlugin);

    // Health check endpoint
    server.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    // Register API routes
    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.register(protectedAuthRoutes, { prefix: '/api/auth' });
    await server.register(adminRoutes, { prefix: '/api/admin' });
    await server.register(arrRoutes, { prefix: '/api' });
    await server.register(jellyfinRoutes, { prefix: '/api' });
    await server.register(interactionRoutes, { prefix: '/api/interactions' });
    await server.register(settingsRoutes, { prefix: '/api/settings' });
    await server.register(catalogRoutes, { prefix: '/api' });
    await server.register(schedulerRoutes, { prefix: '/api' });
    await server.register(adminSchedulerRoutes, { prefix: '/api/admin' });

    // Start scheduler orchestration
    await server.scheduler.startOrchestration();

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
    process.exit(1);
  }
}

void start();
