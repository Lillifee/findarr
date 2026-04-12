import 'dotenv/config';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ServerEnvSchema } from '@findarr/shared';
import Fastify from 'fastify';
import { adminRoutes } from './admin/routes.js';
import arrPlugin from './arr/plugin.js';
import authPlugin from './auth/plugin.js';
import authRoutes from './auth/routes.js';
import catalogPlugin from './catalog/plugin.js';
import { catalogRoutes } from './catalog/routes.js';
import databasePlugin from './db/plugin.js';
import { interactionRoutes } from './interaction/routes.js';
import jellyfinPlugin from './jellyfin/plugin.js';
import schedulerPlugin from './scheduler/plugin.js';
import { adminSchedulerRoutes, schedulerRoutes } from './scheduler/routes.js';
import tmdbPlugin from './tmdb/plugin.js';
import { registerErrorHandler } from './utils/errors.js';

// Validate environment variables
const env = ServerEnvSchema.parse(process.env);

const server = Fastify({
  logger:
    env.NODE_ENV === 'development'
      ? {
          level: 'info',
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            },
          },
          serializers: {
            err: (
              err: Error & { code?: string; status?: number; response?: { data?: unknown } }
            ) => ({
              type: err.name,
              message: err.message,
              code: err.code,
              status: err.status,
              data: err.response?.data,
              stack: err.stack ?? 'no stack trace',
            }),
          },
        }
      : {
          level: 'warn',
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
      max: 100,
      timeWindow: '1 minute',
    });

    // Register plugins
    await server.register(databasePlugin, { dbPath: env.DB_PATH });
    await server.register(authPlugin, { sessionSecret: env.SESSION_SECRET });
    await server.register(tmdbPlugin, {
      tmdbBaseUrl: env.TMDB_BASE_URL,
      tmdbAccessToken: env.TMDB_ACCESS_TOKEN,
    });

    await server.register(jellyfinPlugin);
    await server.register(arrPlugin);
    await server.register(catalogPlugin);
    await server.register(schedulerPlugin);

    // Health check endpoint
    server.get('/health', async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }));

    // Register API routes
    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.register(adminRoutes, { prefix: '/api/admin' });
    await server.register(interactionRoutes, { prefix: '/api/interactions' });
    await server.register(catalogRoutes, { prefix: '/api' });
    await server.register(schedulerRoutes, { prefix: '/api' });
    await server.register(adminSchedulerRoutes, { prefix: '/api/admin' });

    // Start scheduler orchestration
    await server.scheduler.startOrchestration();

    // Start server
    const address = await server.listen({
      port: env.PORT,
      host: env.HOST,
    });

    server.log.info(`Server listening at ${address}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

void start();
