import type { TmdbSettings, TmdbSettingsQuery } from '@findarr/shared';
import { TmdbSettingsQuerySchema } from '@findarr/shared';
import type { DB } from '../db/setup.js';
import { readSettings, writeSettings } from '../settings/repository.js';

export type TmdbSettingsFull = TmdbSettings & { tmdbAccessToken: string | null };

type TmdbSettingKeys = Extract<keyof typeof TmdbSettingsQuerySchema.shape, string>;

const tmdbKeys = Object.keys(TmdbSettingsQuerySchema.shape) as TmdbSettingKeys[];

export async function setTmdbSettings(db: DB, settings: TmdbSettingsQuery): Promise<void> {
  await writeSettings(db, settings);
}

export async function getTmdbSettingsFull(db: DB): Promise<TmdbSettingsFull> {
  const s = await readSettings(db, tmdbKeys);
  return {
    tmdbAccessTokenSet: !!s.tmdbAccessToken,
    tmdbAccessToken: s.tmdbAccessToken,
  };
}

export async function getTmdbSettings(db: DB): Promise<TmdbSettings> {
  const { tmdbAccessToken: _tmdbAccessToken, ...settings } = await getTmdbSettingsFull(db);
  return settings;
}
