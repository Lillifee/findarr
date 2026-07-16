import { media } from '@findarr/shared/db';
import type { MediaType } from '@findarr/shared/media';
import type { LibSettingsQuery } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';
import { eq, inArray, isNotNull, sql } from 'drizzle-orm';

import type { Database } from '../db/service.js';
import { readSettings, writeSettings } from '../settings/repository.js';
import { mergeAvailableSeasons } from '../utils/helper.js';
import type { LibServiceConfig } from './config.js';
import type { LibMedia, LibSettingsFull } from './types.js';

// ============================================================================
// Shared Media Sync Operations — used by both Jellyfin and Plex
// ============================================================================

export async function upsertLibraryMedia(db: Database, items: LibMedia[]): Promise<number> {
  // One transaction for the whole batch → a single commit instead of one per row.
  // better-sqlite3 is synchronous, so reads (.get) and writes (.run) run inline.
  return db.transaction((tx) => {
    let affectedRows = 0;

    for (const item of items) {
      let updatedSeasons = null;

      if (item.type === 'tv') {
        const existing = tx
          .select({ seasons: media.seasons })
          .from(media)
          .where(eq(media.tmdbId, item.tmdbId))
          .get();
        updatedSeasons = mergeAvailableSeasons(existing?.seasons ?? [], item.availableSeasons);
      }

      const result = tx
        .insert(media)
        .values({
          tmdbId: item.tmdbId,
          type: item.type,
          libId: item.libId,
          libUrl: item.libUrl,
          libAddedAt: item.libAddedAt,
          status: 'available',
          seasons: updatedSeasons ?? undefined,
        })
        .onConflictDoUpdate({
          target: [media.tmdbId, media.type],
          set: {
            libId: item.libId,
            libUrl: item.libUrl,
            libAddedAt: sql`coalesce(${media.libAddedAt}, excluded.libAddedAt)`,
            status: 'available',
            seasons: updatedSeasons ?? undefined,
            updatedAt: sql`(unixepoch() * 1000)`,
          },
        })
        .run();

      if (result.changes > 0) {
        affectedRows += 1;
      }
    }

    return affectedRows;
  });
}

export async function getMediaWithLibIds(
  db: Database,
): Promise<{ id: number; type: MediaType; libId: string; status: string }[]> {
  const results = await db
    .select({ id: media.id, type: media.type, libId: media.libId, status: media.status })
    .from(media)
    .where(isNotNull(media.libId));

  return results.filter((item): item is typeof item & { libId: string } => isDefined(item.libId));
}

export async function clearRemovedLibItems(db: Database, libIds: string[]): Promise<number> {
  if (libIds.length === 0) {
    return 0;
  }

  const result = await db
    .update(media)
    .set({ libId: null, libUrl: null, libAddedAt: null, status: 'none', updatedAt: Date.now() })
    .where(inArray(media.libId, libIds));

  return result.changes;
}

// ============================================================================
// Library Settings Operations
// ============================================================================

export async function getLibSettings(
  db: Database,
  config: LibServiceConfig,
): Promise<LibSettingsFull> {
  const urlKey = `${config.service}Url`;
  const credentialKey = `${config.service}ApiKey`;
  const enabledKey = `${config.service}Enabled`;
  const v = await readSettings(db, [urlKey, credentialKey, enabledKey]);
  return {
    url: v[urlKey] ?? null,
    apiKey: v[credentialKey] ?? null,
    apiKeySet: isDefined(v[credentialKey]),
    enabled: isDefined(v[enabledKey]) ? v[enabledKey] === 'true' : isDefined(v[urlKey]),
  };
}

export async function setLibSettings(
  db: Database,
  config: LibServiceConfig,
  settings: LibSettingsQuery,
): Promise<void> {
  const urlKey = `${config.service}Url`;
  const credentialKey = `${config.service}ApiKey`;
  const enabledKey = `${config.service}Enabled`;
  await writeSettings(db, {
    [urlKey]: settings.url,
    [credentialKey]: settings.apiKey,
    [enabledKey]: settings.enabled?.toString(),
  });
}
