import { type CreateUser, type User } from '@findarr/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DB } from '../db/setup.js';
import * as userService from '../services/user.js';
import adminRoutes from './admin.js';

describe('adminRoutes', () => {
  let app: FastifyInstance;

  const mockDb = {} as unknown as DB;
  const mockUser: User = {
    id: 1,
    email: 'admin@test.com',
    display_name: 'admin',
    role: 'admin',
    created_at: Date.now(),
  };

  beforeEach(async () => {
    app = Fastify();

    // mock decorators
    app.decorate('db', mockDb);
    app.decorate('requireAdmin', async () => {});

    // inject authenticated user for every request
    app.addHook('preHandler', async req => {
      req.user = mockUser;
    });

    // mock services
    vi.spyOn(userService, 'listAllUsers').mockResolvedValue([mockUser]);
    vi.spyOn(userService, 'createUser').mockResolvedValue(mockUser);
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
    const createUser: CreateUser = {
      email: 'test@test.com',
      password: 'password',
      displayName: 'Test User',
      role: 'user',
    };

    const res = await app.inject({ method: 'POST', url: '/users', payload: createUser });

    expect(res.statusCode).toBe(200);
    expect(userService.createUser).toHaveBeenCalledWith(mockDb, createUser);
  });

  it('should delete a user', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/users/123' });

    expect(res.statusCode).toBe(200);
    expect(userService.deleteUser).toHaveBeenCalledWith(mockDb, 123, mockUser.id);
  });
});
