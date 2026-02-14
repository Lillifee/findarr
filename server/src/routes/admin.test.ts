import type { CreateUser } from '@findarr/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as userService from '../services/user.js';
import { mockDb, createUser } from '../utils/testHelper.js';
import adminRoutes from './admin.js';

describe('adminRoutes', () => {
  let app: FastifyInstance;
  const user = createUser();

  beforeEach(async () => {
    app = Fastify();

    // mock decorators
    app.decorate('db', mockDb);
    app.decorate('requireAdmin', async () => {});

    // inject authenticated user for every request
    app.addHook('preHandler', async req => {
      req.user = user;
    });

    // mock services
    vi.spyOn(userService, 'listAllUsers').mockResolvedValue([user]);
    vi.spyOn(userService, 'createUser').mockResolvedValue(user);
    vi.spyOn(userService, 'deleteUser').mockResolvedValue();

    await app.register(adminRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('should list all users', async () => {
    const res = await app.inject({ method: 'GET', url: '/users' });

    expect(res.statusCode).toBe(200);
    expect(userService.listAllUsers).toHaveBeenCalledWith(mockDb);
  });

  it('should create a user', async () => {
    const newUser: CreateUser = {
      email: 'test@test.com',
      password: 'password',
      displayName: 'Test User',
      role: 'user',
    };
    const res = await app.inject({ method: 'POST', url: '/users', payload: newUser });

    expect(res.statusCode).toBe(200);
    expect(userService.createUser).toHaveBeenCalledWith(mockDb, newUser);
  });

  it('should delete a user', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/users/123' });

    expect(res.statusCode).toBe(200);
    expect(userService.deleteUser).toHaveBeenCalledWith(mockDb, 123, user.id);
  });
});
