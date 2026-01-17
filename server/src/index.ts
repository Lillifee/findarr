import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { tmdbPlugin } from './services/tmdb';
import { movieRoutes } from './routes/movies';
import { searchRoutes } from './routes/search';
import { tvRoutes } from './routes/tv';
import { ServerEnvSchema } from '@findarr/shared';

// Validate environment variables
const env = ServerEnvSchema.parse(process.env);

const server = fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

async function start() {
  try {
    // Register CORS
    await server.register(cors, {
      origin: env.NODE_ENV === 'development' ? ['http://localhost:5173'] : false,
    });

    // Register TMDB service
    await server.register(tmdbPlugin);

    // Health check endpoint
    server.get('/health', async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }));

    // Register API routes
    await server.register(searchRoutes, { prefix: '/api/search' });
    await server.register(movieRoutes, { prefix: '/api/movie' });
    await server.register(tvRoutes, { prefix: '/api/tv' });

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
