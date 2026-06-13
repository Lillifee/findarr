import {
  ChangePasswordSchema,
  LoginSchema,
  SetupOwnerSchema,
  type AppBootstrapStatus,
} from '@findarr/shared/auth';
import type { FastifyInstance } from 'fastify';

import { protectedRoute } from '../utils/routes.js';
import { changePassword, isOwnerSetupRequired, login, setupOwner } from './service.js';

export const authRoutes = (fastify: FastifyInstance) => {
  // Get bootstrap status for first-run and app gating
  fastify.get(
    '/bootstrap',
    async (): Promise<AppBootstrapStatus> => ({
      tmdbConfigured: fastify.tmdb.isConfigured(),
      requiresOwnerSetup: await isOwnerSetupRequired(fastify.db),
    }),
  );

  // First-run owner account setup
  fastify.post('/setup-owner', async (r) => {
    const user = await setupOwner(fastify.db, SetupOwnerSchema.parse(r.body));

    r.session.set('userId', user.id);

    return user;
  });

  // Login endpoint
  fastify.post('/login', async (r) => {
    const user = await login(fastify.db, LoginSchema.parse(r.body));

    // Set session
    r.session.set('userId', user.id);

    return user;
  });

  // Logout endpoint
  fastify.post('/logout', (r) => {
    r.session.delete();
    return { success: true };
  });
};

export const protectedAuthRoutes = (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', fastify.requireAuth);

  // Get current user
  fastify.get('/me', (r) => r.user);

  fastify.put(
    '/password',
    protectedRoute(async (r) => {
      await changePassword(fastify.db, r.user.id, ChangePasswordSchema.parse(r.body));
      return { success: true };
    }),
  );
};
