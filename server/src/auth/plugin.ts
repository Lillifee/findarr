import cookie from '@fastify/cookie';
import secureSession from '@fastify/secure-session';
import type { User } from '@findarr/shared';
import type {
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
  FastifyPluginOptions,
} from 'fastify';
import fp from 'fastify-plugin';
import { getUserById } from './repository.js';

// Extend session data type
declare module '@fastify/secure-session' {
  interface SessionData {
    userId?: number;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user?: User;
  }
}

interface AuthPluginOptions extends FastifyPluginOptions {
  sessionSecret: string;
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, options) => {
  // Register cookie support
  await fastify.register(cookie);

  // Register secure session
  await fastify.register(secureSession, {
    secret: options.sessionSecret,
    salt: 'findarr-salt-016', // Exactly 16 characters
    cookie: {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    },
  });

  // Helper to require authentication
  fastify.decorate('requireAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.session.get('userId');

    if (!userId) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const user = getUserById(fastify.db, userId);

    if (!user) {
      // User was deleted, clear session
      request.session.delete();
      return reply.code(401).send({ error: 'Authentication required' });
    }

    // Attach user to request
    request.user = user;
  });

  // Helper to require admin role
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.requireAuth(request, reply);

    if (reply.sent) return; // Already sent 401
    if (request.user?.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }
  });

  fastify.log.info('Authentication plugin initialized');
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['database'],
});
