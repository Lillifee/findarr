import { getErrorMessage, type CreateUser } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import { createUser, getUserByEmail } from '../services/user.js';
import type { DB } from './setup.js';

export async function seed(fastify: FastifyInstance, db: DB, email: string, password: string) {
  try {
    fastify.log.info('Seeding database...');

    // Check if admin already exists
    const existingAdmin = getUserByEmail(db, email);

    if (existingAdmin) {
      fastify.log.info('Admin user already exists');
      fastify.log.info(`Email: ${email}`);
      return;
    }

    // Create admin user
    const userData: CreateUser = {
      email,
      password,
      role: 'admin',
      displayName: 'admin',
    };

    const admin = await createUser(db, userData);
    if (!admin) {
      fastify.log.error('Failed to create admin user');
      return;
    }

    fastify.log.info('Admin user created successfully!');
    fastify.log.info('');
    fastify.log.info(`   Email: ${email}`);
    fastify.log.info(`   Password: ${password}`);
    fastify.log.info('');
    fastify.log.warn('!!! Please change the default password after first login !!!');
    fastify.log.info('Database setup and seed complete.');
  } catch (error) {
    fastify.log.error(`Error seeding database: ${getErrorMessage(error)}`);
    throw error;
  }
}
