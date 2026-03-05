import { getErrorMessage } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import { createUser, listAllUsers } from '../auth/repository.js';
import type { DB } from './setup.js';

export async function seed(fastify: FastifyInstance, db: DB) {
  try {
    const users = await listAllUsers(db);
    if (users.length > 0) return;

    fastify.log.info('Seeding database...');

    // Create admin user
    await createUser(db, {
      email: 'admin@findarr.com',
      password: 'changeme',
      role: 'admin',
      displayName: 'admin',
    });

    fastify.log.info('Admin user created successfully!');
    fastify.log.info('');
    fastify.log.info(`   Email: admin@findarr.com`);
    fastify.log.info(`   Password: changeme`);
    fastify.log.info('');
    fastify.log.warn('!!! Please change the default password after first login !!!');
    fastify.log.info('Database setup and seed complete.');
  } catch (error) {
    fastify.log.error(`Error seeding database: ${getErrorMessage(error)}`);
    throw error;
  }
}
