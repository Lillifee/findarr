import type { CreateUser } from '@findarr/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as userService from '../auth/repository.js';
import * as interactionService from '../interaction/service.js';
import { createMedia, mockDb, createUser } from '../utils/testHelper.js';
import { adminRoutes } from './routes.js';

describe('adminRoutes', () => {
  let app: FastifyInstance;
  const user = createUser();
  const enrichedMedia = createMedia({
    state: {
      record: {
        id: 1,
        status: 'requested',
        jellyfinId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  });

  beforeEach(async () => {
    app = Fastify();

    // mock decorators
    app.decorate('db', mockDb);
    app.decorate('requireAdmin', async () => {});

    // Mock tmdb service
    app.decorate('tmdb', {
      loadGenres: vi.fn().mockResolvedValue(undefined),
      search: vi.fn(),
      fetchDiscover: vi.fn(),
      fetchTrending: vi.fn(),
      getGenres: vi.fn().mockReturnValue([]),
      getDetails: vi.fn(),
    });

    // inject authenticated user for every request
    app.addHook('preHandler', async req => {
      req.user = user;
    });

    // mock services
    vi.spyOn(userService, 'listAllUsers').mockResolvedValue([user]);
    vi.spyOn(userService, 'createUser').mockResolvedValue(user);
    vi.spyOn(userService, 'deleteUser').mockResolvedValue();
    vi.spyOn(interactionService, 'getAllInteractionsEnriched').mockResolvedValue([enrichedMedia]);

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

  it('should return all interactions (admin)', async () => {
    const res = await app.inject({ method: 'GET', url: '/interactions' });

    expect(res.statusCode).toBe(200);
    expect(interactionService.getAllInteractionsEnriched).toHaveBeenCalled();
  });
});
