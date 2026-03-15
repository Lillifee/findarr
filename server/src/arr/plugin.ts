import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createArrService, type ArrService } from './service.js';

declare module 'fastify' {
  interface FastifyInstance {
    arr: ArrService;
  }
}

const arrPlugin: FastifyPluginAsync = async fastify => {
  fastify.decorate('arr', createArrService(fastify.db));
  fastify.log.info('Arr plugin registered');
};

export default fp(arrPlugin, {
  name: 'arr',
  dependencies: ['database'],
});
