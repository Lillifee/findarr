import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase, type DB } from '../db/setup.js';
import {
  getSetting,
  setSetting,
  write,
  getRadarrSettings,
  getSonarrSettings,
} from './repository.js';

describe('settings repository', () => {
  let db: DB;
  let sqliteDb: SqlDatabase.Database;

  beforeEach(() => {
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;
  });

  afterEach(() => {
    sqliteDb.close();
  });

  describe('getSetting / setSetting', () => {
    it('should return null for a missing key', async () => {
      expect(await getSetting(db, 'radarrUrl')).toBeNull();
    });

    it('should set and retrieve a value', async () => {
      await setSetting(db, 'radarrUrl', 'hello');
      expect(await getSetting(db, 'radarrUrl')).toBe('hello');
    });

    it('should upsert (overwrite) an existing value', async () => {
      await setSetting(db, 'radarrUrl', 'first');
      await setSetting(db, 'radarrUrl', 'second');
      expect(await getSetting(db, 'radarrUrl')).toBe('second');
    });
  });

  describe('getRadarrSettings', () => {
    it('should return null values when not set', async () => {
      const settings = await getRadarrSettings(db);
      expect(settings.radarrQualityProfileId).toBeNull();
      expect(settings.radarrRootFolderPath).toBeNull();
    });

    it('should set and retrieve radarr settings', async () => {
      await write(db, { radarrQualityProfileId: '4', radarrRootFolderPath: '/movies' });
      const settings = await getRadarrSettings(db);
      expect(settings.radarrQualityProfileId).toBe(4);
      expect(settings.radarrRootFolderPath).toBe('/movies');
    });

    it('should partially update radarr settings without clearing other keys', async () => {
      await write(db, { radarrQualityProfileId: '1', radarrRootFolderPath: '/movies' });
      await write(db, { radarrQualityProfileId: '2' });
      const settings = await getRadarrSettings(db);
      expect(settings.radarrQualityProfileId).toBe(2);
      expect(settings.radarrRootFolderPath).toBe('/movies');
    });
  });

  describe('getSonarrSettings', () => {
    it('should return null values when not set', async () => {
      const settings = await getSonarrSettings(db);
      expect(settings.sonarrQualityProfileId).toBeNull();
      expect(settings.sonarrRootFolderPath).toBeNull();
    });

    it('should set and retrieve sonarr settings', async () => {
      await write(db, { sonarrQualityProfileId: '3', sonarrRootFolderPath: '/tv' });
      const settings = await getSonarrSettings(db);
      expect(settings.sonarrQualityProfileId).toBe(3);
      expect(settings.sonarrRootFolderPath).toBe('/tv');
    });

    it('should partially update sonarr settings without clearing other keys', async () => {
      await write(db, { sonarrQualityProfileId: '1', sonarrRootFolderPath: '/tv' });
      await write(db, { sonarrRootFolderPath: '/data/tv' });
      const settings = await getSonarrSettings(db);
      expect(settings.sonarrQualityProfileId).toBe(1);
      expect(settings.sonarrRootFolderPath).toBe('/data/tv');
    });

    it('should maintain radarr settings independently from sonarr', async () => {
      await write(db, { radarrQualityProfileId: '1', radarrRootFolderPath: '/movies' });
      await write(db, { sonarrQualityProfileId: '2', sonarrRootFolderPath: '/tv' });
      const radarr = await getRadarrSettings(db);
      const sonarr = await getSonarrSettings(db);
      expect(radarr.radarrRootFolderPath).toBe('/movies');
      expect(sonarr.sonarrRootFolderPath).toBe('/tv');
    });
  });
});
