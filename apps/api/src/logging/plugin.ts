import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

import { type AppLogger, createAppLogger } from '../utils/logger.js';
import type { LogStore } from './service.js';

// Extend Fastify instance with the log store and the app logger
declare module 'fastify' {
  interface FastifyInstance {
    logStore: LogStore;
    appLog: AppLogger;
  }
}

interface LoggerPluginOptions extends FastifyPluginOptions {
  service: LogStore;
}

const loggerPlugin: FastifyPluginAsync<LoggerPluginOptions> = async (fastify, options) => {
  fastify.decorate('logStore', options.service);
  fastify.decorate('appLog', createAppLogger(fastify.log));
  fastify.appLog.scope('logger').info('Logger plugin registered');
};

export default fp(loggerPlugin, {
  name: 'logger',
});
