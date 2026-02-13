import { type Login, type User } from '@findarr/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DB } from '../db/setup.js';
import * as authService from '../services/auth.js';
import authRoutes from './auth.js';

describe('authRoutes', () => {
  let app: FastifyInstance;

  const mockDb = {} as unknown as DB;
  const mockUser: User = {
    id: 1,
    email: 'user@test.com',
    display_name: 'Test User',
    role: 'user',
    created_at: Date.now(),
  };

  // simple in-memory session store
  let sessionStore: Record<string, number> = {};

  beforeEach(async () => {
    app = Fastify();

    // decorate db and auth hook
    app.decorate('db', mockDb);
    app.decorate('requireAuth', async () => {});

    // inject authenticated user and session for each request
    app.addHook('preHandler', async req => {
      req.user = mockUser;
      req.session = {
        set: (key: string, value: number) => (sessionStore[key] = value),
        delete: () => (sessionStore = {}),
      } as never;
    });

    // mock login service
    vi.spyOn(authService, 'login').mockResolvedValue(mockUser);

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
    expect(sessionStore.userId).toBe(mockUser.id);
  });

  it('should logout a user and clear session', async () => {
    sessionStore.userId = mockUser.id;

    const res = await app.inject({ method: 'POST', url: '/logout' });

    expect(res.statusCode).toBe(200);
    expect(sessionStore.userId).toBeUndefined();
  });

  it('should return current user', async () => {
    const res = await app.inject({ method: 'GET', url: '/me' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toEqual(mockUser);
  });
});
