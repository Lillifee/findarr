import { CreateUserSchema, DeleteUserSchema } from '@findarr/shared';
import type { FastifyPluginAsync } from 'fastify';
import { createUser, listAllUsers, deleteUser } from '../auth/repository.js';
import { getAllInteractionsEnriched } from '../interaction/service.js';

const adminRoutes: FastifyPluginAsync = async fastify => {
  // All admin routes require admin role
  fastify.addHook('preHandler', fastify.requireAdmin);

  // User management routes
  // List all users
  fastify.get('/users', () => listAllUsers(fastify.db));

  // Create new user
  fastify.post('/users', r => createUser(fastify.db, CreateUserSchema.parse(r.body)));

  // Delete user
  fastify.delete('/users/:id', r =>
    deleteUser(fastify.db, DeleteUserSchema.parse(r.params).id, r.user?.id)
  );

  // Interaction management routes
  // Get all media with interactions (admin only) - enriched with TMDB data
  fastify.get('/interactions', () => getAllInteractionsEnriched(fastify.tmdb, fastify.db));
};

export { adminRoutes };
