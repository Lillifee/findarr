import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { seed } from './seed.js';
import { createDatabase, type DB } from './setup.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
  }
}

interface DatabasePluginOptions extends FastifyPluginOptions {
  dbPath: string;
}

const databasePlugin: FastifyPluginAsync<DatabasePluginOptions> = async (fastify, options) => {
  const dbPath = options.dbPath;
  const db = createDatabase(dbPath);
  seed(fastify, db);

  fastify.log.info({ dbPath }, 'Database initialized');

  // Decorate Fastify instance with database
  fastify.decorate('db', db);
  fastify.log.info('Database plugin registered');

  // Close database connection on shutdown
  fastify.addHook('onClose', async () => {
    db.close();
    fastify.log.info('Database connection closed');
  });
};

export default fp(databasePlugin, {
  name: 'database',
});
