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
  const log = fastify.appLog.scope('db');

  log.info({ dbPath }, 'Database initialized');

  // Decorate Fastify instance with Drizzle database
  fastify.decorate('db', db);
  log.info('Database plugin registered');

  // Close database connection on shutdown
  fastify.addHook('onClose', () => {
    sqliteDb.close();
    log.info('Database connection closed');
  });
};

export default fp(databasePlugin, {
  name: 'database',
  dependencies: ['logger'],
});
