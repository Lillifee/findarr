import { CreateUserSchema, DeleteUserSchema } from '@findarr/shared';
import type { FastifyPluginAsync } from 'fastify';
import { createUser, listAllUsers, deleteUser } from '../services/user.js';

const adminRoutes: FastifyPluginAsync = async fastify => {
  // All admin routes require admin role
  fastify.addHook('preHandler', fastify.requireAdmin);

  // List all users
  fastify.get('/users', () => listAllUsers(fastify.db));

  // Create new user
  fastify.post('/users', r => createUser(fastify.db, CreateUserSchema.parse(r.body)));

  // Delete user
  fastify.delete('/users/:id', r =>
    deleteUser(fastify.db, DeleteUserSchema.parse(r.params).id, r.user?.id)
  );
};

export default adminRoutes;
