import {
  TmdbSettingsQuerySchema,
  type TmdbSettings,
  type TmdbSettingsQuery,
} from '@findarr/shared/settings';
import { isDefined, objectKeys } from '@findarr/shared/utils';

import type { Database } from '../db/service.js';
import { readSettings, writeSettings } from '../settings/repository.js';

export type TmdbSettingsFull = TmdbSettings & { tmdbAccessToken: string | null };

const tmdbKeys = objectKeys(TmdbSettingsQuerySchema.shape);

export async function setTmdbSettings(db: Database, settings: TmdbSettingsQuery): Promise<void> {
  await writeSettings(db, settings);
}

export async function getTmdbSettingsFull(db: Database): Promise<TmdbSettingsFull> {
  const settingsValues = await readSettings(db, tmdbKeys);
  return {
    tmdbAccessTokenSet: isDefined(settingsValues.tmdbAccessToken),
    tmdbAccessToken: settingsValues.tmdbAccessToken,
  };
}

export async function getTmdbSettings(db: Database): Promise<TmdbSettings> {
  const { tmdbAccessToken: _tmdbAccessToken, ...settings } = await getTmdbSettingsFull(db);
  return settings;
}
