import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

import type { LoggerService } from './service.js';

// Extend Fastify instance with the logger service
declare module 'fastify' {
  interface FastifyInstance {
    logs: LoggerService;
  }
}

interface LoggerPluginOptions extends FastifyPluginOptions {
  service: LoggerService;
}

const loggerPlugin: FastifyPluginAsync<LoggerPluginOptions> = async (fastify, options) => {
  fastify.decorate('logs', options.service);
  fastify.log.info({ name: 'logger' }, 'Logger plugin registered');
};

export default fp(loggerPlugin, {
  name: 'logger',
});
