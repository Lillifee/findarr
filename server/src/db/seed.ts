import { getErrorMessage, users } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import { hashPassword } from '../auth/service.js';
import type { DB } from './setup.js';

export async function seed(fastify: FastifyInstance, db: DB) {
  try {
    // Check if users already exist
    const existingUsers = await db.query.users.findMany();
    if (existingUsers.length > 0) return;

    fastify.log.info('Seeding database...');

    // Hash password
    const passwordHash = await hashPassword('changeme');

    // Create admin user
    await db.insert(users).values({
      email: 'admin@findarr.com',
      passwordHash,
      displayName: 'admin',
      role: 'admin',
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
