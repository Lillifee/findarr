import type { TmdbSettings, TmdbSettingsQuery } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';

import type { SettingsService } from '../settings/service.js';

export type TmdbSettingsFull = TmdbSettings & { tmdbAccessToken: string | null };

export async function setTmdbSettings(
  settings: SettingsService,
  tmdbSettings: TmdbSettingsQuery,
): Promise<void> {
  await settings.set(tmdbSettings);
}

export async function getTmdbSettingsFull(settings: SettingsService): Promise<TmdbSettingsFull> {
  const settingsValues = await settings.getAll();

  return {
    tmdbAccessTokenSet: isDefined(settingsValues['tmdbAccessToken']),
    tmdbAccessToken: settingsValues['tmdbAccessToken'] ?? null,
  };
}
