import { getErrorMessage, users } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';

import { hashPassword } from '../auth/service.js';
import type { Database } from './service.js';

export async function seed(fastify: FastifyInstance, db: Database) {
  try {
    // Check if users already exist
    const existingUsers = await db.query.users.findMany();
    if (existingUsers.length > 0) return;

    fastify.log.info({ name: 'seed' }, 'Seeding database');

    // Hash password
    const passwordHash = await hashPassword('changeme');

    // Create admin user
    await db.insert(users).values({
      email: 'admin@findarr.com',
      passwordHash,
      displayName: 'admin',
      role: 'admin',
    });

    fastify.log.info({ name: 'seed' }, 'Admin user created successfully');
    fastify.log.info({ name: 'seed', email: 'admin@findarr.com' }, 'Bootstrap admin email');
    fastify.log.warn(
      { name: 'seed' },
      'Bootstrap admin password is changeme - change it after first login',
    );
    fastify.log.info({ name: 'seed' }, 'Database setup and seed complete');
  } catch (error) {
    fastify.log.error({ name: 'seed', error: getErrorMessage(error) }, 'Error seeding database');
    throw error;
  }
}
