import type { User } from '@findarr/shared';
import type { FastifyRequest } from 'fastify';

import { Unauthorized } from './errors.js';

type MaybePromise<T> = T | Promise<T>;

export type AuthenticatedRequest = FastifyRequest & {
  user: User;
};

export function protectedRoute<T>(route: (request: AuthenticatedRequest) => MaybePromise<T>) {
  return async (request: FastifyRequest): Promise<T> => {
    if (!request.user) throw Unauthorized();
    return await route(request as AuthenticatedRequest);
  };
}
