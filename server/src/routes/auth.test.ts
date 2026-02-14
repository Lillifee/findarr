import { type Login } from '@findarr/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as authService from '../services/auth.js';
import { mockDb, createUser } from '../utils/testHelper.js';
import authRoutes from './auth.js';

describe('authRoutes', () => {
  let app: FastifyInstance;
  const user = createUser();

  // simple in-memory session store
  let sessionStore: Record<string, number> = {};

  beforeEach(async () => {
    app = Fastify();

    // decorate db and auth hook
    app.decorate('db', mockDb);
    app.decorate('requireAuth', async () => {});

    // inject authenticated user and session for each request
    app.addHook('preHandler', async req => {
      req.user = user;
      req.session = {
        set: (key: string, value: number) => (sessionStore[key] = value),
        delete: () => (sessionStore = {}),
      } as never;
    });

    // mock login service
    vi.spyOn(authService, 'login').mockResolvedValue(user);

    await app.register(authRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('should login a user and set session', async () => {
    const login: Login = {
      email: 'user@test.com',
      password: 'password',
    };

    const res = await app.inject({ method: 'POST', url: '/login', payload: login });

    expect(res.statusCode).toBe(200);
    expect(authService.login).toHaveBeenCalledWith(mockDb, login);
    expect(sessionStore.userId).toBe(user.id);
  });

  it('should logout a user and clear session', async () => {
    sessionStore.userId = user.id;

    const res = await app.inject({ method: 'POST', url: '/logout' });

    expect(res.statusCode).toBe(200);
    expect(sessionStore.userId).toBeUndefined();
  });

  it('should return current user', async () => {
    const res = await app.inject({ method: 'GET', url: '/me' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toEqual(user);
  });
});
