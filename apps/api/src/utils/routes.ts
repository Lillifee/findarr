import { isDefined, type User } from '@findarr/shared';
import type { FastifyRequest } from 'fastify';

import { Unauthorized } from './errors.js';

type MaybePromise<T> = T | Promise<T>;

export type AuthenticatedRequest = FastifyRequest & {
  user: User;
};

const isAuthenticatedRequest = (request: FastifyRequest): request is AuthenticatedRequest =>
  isDefined(request.user);

export function protectedRoute<T>(route: (request: AuthenticatedRequest) => MaybePromise<T>) {
  return async (request: FastifyRequest): Promise<T> => {
    if (!isAuthenticatedRequest(request)) throw Unauthorized();
    const result = await route(request);
    return result;
  };
}
