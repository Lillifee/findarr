import type { AdministrationSettings, AdministrationSettingsQuery } from '@findarr/shared/settings';

import type { Database } from '../db/service.js';
import { readSettings, writeSettings } from './repository.js';

const COMMUNITY_VOTE_THRESHOLD_KEY = 'communityVoteThreshold';
const DEFAULT_COMMUNITY_VOTE_THRESHOLD = 1;

export function createAdministrationService(db: Database) {
  let cachedAdministrationSettings: AdministrationSettings | undefined;

  async function getSettings(): Promise<AdministrationSettings> {
    if (cachedAdministrationSettings !== undefined) {
      return cachedAdministrationSettings;
    }

    const settings = await readSettings(db, [COMMUNITY_VOTE_THRESHOLD_KEY]);
    const voteThreshold = Number(settings[COMMUNITY_VOTE_THRESHOLD_KEY]);

    cachedAdministrationSettings = {
      voteThreshold:
        Number.isInteger(voteThreshold) && voteThreshold >= 1
          ? voteThreshold
          : DEFAULT_COMMUNITY_VOTE_THRESHOLD,
    };

    return cachedAdministrationSettings;
  }

  async function saveSettings(
    settings: AdministrationSettingsQuery,
  ): Promise<AdministrationSettings> {
    await writeSettings(db, {
      [COMMUNITY_VOTE_THRESHOLD_KEY]: String(settings.voteThreshold),
    });

    cachedAdministrationSettings = undefined;

    return getSettings();
  }

  return { getSettings, saveSettings };
}

export type AdministrationService = ReturnType<typeof createAdministrationService>;

export { COMMUNITY_VOTE_THRESHOLD_KEY, DEFAULT_COMMUNITY_VOTE_THRESHOLD };
