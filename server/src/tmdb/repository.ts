import type { TmdbSettings, TmdbSettingsQuery } from '@findarr/shared';
import { TmdbSettingsQuerySchema } from '@findarr/shared';

import type { Database } from '../db/service.js';
import { readSettings, writeSettings } from '../settings/repository.js';

export type TmdbSettingsFull = TmdbSettings & { tmdbAccessToken: string | null };

type TmdbSettingKeys = Extract<keyof typeof TmdbSettingsQuerySchema.shape, string>;

const tmdbKeys = Object.keys(TmdbSettingsQuerySchema.shape) as TmdbSettingKeys[];

export async function setTmdbSettings(db: Database, settings: TmdbSettingsQuery): Promise<void> {
  await writeSettings(db, settings);
}

export async function getTmdbSettingsFull(db: Database): Promise<TmdbSettingsFull> {
  const settingsValues = await readSettings(db, tmdbKeys);
  return {
    tmdbAccessTokenSet: !!settingsValues.tmdbAccessToken,
    tmdbAccessToken: settingsValues.tmdbAccessToken,
  };
}

export async function getTmdbSettings(db: Database): Promise<TmdbSettings> {
  const { tmdbAccessToken: _tmdbAccessToken, ...settings } = await getTmdbSettingsFull(db);
  return settings;
}
