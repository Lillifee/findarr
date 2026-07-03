import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { isDefined } from '@findarr/shared/utils';
import fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import authPlugin from '../auth/plugin.js';
import { authRoutes, protectedAuthRoutes } from '../auth/routes.js';
import databasePlugin from '../db/plugin.js';
import type { Database } from '../db/service.js';
import loggerPlugin from '../logging/plugin.js';
import { createLogStore } from '../logging/service.js';
import { registerErrorHandler } from '../utils/errors.js';
import { createMockTMDBService } from './helpers/mockServices.js';
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

    await app.register(loggerPlugin, { service: createLogStore() });
    await app.register(databasePlugin, {
      dbPath: path.join(tempDir, 'findarr.db'),
    });
    await app.register(authPlugin, {
      secretPath: path.join(tempDir, 'session.secret'),
    });

    app.decorate('tmdb', createMockTMDBService());

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

  it('returns owner setup requirement in public bootstrap when no users exist', async () => {
    const bootstrapReply = await app.inject({
      method: 'GET',
      url: '/auth/bootstrap',
    });

    expect(bootstrapReply.statusCode).toBe(200);
    expect(bootstrapReply.json()).toStrictEqual({
      tmdbConfigured: true,
      requiresOwnerSetup: true,
    });
  });

  it('creates and logs in the first admin owner', async () => {
    const setupReply = await app.inject({
      method: 'POST',
      url: '/auth/setup-owner',
      payload: {
        email: 'owner@test.com',
        password: 'owner-password',
        displayName: 'Owner',
      },
    });

    expect(setupReply.statusCode).toBe(200);
    expect(setupReply.json()).toMatchObject({
      email: 'owner@test.com',
      displayName: 'Owner',
      role: 'admin',
    });
    expect(setupReply.json()).not.toHaveProperty('passwordHash');

    const cookie = getSessionCookie(setupReply);
    const meReply = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie },
    });

    expect(meReply.statusCode).toBe(200);
    expect(meReply.json()).toMatchObject({
      email: 'owner@test.com',
      role: 'admin',
    });

    const bootstrapReply = await app.inject({
      method: 'GET',
      url: '/auth/bootstrap',
    });

    expect(bootstrapReply.statusCode).toBe(200);
    expect(bootstrapReply.json()).toStrictEqual({
      tmdbConfigured: true,
      requiresOwnerSetup: false,
    });
  });

  it('rejects owner setup after a user exists', async () => {
    await createTestUserInDb(db, { email: 'existing@test.com' });

    const setupReply = await app.inject({
      method: 'POST',
      url: '/auth/setup-owner',
      payload: {
        email: 'owner@test.com',
        password: 'owner-password',
        displayName: 'Owner',
      },
    });

    expect(setupReply.statusCode).toBe(409);
    expect(setupReply.json()).toStrictEqual({ error: 'Owner account is already set up' });
  });
});
