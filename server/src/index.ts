import 'dotenv/config';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ServerEnvSchema } from '@findarr/shared';
import Fastify from 'fastify';
import { adminRoutes } from './admin/routes.js';
import authPlugin from './auth/plugin.js';
import authRoutes from './auth/routes.js';
import catalogPlugin from './catalog/plugin.js';
import { catalogRoutes } from './catalog/routes.js';
import databasePlugin from './db/plugin.js';
import { interactionRoutes } from './interaction/routes.js';
import jellyfinPlugin from './jellyfin/plugin.js';
import { startSyncScheduler, syncJellyfinLibrary } from './jellyfin/sync.js';
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
    await server.register(jellyfinPlugin, {
      jellyfinUrl: env.JELLYFIN_URL,
      jellyfinApiKey: env.JELLYFIN_API_KEY,
    });
    await server.register(catalogPlugin);

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

    // Initial Jellyfin sync
    await syncJellyfinLibrary(server);

    // Start Jellyfin sync scheduler
    const syncTimer = startSyncScheduler(server, env.JELLYFIN_SYNC_INTERVAL_MIN);

    // Cleanup on server close
    server.addHook('onClose', async () => {
      server.log.info('Shutting down Jellyfin sync scheduler...');
      clearInterval(syncTimer);
    });

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

start();
