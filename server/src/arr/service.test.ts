import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Mock client factories BEFORE importing service (which imports them)
vi.mock('./client.js', () => ({
  createRadarrClient: vi.fn(),
  createSonarrClient: vi.fn(),
}));
import { createDatabase, type DB } from '../db/setup.js';
import { setRadarrSettings, setSonarrSettings } from '../settings/repository.js';
import {
  createRadarrClient,
  createSonarrClient,
  type RadarrClient,
  type SonarrClient,
} from './client.js';
import { createArrService } from './service.js';

describe('arr service', () => {
  let db: DB;
  let sqliteDb: SqlDatabase.Database;

  const mockRadarrClient: RadarrClient = {
    testConnection: vi.fn().mockResolvedValue(true),
    getQualityProfiles: vi.fn().mockResolvedValue([{ id: 1, name: 'HD-1080p' }]),
    getRootFolders: vi.fn().mockResolvedValue([{ id: 1, path: '/movies' }]),
    getQueue: vi.fn().mockResolvedValue({ records: [] }),
    addMovie: vi.fn().mockResolvedValue({ id: 100, tmdbId: 123, title: 'Batman Begins' }),
    getMovies: vi.fn().mockResolvedValue([]),
  };

  const mockSonarrClient: SonarrClient = {
    testConnection: vi.fn().mockResolvedValue(true),
    getQualityProfiles: vi.fn().mockResolvedValue([{ id: 2, name: 'HD-1080p' }]),
    getRootFolders: vi.fn().mockResolvedValue([{ id: 1, path: '/tv' }]),
    getQueue: vi.fn().mockResolvedValue({ records: [] }),
    addSeries: vi.fn().mockResolvedValue({ id: 200, tvdbId: 81_189, title: 'Breaking Bad' }),
    getSeries: vi.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;
    vi.clearAllMocks();
    // Default: mock factories return the respective mock clients
    vi.mocked(createRadarrClient).mockReturnValue(mockRadarrClient);
    vi.mocked(createSonarrClient).mockReturnValue(mockSonarrClient);
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

  describe('testRadarrConnection / testSonarrConnection', () => {
    it('should return false when radarr is not configured in DB', async () => {
      const service = createArrService(db);
      expect(await service.testRadarrConnection()).toBe(false);
    });

    it('should delegate testConnection to radarr client when configured', async () => {
      await configureRadarr();
      const service = createArrService(db);
      expect(await service.testRadarrConnection()).toBe(true);
      expect(mockRadarrClient.testConnection).toHaveBeenCalledOnce();
    });

    it('should return false when sonarr is not configured in DB', async () => {
      const service = createArrService(db);
      expect(await service.testSonarrConnection()).toBe(false);
    });

    it('should delegate testConnection to sonarr client when configured', async () => {
      await configureSonarr();
      const service = createArrService(db);
      expect(await service.testSonarrConnection()).toBe(true);
      expect(mockSonarrClient.testConnection).toHaveBeenCalledOnce();
    });
  });

  describe('requestMovie', () => {
    it('should return empty object when radarr is not configured in DB', async () => {
      const service = createArrService(db);
      const result = await service.requestMovie(123, 'Batman Begins');
      expect(result).toEqual({});
    });

    it('should return empty object when radarr quality profile/folder are not set', async () => {
      await configureRadarr();
      const service = createArrService(db);
      const result = await service.requestMovie(123, 'Batman Begins');
      expect(result).toEqual({});
    });

    it('should call addMovie with correct params from DB settings', async () => {
      await setRadarrSettings(db, {
        radarrUrl: 'http://radarr:7878',
        radarrApiKey: 'radarr-key',
        radarrQualityProfileId: 4,
        radarrRootFolderPath: '/movies',
      });
      const service = createArrService(db);

      await service.requestMovie(123, 'Batman Begins');

      expect(mockRadarrClient.addMovie).toHaveBeenCalledWith({
        tmdbId: 123,
        title: 'Batman Begins',
        qualityProfileId: 4,
        rootFolderPath: '/movies',
      });
    });

    it('should propagate errors from radarr client', async () => {
      await setRadarrSettings(db, {
        radarrUrl: 'http://radarr:7878',
        radarrApiKey: 'radarr-key',
        radarrQualityProfileId: 1,
        radarrRootFolderPath: '/movies',
      });
      vi.mocked(mockRadarrClient.addMovie).mockRejectedValueOnce(new Error('Radarr API error'));
      const service = createArrService(db);

      await expect(service.requestMovie(123, 'Batman Begins')).rejects.toThrow('Radarr API error');
    });
  });

  describe('requestSeries', () => {
    it('should return empty object when sonarr is not configured in DB', async () => {
      const service = createArrService(db);
      const result = await service.requestSeries(81_189, 'Breaking Bad');
      expect(result).toEqual({});
    });

    it('should return empty object when sonarr quality profile/folder are not set', async () => {
      await configureSonarr();
      const service = createArrService(db);
      const result = await service.requestSeries(81_189, 'Breaking Bad');
      expect(result).toEqual({});
    });

    it('should call addSeries with correct params from DB settings', async () => {
      await setSonarrSettings(db, {
        sonarrUrl: 'http://sonarr:8989',
        sonarrApiKey: 'sonarr-key',
        sonarrQualityProfileId: 2,
        sonarrRootFolderPath: '/tv',
      });
      const service = createArrService(db);

      await service.requestSeries(81_189, 'Breaking Bad');

      expect(mockSonarrClient.addSeries).toHaveBeenCalledWith({
        tvdbId: 81_189,
        title: 'Breaking Bad',
        qualityProfileId: 2,
        rootFolderPath: '/tv',
      });
    });

    it('should propagate errors from sonarr client', async () => {
      await setSonarrSettings(db, {
        sonarrUrl: 'http://sonarr:8989',
        sonarrApiKey: 'sonarr-key',
        sonarrQualityProfileId: 2,
        sonarrRootFolderPath: '/tv',
      });
      vi.mocked(mockSonarrClient.addSeries).mockRejectedValueOnce(new Error('Sonarr API error'));
      const service = createArrService(db);

      await expect(service.requestSeries(81_189, 'Breaking Bad')).rejects.toThrow(
        'Sonarr API error'
      );
    });
  });

  describe('getRadarrProfiles / getRadarrRootFolders', () => {
    it('should return empty arrays when radarr is not configured', async () => {
      const service = createArrService(db);
      expect(await service.getRadarrProfiles()).toEqual([]);
      expect(await service.getRadarrRootFolders()).toEqual([]);
    });

    it('should delegate to radarr client when configured', async () => {
      await configureRadarr();
      const service = createArrService(db);
      expect(await service.getRadarrProfiles()).toEqual([{ id: 1, name: 'HD-1080p' }]);
      expect(await service.getRadarrRootFolders()).toEqual([{ id: 1, path: '/movies' }]);
    });
  });

  describe('getSonarrProfiles / getSonarrRootFolders', () => {
    it('should return empty arrays when sonarr is not configured', async () => {
      const service = createArrService(db);
      expect(await service.getSonarrProfiles()).toEqual([]);
      expect(await service.getSonarrRootFolders()).toEqual([]);
    });

    it('should delegate to sonarr client when configured', async () => {
      await configureSonarr();
      const service = createArrService(db);
      expect(await service.getSonarrProfiles()).toEqual([{ id: 2, name: 'HD-1080p' }]);
      expect(await service.getSonarrRootFolders()).toEqual([{ id: 1, path: '/tv' }]);
    });
  });

  describe('getRadarrMovies / getSonarrSeries', () => {
    it('should delegate getRadarrMovies to radarr client when configured', async () => {
      await setRadarrSettings(db, {
        radarrUrl: 'http://radarr:7878',
        radarrApiKey: 'radarr-key',
        radarrQualityProfileId: 1,
        radarrRootFolderPath: '/movies',
      });
      vi.mocked(mockRadarrClient.getMovies).mockResolvedValue([
        { id: 1, tmdbId: 123, title: 'Batman Begins', monitored: true, hasFile: false },
      ]);

      const service = createArrService(db);
      const movies = await service.getRadarrMovies();

      expect(movies).toEqual([
        { id: 1, tmdbId: 123, title: 'Batman Begins', monitored: true, hasFile: false },
      ]);
      expect(mockRadarrClient.getMovies).toHaveBeenCalledOnce();
    });

    it('should delegate getSonarrSeries to sonarr client when configured', async () => {
      await setSonarrSettings(db, {
        sonarrUrl: 'http://sonarr:8989',
        sonarrApiKey: 'sonarr-key',
        sonarrQualityProfileId: 2,
        sonarrRootFolderPath: '/tv',
      });
      vi.mocked(mockSonarrClient.getSeries).mockResolvedValue([
        { id: 1, tvdbId: 81_189, title: 'Breaking Bad', monitored: true },
      ]);

      const service = createArrService(db);
      const series = await service.getSonarrSeries();

      expect(series).toEqual([{ id: 1, tvdbId: 81_189, title: 'Breaking Bad', monitored: true }]);
      expect(mockSonarrClient.getSeries).toHaveBeenCalledOnce();
    });
  });

  describe('getRadarrQueue / getSonarrQueue', () => {
    it('should return empty records when radarr is not configured', async () => {
      const service = createArrService(db);
      expect(await service.getRadarrQueue()).toEqual({ records: [] });
    });

    it('should delegate getRadarrQueue to radarr client when configured', async () => {
      await configureRadarr();
      vi.mocked(mockRadarrClient.getQueue).mockResolvedValue({
        records: [{ id: 1, movieId: 100, title: 'Batman Begins', status: 'downloading' }],
      });

      const service = createArrService(db);
      const queue = await service.getRadarrQueue();

      expect(queue.records).toHaveLength(1);
      expect(queue.records[0]?.title).toBe('Batman Begins');
      expect(mockRadarrClient.getQueue).toHaveBeenCalledOnce();
    });

    it('should return empty records when sonarr is not configured', async () => {
      const service = createArrService(db);
      expect(await service.getSonarrQueue()).toEqual({ records: [] });
    });

    it('should delegate getSonarrQueue to sonarr client when configured', async () => {
      await configureSonarr();
      vi.mocked(mockSonarrClient.getQueue).mockResolvedValue({
        records: [{ id: 1, seriesId: 200, title: 'Breaking Bad', status: 'downloading' }],
      });

      const service = createArrService(db);
      const queue = await service.getSonarrQueue();

      expect(queue.records).toHaveLength(1);
      expect(queue.records[0]?.title).toBe('Breaking Bad');
      expect(mockSonarrClient.getQueue).toHaveBeenCalledOnce();
    });
  });
});
