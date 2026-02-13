import 'dotenv/config';

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ServerEnvSchema } from '@findarr/shared';
import Fastify from 'fastify';
import { seed } from './db/seed.js';
import { createDatabase } from './db/setup.js';
import authPlugin from './plugins/auth.js';
import databasePlugin from './plugins/database.js';
import mediaPlugin from './plugins/media.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import { registerErrorHandler } from './routes/common.js';
import { mediaRoutes } from './routes/media.js';
import { requestRoutes, adminRequestRoutes } from './routes/requests.js';

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
  // Check for setup argument
  if (process.argv.includes('--setup')) {
    const db = createDatabase(env.DB_PATH);
    await seed(server, db, env);
    db.close();

    process.exit(0);
  }

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
    await server.register(databasePlugin, { env });
    await server.register(authPlugin, { env });
    await server.register(mediaPlugin, { env });

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
    await server.register(mediaRoutes, { prefix: '/api' });

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
