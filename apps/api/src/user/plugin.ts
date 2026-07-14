import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

import { createUserService, type UserService } from './service.js';

// Extend Fastify instance with user service
declare module 'fastify' {
  interface FastifyInstance {
    user: UserService;
  }
}

type UserPluginOptions = FastifyPluginOptions;

const userPlugin: FastifyPluginAsync<UserPluginOptions> = async (fastify) => {
  fastify.decorate('user', createUserService(fastify));
  fastify.appLog.scope('user').info('User plugin registered');
};

export default fp(userPlugin, {
  name: 'user',
  dependencies: ['database', 'logger'],
});
