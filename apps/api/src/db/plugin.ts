import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

import { createDatabase, type Database } from './service.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

interface DatabasePluginOptions extends FastifyPluginOptions {
  dbPath: string;
}

const databasePlugin: FastifyPluginAsync<DatabasePluginOptions> = async (fastify, options) => {
  const { dbPath } = options;
  const { db, sqliteDb } = createDatabase(dbPath);

  fastify.log.info({ name: 'db', dbPath }, 'Database initialized');

  // Decorate Fastify instance with Drizzle database
  fastify.decorate('db', db);
  fastify.log.info({ name: 'db' }, 'Database plugin registered');

  // Close database connection on shutdown
  fastify.addHook('onClose', () => {
    sqliteDb.close();
    fastify.log.info({ name: 'db' }, 'Database connection closed');
  });
};

export default fp(databasePlugin, {
  name: 'database',
});
