import 'dotenv/config';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ServerEnvSchema } from '@findarr/shared';
import Fastify from 'fastify';
import authPlugin from './plugins/auth.js';
import catalogPlugin from './plugins/catalog.js';
import databasePlugin from './plugins/database.js';
import jellyfinPlugin from './plugins/jellyfin.js';
import tmdbPlugin from './plugins/tmdb.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import { catalogRoutes } from './routes/catalog.js';
import { registerErrorHandler } from './routes/common.js';
import { adminRequestRoutes, requestRoutes } from './routes/requests.js';
import { startSyncScheduler } from './services/jellyfin.js';

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
    await server.register(requestRoutes, { prefix: '/api/requests' });
    await server.register(adminRequestRoutes, { prefix: '/api/admin/requests' });
    await server.register(catalogRoutes, { prefix: '/api' });

    // Initial Jellyfin sync
    // await syncJellyfinLibrary(server);

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
