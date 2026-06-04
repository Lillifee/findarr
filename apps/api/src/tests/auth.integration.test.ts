import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { isDefined } from '@findarr/shared/utils';
import fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import authPlugin from '../auth/plugin.js';
import { authRoutes, protectedAuthRoutes } from '../auth/routes.js';
import databasePlugin from '../db/plugin.js';
import type { Database } from '../db/service.js';
import type { TMDBService } from '../tmdb/service.js';
import { registerErrorHandler } from '../utils/errors.js';
import { createTestUserInDb } from './helpers/testHelper.js';

function getSessionCookie(reply: Awaited<ReturnType<FastifyInstance['inject']>>) {
  const header = reply.headers['set-cookie'];

  if (!isDefined(header)) {
    throw new Error('Expected set-cookie header');
  }

  const cookies = Array.isArray(header) ? header : [header];
  return cookies.map((cookie) => cookie.split(';', 1)[0]).join('; ');
}

describe('auth routes - integration tests', () => {
  let app: FastifyInstance;
  let db: Database;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'findarr-auth-test-'));

    app = fastify();
    registerErrorHandler(app);

    await app.register(databasePlugin, {
      dbPath: path.join(tempDir, 'findarr.db'),
    });
    await app.register(authPlugin, {
      secretPath: path.join(tempDir, 'session.secret'),
    });

    const tmdbServiceMock: TMDBService = {
      getSettings: vi
        .fn<TMDBService['getSettings']>()
        .mockReturnValue({ tmdbAccessTokenSet: true }),
      setSettings: vi
        .fn<TMDBService['setSettings']>()
        .mockResolvedValue({ tmdbAccessTokenSet: true }),
      isConfigured: vi.fn<TMDBService['isConfigured']>().mockReturnValue(true),
      testConnection: vi.fn<TMDBService['testConnection']>().mockResolvedValue(true),
      testAndSync: vi.fn<TMDBService['testAndSync']>().mockResolvedValue(true),
      search: vi.fn<TMDBService['search']>(),
      discover: vi.fn<TMDBService['discover']>(),
      trending: vi.fn<TMDBService['trending']>(),
      details: vi.fn<TMDBService['details']>(),
      genres: vi.fn<TMDBService['genres']>(),
      findByExternalId: vi.fn<TMDBService['findByExternalId']>(),
    };

    app.decorate('tmdb', tmdbServiceMock);

    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(protectedAuthRoutes, { prefix: '/auth' });
    await app.ready();

    ({ db } = app);
  });

  afterEach(async () => {
    await app.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('changes password for an authenticated user', async () => {
    await createTestUserInDb(db, { email: 'change-password@test.com' });

    const loginReply = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'change-password@test.com',
        password: 'password',
      },
    });

    expect(loginReply.statusCode).toBe(200);

    const cookie = getSessionCookie(loginReply);
    const changeReply = await app.inject({
      method: 'PUT',
      url: '/auth/password',
      headers: { cookie },
      payload: {
        currentPassword: 'password',
        newPassword: 'new-password',
      },
    });

    expect(changeReply.statusCode).toBe(200);

    const oldLoginReply = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'change-password@test.com',
        password: 'password',
      },
    });

    expect(oldLoginReply.statusCode).toBe(401);

    const newLoginReply = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'change-password@test.com',
        password: 'new-password',
      },
    });

    expect(newLoginReply.statusCode).toBe(200);
  });

  it('rejects password change when the current password is wrong', async () => {
    await createTestUserInDb(db, { email: 'wrong-current@test.com' });

    const loginReply = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'wrong-current@test.com',
        password: 'password',
      },
    });

    const cookie = getSessionCookie(loginReply);
    const changeReply = await app.inject({
      method: 'PUT',
      url: '/auth/password',
      headers: { cookie },
      payload: {
        currentPassword: 'incorrect-password',
        newPassword: 'new-password',
      },
    });

    expect(changeReply.statusCode).toBe(401);
    expect(changeReply.json()).toStrictEqual({ error: 'Current password is incorrect' });
  });

  it('returns password-setup requirement in bootstrap for the seeded admin password', async () => {
    const loginReply = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'admin@findarr.com',
        password: 'changeme',
      },
    });

    const bootstrapReply = await app.inject({
      method: 'GET',
      url: '/auth/bootstrap',
      headers: { cookie: getSessionCookie(loginReply) },
    });

    expect(bootstrapReply.statusCode).toBe(200);
    expect(bootstrapReply.json()).toStrictEqual({
      tmdbConfigured: true,
      requiresPasswordSetup: true,
    });
  });

  it('clears the bootstrap password gate after initial admin password setup', async () => {
    const loginReply = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'admin@findarr.com',
        password: 'changeme',
      },
    });

    const cookie = getSessionCookie(loginReply);
    const setupReply = await app.inject({
      method: 'PUT',
      url: '/auth/password/setup',
      headers: { cookie },
      payload: {
        newPassword: 'updated-admin-password',
      },
    });

    expect(setupReply.statusCode).toBe(200);

    const bootstrapReply = await app.inject({
      method: 'GET',
      url: '/auth/bootstrap',
      headers: { cookie },
    });

    expect(bootstrapReply.statusCode).toBe(200);
    expect(bootstrapReply.json()).toStrictEqual({
      tmdbConfigured: true,
      requiresPasswordSetup: false,
    });
  });
});
