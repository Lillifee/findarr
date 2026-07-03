import crypto from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import cookie from '@fastify/cookie';
import secureSession from '@fastify/secure-session';
import type { User } from '@findarr/shared/auth';
import { isDefined } from '@findarr/shared/utils';
import type {
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
  FastifyPluginOptions,
} from 'fastify';
import fp from 'fastify-plugin';

import { getUserById, removePasswordHash } from './repository.js';

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
  secretPath: string;
}

// 7 days in seconds
const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

// Exactly 16 characters
const SESSION_SALT = 'findarr-salt-016';

function loadOrCreateSecret(secretPath: string) {
  if (existsSync(secretPath)) {
    return readFileSync(secretPath, 'utf8');
  }

  const secret = crypto.randomBytes(32).toString('hex');
  writeFileSync(secretPath, secret, { mode: 0o600 });
  return secret;
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, options) => {
  // Register cookie support
  await fastify.register(cookie);

  // Register secure session
  await fastify.register(secureSession, {
    secret: loadOrCreateSecret(options.secretPath),
    salt: SESSION_SALT,
    cookie: {
      path: '/',
      httpOnly: true,
      secure: 'auto',
      sameSite: 'lax',
      maxAge: SESSION_COOKIE_MAX_AGE,
    },
  });

  // Helper to require authentication
  fastify.decorate('requireAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.session.get('userId');

    if (!isDefined(userId)) {
      reply.code(401).send({ error: 'Authentication required' });
      return;
    }

    const user = await getUserById(fastify.db, userId);

    if (!user) {
      // User was deleted, clear session
      request.session.delete();
      reply.code(401).send({ error: 'Authentication required' });
      return;
    }

    // Attach user to request
    request.user = removePasswordHash(user);
  });

  // Helper to require admin role
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.requireAuth(request, reply);

    if (reply.sent) {
      return;
    }
    if (request.user?.role !== 'admin') {
      reply.code(403).send({ error: 'Admin access required' });
    }
  });

  fastify.appLog.info({ name: 'auth' }, 'Authentication plugin initialized');
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['database', 'logger'],
});
