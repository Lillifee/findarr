import {
  ChangePasswordSchema,
  LoginSchema,
  SetupInitialPasswordSchema,
  type AppBootstrapStatus,
} from '@findarr/shared';
import type { FastifyPluginAsync } from 'fastify';
import { protectedRoute } from '../utils/routes.js';
import { changePassword, isPasswordSetupRequired, login, setupInitialPassword } from './service.js';

export const authRoutes: FastifyPluginAsync = async fastify => {
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
};

export const protectedAuthRoutes: FastifyPluginAsync = async fastify => {
  fastify.addHook('preHandler', fastify.requireAuth);

  // Get current user
  fastify.get('/me', r => r.user);

  fastify.put(
    '/password',

    protectedRoute(async r => {
      await changePassword(fastify.db, r.user.id, ChangePasswordSchema.parse(r.body));
      return { success: true };
    })
  );

  fastify.put(
    '/password/setup',

    protectedRoute(async r => {
      await setupInitialPassword(fastify.db, r.user.id, SetupInitialPasswordSchema.parse(r.body));
      return { success: true };
    })
  );

  // Get bootstrap status for post-login app gating
  fastify.get(
    '/bootstrap',

    protectedRoute<AppBootstrapStatus>(async r => ({
      tmdbConfigured: await fastify.tmdb.isConfigured(),
      requiresPasswordSetup: await isPasswordSetupRequired(fastify.db, r.user.id),
    }))
  );
};
