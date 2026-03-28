import type { CreateUser } from '@findarr/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { arrConfig } from '../arr/config.js';
import type { ArrService } from '../arr/service.js';
import * as authRepository from '../auth/repository.js';
import * as interactionService from '../interaction/service.js';
import * as settingsRepository from '../settings/repository.js';
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
        tvdbId: null,
        arrId: null,
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
      findByExternalId: vi.fn(),
    });

    // Mock arr services (Radarr and Sonarr)
    app.decorate('radarr', {
      config: arrConfig.radarr,
      isConfigured: vi.fn().mockResolvedValue(true),
      testConnection: vi.fn().mockResolvedValue(false),
      request: vi.fn(),
      getProfiles: vi.fn().mockResolvedValue([]),
      getRootFolders: vi.fn().mockResolvedValue([]),
      getLibrary: vi.fn().mockResolvedValue([]),
      getQueue: vi.fn().mockResolvedValue({ records: [] }),
    } satisfies ArrService<typeof arrConfig.radarr>);

    app.decorate('sonarr', {
      config: arrConfig.sonarr,
      isConfigured: vi.fn().mockResolvedValue(true),
      testConnection: vi.fn().mockResolvedValue(false),
      request: vi.fn(),
      getProfiles: vi.fn().mockResolvedValue([]),
      getRootFolders: vi.fn().mockResolvedValue([]),
      getLibrary: vi.fn().mockResolvedValue([]),
      getQueue: vi.fn().mockResolvedValue({ records: [] }),
    } satisfies ArrService<typeof arrConfig.sonarr>);

    // Mock jellyfin service
    app.decorate('jellyfin', {
      isConfigured: vi.fn().mockResolvedValue(true),
      testConnection: vi.fn().mockResolvedValue(false),
      getConnectionInfo: vi
        .fn()
        .mockResolvedValue({ url: null, connected: false, apiKeySet: false }),
      getAllMedia: vi.fn().mockResolvedValue([]),
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

  describe('Radarr settings', () => {
    beforeEach(() => {
      vi.spyOn(settingsRepository, 'getRadarrSettings').mockResolvedValue({
        radarrUrl: 'http://radarr:7878',
        radarrApiKeySet: true,
        radarrQualityProfileId: null,
        radarrRootFolderPath: null,
      });
      vi.spyOn(settingsRepository, 'setRadarrSettings').mockResolvedValue(undefined);
    });

    it('should get Radarr settings', async () => {
      const res = await app.inject({ method: 'GET', url: '/radarr/settings' });

      expect(res.statusCode).toBe(200);
      expect(settingsRepository.getRadarrSettings).toHaveBeenCalledWith(mockDb);
      const settings = res.json();
      expect(settings.radarrUrl).toBe('http://radarr:7878');
      expect(settings.radarrApiKeySet).toBe(true);
    });

    it('should update Radarr settings', async () => {
      const newSettings = {
        radarrUrl: 'http://new-radarr:7878',
        radarrApiKey: 'new-api-key',
      };

      const res = await app.inject({
        method: 'PUT',
        url: '/radarr/settings',
        payload: newSettings,
      });

      expect(res.statusCode).toBe(200);
      expect(settingsRepository.setRadarrSettings).toHaveBeenCalledWith(mockDb, newSettings);
      expect(settingsRepository.getRadarrSettings).toHaveBeenCalled();
    });

    it('should test Radarr connection', async () => {
      vi.mocked(app.radarr.testConnection).mockResolvedValue(true);

      const res = await app.inject({ method: 'POST', url: '/radarr/test' });

      expect(res.statusCode).toBe(200);
      const result = res.json();
      expect(result.configured).toBe(true);
      expect(result.connected).toBe(true);
      expect(result.url).toBe('http://radarr:7878');
    });
  });

  describe('Sonarr settings', () => {
    beforeEach(() => {
      vi.spyOn(settingsRepository, 'getSonarrSettings').mockResolvedValue({
        sonarrUrl: 'http://sonarr:8989',
        sonarrApiKeySet: true,
        sonarrQualityProfileId: null,
        sonarrRootFolderPath: null,
      });
      vi.spyOn(settingsRepository, 'setSonarrSettings').mockResolvedValue(undefined);
    });

    it('should get Sonarr settings', async () => {
      const res = await app.inject({ method: 'GET', url: '/sonarr/settings' });

      expect(res.statusCode).toBe(200);
      expect(settingsRepository.getSonarrSettings).toHaveBeenCalledWith(mockDb);
      const settings = res.json();
      expect(settings.sonarrUrl).toBe('http://sonarr:8989');
      expect(settings.sonarrApiKeySet).toBe(true);
    });

    it('should update Sonarr settings', async () => {
      const newSettings = {
        sonarrUrl: 'http://new-sonarr:8989',
        sonarrApiKey: 'new-api-key',
      };

      const res = await app.inject({
        method: 'PUT',
        url: '/sonarr/settings',
        payload: newSettings,
      });

      expect(res.statusCode).toBe(200);
      expect(settingsRepository.setSonarrSettings).toHaveBeenCalledWith(mockDb, newSettings);
      expect(settingsRepository.getSonarrSettings).toHaveBeenCalled();
    });

    it('should test Sonarr connection', async () => {
      vi.mocked(app.sonarr.testConnection).mockResolvedValue(true);

      const res = await app.inject({ method: 'POST', url: '/sonarr/test' });

      expect(res.statusCode).toBe(200);
      const result = res.json();
      expect(result.configured).toBe(true);
      expect(result.connected).toBe(true);
      expect(result.url).toBe('http://sonarr:8989');
    });
  });

  describe('Jellyfin settings', () => {
    beforeEach(() => {
      vi.spyOn(settingsRepository, 'getJellyfinSettings').mockResolvedValue({
        jellyfinUrl: 'http://jellyfin:8096',
        jellyfinApiKeySet: true,
      });
      vi.spyOn(settingsRepository, 'setJellyfinSettings').mockResolvedValue(undefined);
    });

    it('should get Jellyfin settings', async () => {
      const res = await app.inject({ method: 'GET', url: '/jellyfin/settings' });

      expect(res.statusCode).toBe(200);
      expect(settingsRepository.getJellyfinSettings).toHaveBeenCalledWith(mockDb);
      const settings = res.json();
      expect(settings.jellyfinUrl).toBe('http://jellyfin:8096');
      expect(settings.jellyfinApiKeySet).toBe(true);
    });

    it('should update Jellyfin settings', async () => {
      const newSettings = {
        jellyfinUrl: 'http://new-jellyfin:8096',
        jellyfinApiKey: 'new-api-key',
      };

      const res = await app.inject({
        method: 'PUT',
        url: '/jellyfin/settings',
        payload: newSettings,
      });

      expect(res.statusCode).toBe(200);
      expect(settingsRepository.setJellyfinSettings).toHaveBeenCalledWith(mockDb, newSettings);
      expect(settingsRepository.getJellyfinSettings).toHaveBeenCalled();
    });

    it('should test Jellyfin connection', async () => {
      vi.mocked(app.jellyfin.getConnectionInfo).mockResolvedValue({
        url: 'http://jellyfin:8096',
        connected: true,
        apiKeySet: true,
      });

      const res = await app.inject({ method: 'POST', url: '/jellyfin/test' });

      expect(res.statusCode).toBe(200);
      const result = res.json();
      expect(result.url).toBe('http://jellyfin:8096');
      expect(result.connected).toBe(true);
      expect(result.apiKeySet).toBe(true);
    });
  });
});
