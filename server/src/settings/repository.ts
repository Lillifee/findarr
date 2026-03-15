import { appSettings, type ArrSettings, type JellyfinSettings } from '@findarr/shared';
export type { ArrSettings, JellyfinSettings } from '@findarr/shared';
import { eq, inArray, sql } from 'drizzle-orm';
import type { DB } from '../db/setup.js';

// ============================================================================
// Low-level helpers
// ============================================================================

export async function getSetting(db: DB, key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return row?.value ?? null;
}

export async function setSetting(db: DB, key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: sql`(unixepoch() * 1000)` },
    });
}

/** Fetch multiple keys in a single query and return them as a Map. */
async function getSettingsMap(db: DB, keys: string[]): Promise<Map<string, string>> {
  const rows = await db.query.appSettings.findMany({ where: inArray(appSettings.key, keys) });
  return new Map(rows.map(r => [r.key, r.value]));
}

// ============================================================================
// Typed settings helpers
// ============================================================================

// Internal types that expose the raw API key (never returned to clients)
interface FullArrSettings extends ArrSettings {
  apiKey: string | null;
}
interface FullJellyfinSettings extends JellyfinSettings {
  apiKey: string | null;
}

const arrKeys = (p: string) => [
  `${p}.qualityProfileId`,
  `${p}.rootFolderPath`,
  `${p}.url`,
  `${p}.apiKey`,
];

function parseArrSettings(prefix: string, m: Map<string, string>): ArrSettings {
  const qpId = m.get(`${prefix}.qualityProfileId`);
  return {
    qualityProfileId: qpId ? Number.parseInt(qpId, 10) : null,
    rootFolderPath: m.get(`${prefix}.rootFolderPath`) ?? null,
    url: m.get(`${prefix}.url`) ?? null,
    apiKeySet: !!m.get(`${prefix}.apiKey`),
  };
}

function parseArrSettingsFull(prefix: string, m: Map<string, string>): FullArrSettings {
  return { ...parseArrSettings(prefix, m), apiKey: m.get(`${prefix}.apiKey`) ?? null };
}

export async function getRadarrSettings(db: DB): Promise<ArrSettings> {
  return parseArrSettings('radarr', await getSettingsMap(db, arrKeys('radarr')));
}

export async function getRadarrSettingsFull(db: DB): Promise<FullArrSettings> {
  return parseArrSettingsFull('radarr', await getSettingsMap(db, arrKeys('radarr')));
}

export async function setRadarrSettings(
  db: DB,
  newSettings: {
    url?: string | undefined;
    apiKey?: string | undefined;
    qualityProfileId?: number | undefined;
    rootFolderPath?: string | undefined;
  }
): Promise<void> {
  const ops: Promise<void>[] = [];
  if (newSettings.url != null) ops.push(setSetting(db, 'radarr.url', newSettings.url));
  if (newSettings.apiKey != null) ops.push(setSetting(db, 'radarr.apiKey', newSettings.apiKey));
  if (newSettings.qualityProfileId != null)
    ops.push(setSetting(db, 'radarr.qualityProfileId', newSettings.qualityProfileId.toString()));
  if (newSettings.rootFolderPath != null)
    ops.push(setSetting(db, 'radarr.rootFolderPath', newSettings.rootFolderPath));
  await Promise.all(ops);
}

export async function getSonarrSettings(db: DB): Promise<ArrSettings> {
  return parseArrSettings('sonarr', await getSettingsMap(db, arrKeys('sonarr')));
}

export async function getSonarrSettingsFull(db: DB): Promise<FullArrSettings> {
  return parseArrSettingsFull('sonarr', await getSettingsMap(db, arrKeys('sonarr')));
}

export async function setSonarrSettings(
  db: DB,
  newSettings: {
    url?: string | undefined;
    apiKey?: string | undefined;
    qualityProfileId?: number | undefined;
    rootFolderPath?: string | undefined;
  }
): Promise<void> {
  const ops: Promise<void>[] = [];
  if (newSettings.url != null) ops.push(setSetting(db, 'sonarr.url', newSettings.url));
  if (newSettings.apiKey != null) ops.push(setSetting(db, 'sonarr.apiKey', newSettings.apiKey));
  if (newSettings.qualityProfileId != null)
    ops.push(setSetting(db, 'sonarr.qualityProfileId', newSettings.qualityProfileId.toString()));
  if (newSettings.rootFolderPath != null)
    ops.push(setSetting(db, 'sonarr.rootFolderPath', newSettings.rootFolderPath));
  await Promise.all(ops);
}

export async function getJellyfinSettings(db: DB): Promise<JellyfinSettings> {
  const m = await getSettingsMap(db, ['jellyfin.url', 'jellyfin.apiKey']);
  return { url: m.get('jellyfin.url') ?? null, apiKeySet: !!m.get('jellyfin.apiKey') };
}

export async function getJellyfinSettingsFull(db: DB): Promise<FullJellyfinSettings> {
  const m = await getSettingsMap(db, ['jellyfin.url', 'jellyfin.apiKey']);
  return {
    url: m.get('jellyfin.url') ?? null,
    apiKeySet: !!m.get('jellyfin.apiKey'),
    apiKey: m.get('jellyfin.apiKey') ?? null,
  };
}

export async function setJellyfinSettings(
  db: DB,
  newSettings: { url?: string | undefined; apiKey?: string | undefined }
): Promise<void> {
  const ops: Promise<void>[] = [];
  if (newSettings.url != null) ops.push(setSetting(db, 'jellyfin.url', newSettings.url));
  if (newSettings.apiKey != null) ops.push(setSetting(db, 'jellyfin.apiKey', newSettings.apiKey));
  await Promise.all(ops);
}
