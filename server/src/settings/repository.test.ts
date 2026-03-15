import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase, type DB } from '../db/setup.js';
import {
  getSetting,
  setSetting,
  getRadarrSettings,
  setRadarrSettings,
  getSonarrSettings,
  setSonarrSettings,
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
      expect(await getSetting(db, 'nonexistent')).toBeNull();
    });

    it('should set and retrieve a value', async () => {
      await setSetting(db, 'test.key', 'hello');
      expect(await getSetting(db, 'test.key')).toBe('hello');
    });

    it('should upsert (overwrite) an existing value', async () => {
      await setSetting(db, 'test.key', 'first');
      await setSetting(db, 'test.key', 'second');
      expect(await getSetting(db, 'test.key')).toBe('second');
    });
  });

  describe('getRadarrSettings / setRadarrSettings', () => {
    it('should return null values when not set', async () => {
      const settings = await getRadarrSettings(db);
      expect(settings.qualityProfileId).toBeNull();
      expect(settings.rootFolderPath).toBeNull();
    });

    it('should set and retrieve radarr settings', async () => {
      await setRadarrSettings(db, { qualityProfileId: 4, rootFolderPath: '/movies' });
      const settings = await getRadarrSettings(db);
      expect(settings.qualityProfileId).toBe(4);
      expect(settings.rootFolderPath).toBe('/movies');
    });

    it('should partially update radarr settings without clearing other keys', async () => {
      await setRadarrSettings(db, { qualityProfileId: 1, rootFolderPath: '/movies' });
      await setRadarrSettings(db, { qualityProfileId: 2 });
      const settings = await getRadarrSettings(db);
      expect(settings.qualityProfileId).toBe(2);
      expect(settings.rootFolderPath).toBe('/movies');
    });
  });

  describe('getSonarrSettings / setSonarrSettings', () => {
    it('should return null values when not set', async () => {
      const settings = await getSonarrSettings(db);
      expect(settings.qualityProfileId).toBeNull();
      expect(settings.rootFolderPath).toBeNull();
    });

    it('should set and retrieve sonarr settings', async () => {
      await setSonarrSettings(db, { qualityProfileId: 3, rootFolderPath: '/tv' });
      const settings = await getSonarrSettings(db);
      expect(settings.qualityProfileId).toBe(3);
      expect(settings.rootFolderPath).toBe('/tv');
    });

    it('should partially update sonarr settings without clearing other keys', async () => {
      await setSonarrSettings(db, { qualityProfileId: 1, rootFolderPath: '/tv' });
      await setSonarrSettings(db, { rootFolderPath: '/data/tv' });
      const settings = await getSonarrSettings(db);
      expect(settings.qualityProfileId).toBe(1);
      expect(settings.rootFolderPath).toBe('/data/tv');
    });

    it('should maintain radarr settings independently from sonarr', async () => {
      await setRadarrSettings(db, { qualityProfileId: 1, rootFolderPath: '/movies' });
      await setSonarrSettings(db, { qualityProfileId: 2, rootFolderPath: '/tv' });
      const radarr = await getRadarrSettings(db);
      const sonarr = await getSonarrSettings(db);
      expect(radarr.rootFolderPath).toBe('/movies');
      expect(sonarr.rootFolderPath).toBe('/tv');
    });
  });
});
