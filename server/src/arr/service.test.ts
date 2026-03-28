import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Mock client factory BEFORE importing service (which imports it)
vi.mock('./client.js', () => ({
  createArrClient: vi.fn(),
}));
import { createDatabase, type DB } from '../db/setup.js';
import type { SchedulerService } from '../scheduler/service.js';
import { setRadarrSettings, setSonarrSettings } from '../settings/repository.js';
import { createArrClient } from './client.js';
import { arrConfig } from './config.js';
import { createArrService } from './service.js';

describe('arr service', () => {
  let db: DB;
  let sqliteDb: SqlDatabase.Database;

  const mockRadarrClient = {
    testConnection: vi.fn().mockResolvedValue(true),
    getQualityProfiles: vi.fn().mockResolvedValue([{ id: 1, name: 'HD-1080p' }]),
    getRootFolders: vi.fn().mockResolvedValue([{ id: 1, path: '/movies' }]),
    getQueue: vi.fn().mockResolvedValue({ records: [] }),
    requestMedia: vi.fn().mockResolvedValue({ id: 100, tmdbId: 123, title: 'Batman Begins' }),
    getLibrary: vi.fn().mockResolvedValue([]),
  };

  const mockSonarrClient = {
    testConnection: vi.fn().mockResolvedValue(true),
    getQualityProfiles: vi.fn().mockResolvedValue([{ id: 2, name: 'HD-1080p' }]),
    getRootFolders: vi.fn().mockResolvedValue([{ id: 1, path: '/tv' }]),
    getQueue: vi.fn().mockResolvedValue({ records: [] }),
    requestMedia: vi.fn().mockResolvedValue({ id: 200, tvdbId: 81_189, title: 'Breaking Bad' }),
    getLibrary: vi.fn().mockResolvedValue([]),
  };

  const schedulerService: SchedulerService = {
    start: vi.fn(),
    stop: vi.fn(),
    trigger: vi.fn(),
    getState: vi.fn(),
    startOrchestration: vi.fn(),
    stopOrchestration: vi.fn(),
  };

  // Mock FastifyInstance with scheduler
  const mockFastify = {
    scheduler: schedulerService,
  } as any;

  beforeEach(() => {
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;
    vi.clearAllMocks();
    // Default: mock factory returns appropriate client based on config service type
    vi.mocked(createArrClient).mockImplementation((config, _baseUrl, _apiKey) =>
      config.service === 'radarr' ? mockRadarrClient : mockSonarrClient
    );
  });

  afterEach(() => {
    sqliteDb.close();
  });

  // Helpers to seed connection config into the DB
  async function configureRadarr() {
    await setRadarrSettings(db, { radarrUrl: 'http://radarr:7878', radarrApiKey: 'radarr-key' });
  }
  async function configureSonarr() {
    await setSonarrSettings(db, { sonarrUrl: 'http://sonarr:8989', sonarrApiKey: 'sonarr-key' });
  }

  // ========== RADARR TESTS ==========

  describe('radarr - testConnection', () => {
    it('should return false when radarr is not configured in DB', async () => {
      const service = createArrService(db, arrConfig.radarr, mockFastify);
      expect(await service.testConnection()).toBe(false);
    });

    it('should delegate testConnection to radarr client when configured', async () => {
      await configureRadarr();
      const service = createArrService(db, arrConfig.radarr, mockFastify);
      expect(await service.testConnection()).toBe(true);
      expect(mockRadarrClient.testConnection).toHaveBeenCalledOnce();
    });
  });

  describe('radarr - getProfiles / getRootFolders', () => {
    it('should return empty arrays when radarr is not configured', async () => {
      const service = createArrService(db, arrConfig.radarr, mockFastify);
      expect(await service.getProfiles()).toEqual([]);
      expect(await service.getRootFolders()).toEqual([]);
    });

    it('should delegate to radarr client when configured', async () => {
      await configureRadarr();
      const service = createArrService(db, arrConfig.radarr, mockFastify);
      expect(await service.getProfiles()).toEqual([{ id: 1, name: 'HD-1080p' }]);
      expect(await service.getRootFolders()).toEqual([{ id: 1, path: '/movies' }]);
    });
  });

  describe('radarr - getLibrary', () => {
    it('should delegate getLibrary to radarr client when configured', async () => {
      await setRadarrSettings(db, {
        radarrUrl: 'http://radarr:7878',
        radarrApiKey: 'radarr-key',
        radarrQualityProfileId: 1,
        radarrRootFolderPath: '/movies',
      });
      // Mock returns schema-transformed data (with type field from RadarrMovieSchema.transform)
      vi.mocked(mockRadarrClient.getLibrary).mockResolvedValue([
        {
          id: 1,
          tmdbId: 123,
          title: 'Batman Begins',
          monitored: true,
          hasFile: false,
          type: 'movie',
        },
      ]);

      const service = createArrService(db, arrConfig.radarr, mockFastify);
      const library = await service.getLibrary();

      // Service transforms to ArrLibraryItem format
      expect(library).toEqual([
        {
          id: 1,
          type: 'movie',
          tmdbId: 123,
          title: 'Batman Begins',
          monitored: true,
          hasFile: false,
          year: undefined,
        },
      ]);
      expect(mockRadarrClient.getLibrary).toHaveBeenCalledOnce();
    });
  });

  describe('radarr - getQueue', () => {
    it('should return empty records when radarr is not configured', async () => {
      const service = createArrService(db, arrConfig.radarr, mockFastify);
      expect(await service.getQueue()).toEqual({ records: [] });
    });

    it('should delegate getQueue to radarr client when configured', async () => {
      await configureRadarr();
      vi.mocked(mockRadarrClient.getQueue).mockResolvedValue({
        records: [
          {
            id: 1,
            type: 'movie',
            arrId: 100,
            title: 'Batman Begins',
            status: 'downloading',
          },
        ],
      });

      const service = createArrService(db, arrConfig.radarr, mockFastify);
      const queue = await service.getQueue();

      expect(queue.records).toHaveLength(1);
      expect(queue.records[0]?.title).toBe('Batman Begins');
      expect(mockRadarrClient.getQueue).toHaveBeenCalledOnce();
    });
  });

  // ========== SONARR TESTS ==========

  describe('sonarr - testConnection', () => {
    it('should return false when sonarr is not configured in DB', async () => {
      const service = createArrService(db, arrConfig.sonarr, mockFastify);
      expect(await service.testConnection()).toBe(false);
    });

    it('should delegate testConnection to sonarr client when configured', async () => {
      await configureSonarr();
      const service = createArrService(db, arrConfig.sonarr, mockFastify);
      expect(await service.testConnection()).toBe(true);
      expect(mockSonarrClient.testConnection).toHaveBeenCalledOnce();
    });
  });

  describe('sonarr - getProfiles / getRootFolders', () => {
    it('should return empty arrays when sonarr is not configured', async () => {
      const service = createArrService(db, arrConfig.sonarr, mockFastify);
      expect(await service.getProfiles()).toEqual([]);
      expect(await service.getRootFolders()).toEqual([]);
    });

    it('should delegate to sonarr client when configured', async () => {
      await configureSonarr();
      const service = createArrService(db, arrConfig.sonarr, mockFastify);
      expect(await service.getProfiles()).toEqual([{ id: 2, name: 'HD-1080p' }]);
      expect(await service.getRootFolders()).toEqual([{ id: 1, path: '/tv' }]);
    });
  });

  describe('sonarr - getLibrary', () => {
    it('should delegate getLibrary to sonarr client when configured', async () => {
      await setSonarrSettings(db, {
        sonarrUrl: 'http://sonarr:8989',
        sonarrApiKey: 'sonarr-key',
        sonarrQualityProfileId: 2,
        sonarrRootFolderPath: '/tv',
      });
      // Mock returns schema-transformed data (with type field from SonarrSeriesSchema.transform)
      vi.mocked(mockSonarrClient.getLibrary).mockResolvedValue([
        { id: 1, tvdbId: 81_189, title: 'Breaking Bad', monitored: true, type: 'tv' },
      ]);

      const service = createArrService(db, arrConfig.sonarr, mockFastify);
      const library = await service.getLibrary();

      // Service transforms to ArrLibraryItem format
      expect(library).toEqual([
        {
          id: 1,
          type: 'tv',
          tvdbId: 81_189,
          title: 'Breaking Bad',
          monitored: true,
          hasFile: false,
          year: undefined,
        },
      ]);
      expect(mockSonarrClient.getLibrary).toHaveBeenCalledOnce();
    });
  });

  describe('sonarr - getQueue', () => {
    it('should return empty records when sonarr is not configured', async () => {
      const service = createArrService(db, arrConfig.sonarr, mockFastify);
      expect(await service.getQueue()).toEqual({ records: [] });
    });

    it('should delegate getQueue to sonarr client when configured', async () => {
      await configureSonarr();
      vi.mocked(mockSonarrClient.getQueue).mockResolvedValue({
        records: [{ id: 1, type: 'tv', arrId: 200, title: 'Breaking Bad', status: 'downloading' }],
      });

      const service = createArrService(db, arrConfig.sonarr, mockFastify);
      const queue = await service.getQueue();

      expect(queue.records).toHaveLength(1);
      expect(queue.records[0]?.title).toBe('Breaking Bad');
      expect(mockSonarrClient.getQueue).toHaveBeenCalledOnce();
    });
  });
});
