import type { CreateUser } from '@findarr/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as authRepository from '../auth/repository.js';
import * as interactionService from '../interaction/service.js';
import { createTestMedia, createTestUser, mockDb } from '../utils/testHelper.js';
import { adminRoutes } from './routes.js';

describe('adminRoutes', () => {
  let app: FastifyInstance;
  const adminUser = createTestUser({ role: 'admin' });
  const testUser1 = createTestUser({ id: 2, email: 'user1@test.com' });
  const testUser2 = createTestUser({ id: 3, email: 'user2@test.com' });
  const testUserWithPassword = { ...testUser1, passwordHash: 'hashed-password' };

  const enrichedMedia = createTestMedia({
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

    // decorate with mock db
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

    // Mock arr service
    app.decorate('arr', {
      requestMedia: vi.fn(),
      requestMovie: vi.fn(),
      requestSeries: vi.fn(),
      testRadarrConnection: vi.fn().mockResolvedValue(false),
      testSonarrConnection: vi.fn().mockResolvedValue(false),
      getRadarrProfiles: vi.fn().mockResolvedValue([]),
      getRadarrRootFolders: vi.fn().mockResolvedValue([]),
      getSonarrProfiles: vi.fn().mockResolvedValue([]),
      getSonarrRootFolders: vi.fn().mockResolvedValue([]),
    });

    // inject authenticated user for every request
    app.addHook('preHandler', async req => {
      req.user = adminUser;
    });

    // Mock auth repository methods (admin service re-exports these)
    vi.spyOn(authRepository, 'listAllUsers').mockResolvedValue([adminUser, testUser1, testUser2]);
    vi.spyOn(authRepository, 'createUser').mockResolvedValue(testUserWithPassword);
    vi.spyOn(authRepository, 'deleteUser').mockResolvedValue(undefined);

    // Mock interaction service
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
    expect(authRepository.listAllUsers).toHaveBeenCalledWith(mockDb);

    const users = res.json();
    expect(users).toHaveLength(3);
    expect(users[0].email).toBe(adminUser.email);
    expect(users[1].email).toBe('user1@test.com');
    expect(users[2].email).toBe('user2@test.com');
    // Should not include password hash
    expect(users[0].passwordHash).toBeUndefined();
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
    expect(authRepository.createUser).toHaveBeenCalledWith(mockDb, newUser);

    const created = res.json();
    expect(created.email).toBe(testUser1.email);
  });

  it('should delete a user', async () => {
    const userId = 123;
    const res = await app.inject({ method: 'DELETE', url: `/users/${userId}` });

    expect(res.statusCode).toBe(200);
    expect(authRepository.deleteUser).toHaveBeenCalledWith(mockDb, userId, adminUser.id);
  });

  it('should return all interactions (admin)', async () => {
    const res = await app.inject({ method: 'GET', url: '/interactions' });

    expect(res.statusCode).toBe(200);
    expect(interactionService.getAllInteractionsEnriched).toHaveBeenCalled();
  });
});
