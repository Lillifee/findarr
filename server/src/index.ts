import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { mediaPlugin } from './plugins/media.js';
import { mediaRoutes } from './routes/media.js';
import { ServerEnvSchema } from '@findarr/shared';

// Validate environment variables
const env = ServerEnvSchema.parse(process.env);

const server = fastify({
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
    // Register CORS
    await server.register(cors, {
      origin: env.NODE_ENV === 'development' ? ['http://localhost:5173'] : false,
    });

    // Register media service
    await server.register(mediaPlugin, { env });

    // Health check endpoint
    server.get('/health', async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }));

    // Register API routes
    await server.register(mediaRoutes, { prefix: '/api' });

    // Start server
    const address = await server.listen({
      port: env.PORT,
      host: env.HOST,
    });

    server.log.info(`Server listening at ${address}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
