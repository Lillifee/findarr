import {
  appSettings,
  RadarrSettingsQuerySchema,
  SonarrSettingsQuerySchema,
  JellyfinSettingsQuerySchema,
  TmdbSettingsQuerySchema,
  type RadarrSettings,
  type SonarrSettings,
  type JellyfinSettings,
  type TmdbSettings,
  type RadarrSettingsQuery,
  type SonarrSettingsQuery,
  type JellyfinSettingsQuery,
  type TmdbSettingsQuery,
  objectEntries,
  isDefined,
} from '@findarr/shared';
export type {
  RadarrSettings,
  SonarrSettings,
  JellyfinSettings,
  TmdbSettings,
} from '@findarr/shared';
import { eq, inArray } from 'drizzle-orm';
import type { DB } from '../db/setup.js';

type RadarrSettingKeys = Extract<keyof typeof RadarrSettingsQuerySchema.shape, string>;
type SonarrSettingKeys = Extract<keyof typeof SonarrSettingsQuerySchema.shape, string>;
type JellyfinSettingKeys = Extract<keyof typeof JellyfinSettingsQuerySchema.shape, string>;
type TmdbSettingKeys = Extract<keyof typeof TmdbSettingsQuerySchema.shape, string>;

export type SettingKey =
  | RadarrSettingKeys
  | SonarrSettingKeys
  | JellyfinSettingKeys
  | TmdbSettingKeys;

const radarrKeys = Object.keys(RadarrSettingsQuerySchema.shape) as RadarrSettingKeys[];
const sonarrKeys = Object.keys(SonarrSettingsQuerySchema.shape) as SonarrSettingKeys[];
const jellyfinKeys = Object.keys(JellyfinSettingsQuerySchema.shape) as JellyfinSettingKeys[];
const tmdbKeys = Object.keys(TmdbSettingsQuerySchema.shape) as TmdbSettingKeys[];

async function read<K extends SettingKey>(db: DB, keys: K[]): Promise<Record<K, string | null>> {
  const rows = await db.query.appSettings.findMany({ where: inArray(appSettings.key, keys) });
  const stored = new Map(rows.map(r => [r.key, r.value]));
  return Object.fromEntries(keys.map(k => [k, stored.get(k) ?? null])) as Record<K, string | null>;
}

export async function write(
  db: DB,
  values: Partial<Record<SettingKey, string | undefined>>
): Promise<void> {
  const entries = objectEntries(values).filter((entry): entry is [SettingKey, string] =>
    isDefined(entry[1])
  );
  if (entries.length === 0) return;
  await Promise.all(
    entries.map(([key, value]) =>
      db.insert(appSettings).values({ key, value }).onConflictDoUpdate({
        target: appSettings.key,
        set: { value },
      })
    )
  );
}

export async function getSetting(db: DB, key: SettingKey): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return row?.value ?? null;
}

export async function setSetting(db: DB, key: SettingKey, value: string): Promise<void> {
  await write(db, { [key]: value });
}

export interface ArrSettings {
  url: string | null;
  apiKey: string | null;
  apiKeySet: boolean;
  qualityProfileId: number | null;
  rootFolderPath: string | null;
}

export async function getArrSettingsFull(
  db: DB,
  service: 'radarr' | 'sonarr'
): Promise<ArrSettings> {
  if (service === 'radarr') {
    const s = await read(db, radarrKeys);
    return {
      url: s.radarrUrl,
      apiKey: s.radarrApiKey,
      apiKeySet: !!s.radarrApiKey,
      qualityProfileId: s.radarrQualityProfileId
        ? Number.parseInt(s.radarrQualityProfileId, 10)
        : null,
      rootFolderPath: s.radarrRootFolderPath,
    };
  }

  const s = await read(db, sonarrKeys);
  return {
    url: s.sonarrUrl,
    apiKey: s.sonarrApiKey,
    apiKeySet: !!s.sonarrApiKey,
    qualityProfileId: s.sonarrQualityProfileId
      ? Number.parseInt(s.sonarrQualityProfileId, 10)
      : null,
    rootFolderPath: s.sonarrRootFolderPath,
  };
}

export async function setRadarrSettings(db: DB, settings: RadarrSettingsQuery): Promise<void> {
  await write(db, {
    ...settings,
    radarrQualityProfileId: settings.radarrQualityProfileId?.toString(),
  });
}

export async function getRadarrSettingsFull(
  db: DB
): Promise<RadarrSettings & { radarrApiKey: string | null }> {
  const s = await read(db, radarrKeys);
  return {
    radarrUrl: s.radarrUrl,
    radarrApiKeySet: !!s.radarrApiKey,
    radarrApiKey: s.radarrApiKey,
    radarrQualityProfileId: s.radarrQualityProfileId
      ? Number.parseInt(s.radarrQualityProfileId, 10)
      : null,
    radarrRootFolderPath: s.radarrRootFolderPath,
  };
}

export async function getRadarrSettings(db: DB): Promise<RadarrSettings> {
  const { radarrApiKey: _radarrApiKey, ...settings } = await getRadarrSettingsFull(db);
  return settings;
}

export async function setSonarrSettings(db: DB, settings: SonarrSettingsQuery): Promise<void> {
  await write(db, {
    ...settings,
    sonarrQualityProfileId: settings.sonarrQualityProfileId?.toString(),
  });
}

export async function getSonarrSettingsFull(
  db: DB
): Promise<SonarrSettings & { sonarrApiKey: string | null }> {
  const s = await read(db, sonarrKeys);
  return {
    sonarrUrl: s.sonarrUrl,
    sonarrApiKeySet: !!s.sonarrApiKey,
    sonarrApiKey: s.sonarrApiKey,
    sonarrQualityProfileId: s.sonarrQualityProfileId
      ? Number.parseInt(s.sonarrQualityProfileId, 10)
      : null,
    sonarrRootFolderPath: s.sonarrRootFolderPath,
  };
}

export async function getSonarrSettings(db: DB): Promise<SonarrSettings> {
  const { sonarrApiKey: _sonarrApiKey, ...settings } = await getSonarrSettingsFull(db);
  return settings;
}

export async function setJellyfinSettings(db: DB, settings: JellyfinSettingsQuery): Promise<void> {
  await write(db, settings);
}

export async function getJellyfinSettingsFull(
  db: DB
): Promise<JellyfinSettings & { jellyfinApiKey: string | null }> {
  const s = await read(db, jellyfinKeys);
  return {
    jellyfinUrl: s.jellyfinUrl,
    jellyfinApiKeySet: !!s.jellyfinApiKey,
    jellyfinApiKey: s.jellyfinApiKey,
  };
}

export async function getJellyfinSettings(db: DB): Promise<JellyfinSettings> {
  const { jellyfinApiKey: _jellyfinApiKey, ...settings } = await getJellyfinSettingsFull(db);
  return settings;
}

export async function setTmdbSettings(db: DB, settings: TmdbSettingsQuery): Promise<void> {
  await write(db, settings as Partial<Record<SettingKey, string | undefined>>);
}

export async function getTmdbSettingsFull(
  db: DB
): Promise<TmdbSettings & { tmdbAccessToken: string | null }> {
  const s = await read(db, tmdbKeys);
  return {
    tmdbAccessTokenSet: !!s.tmdbAccessToken,
    tmdbAccessToken: s.tmdbAccessToken,
  };
}

export async function getTmdbSettings(db: DB): Promise<TmdbSettings> {
  const { tmdbAccessToken: _tmdbAccessToken, ...settings } = await getTmdbSettingsFull(db);
  return settings;
}
