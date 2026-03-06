import type { User } from '@findarr/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestUser } from '../utils/testHelper.js';
import authPlugin from './plugin.js';
import * as userService from './repository.js';

const fakeDbPlugin = fp(
  async x => {
    x.decorate('db', {} as never);
  },
  { name: 'database' }
);

describe('authPlugin integration', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();

    await app.register(fakeDbPlugin);
    await app.register(authPlugin, { sessionSecret: 'a'.repeat(32) });

    app.post('/login', async request => request.session.set('userId', 1));
    app.get('/protected', { preHandler: app.requireAuth, handler: async () => ({ ok: true }) });
    app.get('/admin', { preHandler: app.requireAdmin, handler: async () => ({ ok: true }) });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  const login = async (user?: User) => {
    vi.spyOn(userService, 'getUserById').mockImplementation((_db, _id) => user);

    const login = await app.inject({ method: 'POST', url: '/login' });
    const cookies = Object.fromEntries(login.cookies.map(c => [c.name, c.value]));
    return cookies;
  };

  it('should return unauthorized (401) when user not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/protected' });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'Authentication required' });
  });

  it('should return unauthorized (401) when admin not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin' });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'Authentication required' });
  });

  it('should clear session when user is deleted', async () => {
    const cookies = await login();
    const res = await app.inject({ method: 'GET', url: '/protected', cookies });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'Authentication required' });
  });

  it('should allow user to access protected route', async () => {
    const cookies = await login(createTestUser());
    const res = await app.inject({ method: 'GET', url: '/protected', cookies });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('should return status code forbidden (403) when user is not admin', async () => {
    const cookies = await login(createTestUser());
    const res = await app.inject({ method: 'GET', url: '/admin', cookies });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'Admin access required' });
  });

  it('should allow admin user to access admin route', async () => {
    const cookies = await login({ ...createTestUser(), role: 'admin' });
    const res = await app.inject({ method: 'GET', url: '/admin', cookies });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
