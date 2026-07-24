import type { AdministrationSettings, AdministrationSettingsQuery } from '@findarr/shared/settings';

import type { Database } from '../db/service.js';
import { writeSettings } from './repository.js';

const COMMUNITY_VOTE_THRESHOLD_KEY = 'communityVoteThreshold';
const DEFAULT_COMMUNITY_VOTE_THRESHOLD = 1;

function createAdministrationSettingsHelpers(
  getSetting: (key: string) => Promise<string | undefined>,
  setSettings: (values: Partial<Record<string, string | undefined>>) => Promise<void>,
) {
  async function get(): Promise<AdministrationSettings> {
    const voteThreshold = Number(await getSetting(COMMUNITY_VOTE_THRESHOLD_KEY));

    return {
      voteThreshold:
        Number.isInteger(voteThreshold) && voteThreshold >= 1
          ? voteThreshold
          : DEFAULT_COMMUNITY_VOTE_THRESHOLD,
    };
  }

  async function set(settings: AdministrationSettingsQuery): Promise<AdministrationSettings> {
    await setSettings({
      [COMMUNITY_VOTE_THRESHOLD_KEY]: String(settings.voteThreshold),
    });

    return get();
  }

  return { get, set };
}

export function createSettingsService(db: Database) {
  let cachedSettings: Record<string, string> | undefined;

  async function getAll(): Promise<Record<string, string>> {
    if (cachedSettings !== undefined) {
      return cachedSettings;
    }

    const rows = await db.query.appSettings.findMany();
    cachedSettings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return cachedSettings;
  }

  async function get(key: string): Promise<string | undefined> {
    const settings = await getAll();
    return settings[key];
  }

  async function set(values: Partial<Record<string, string | undefined>>): Promise<void> {
    await writeSettings(db, values);
    cachedSettings = undefined;
  }

  const administration = createAdministrationSettingsHelpers(get, set);

  return {
    getAll,
    get,
    set,
    administration,
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;
