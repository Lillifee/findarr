import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { createDatabase, type DB } from '../db/setup.js';

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

  fastify.log.info({ dbPath }, 'Database initialized');

  // Decorate Fastify instance with database
  fastify.decorate('db', db);

  // Close database connection on shutdown
  fastify.addHook('onClose', async () => {
    db.close();
    fastify.log.info('Database connection closed');
  });
};

export default fp(databasePlugin, {
  name: 'database',
});
