import { LoginSchema } from '@findarr/shared';
import type { FastifyPluginAsync } from 'fastify';
import { login } from './service.js';

const authRoutes: FastifyPluginAsync = async fastify => {
  // Login endpoint
  fastify.post('/login', async r => {
    const user = await login(fastify.db, LoginSchema.parse(r.body));

    // Set session
    r.session.set('userId', user.id);

    return user;
  });

  // Logout endpoint
  fastify.post('/logout', async r => {
    r.session.delete();
    return { success: true };
  });

  // Get current user
  fastify.get('/me', { preHandler: [fastify.requireAuth] }, r => r.user);
};

export default authRoutes;
