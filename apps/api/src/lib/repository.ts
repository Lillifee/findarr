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
  let affectedRows = 0;

  const upsertItem = async (item: LibMedia) => {
    let updatedSeasons = null;

    if (item.type === 'tv') {
      const existing = await db.query.media.findFirst({
        where: eq(media.tmdbId, item.tmdbId),
        columns: { seasons: true },
      });
      updatedSeasons = mergeAvailableSeasons(existing?.seasons ?? [], item.availableSeasons);
    }

    const result = await db
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
      });

    if (result.changes > 0) {
      affectedRows += 1;
    }
  };

  for (const item of items) {
    // Sequential read-modify-write: each upsert may read existing season JSON to
    // merge availability. better-sqlite3 is synchronous so parallelising gives no
    // benefit and would complicate the per-row merge.
    // oxlint-disable-next-line eslint/no-await-in-loop
    await upsertItem(item);
  }

  return affectedRows;
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
    .set({ libId: null, libUrl: null, libAddedAt: null, status: 'pending', updatedAt: Date.now() })
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
  const v = await readSettings(db, [urlKey, credentialKey]);
  return {
    url: v[urlKey] ?? null,
    apiKey: v[credentialKey] ?? null,
    apiKeySet: isDefined(v[credentialKey]),
  };
}

export async function setLibSettings(
  db: Database,
  config: LibServiceConfig,
  settings: LibSettingsQuery,
): Promise<void> {
  const urlKey = `${config.service}Url`;
  const credentialKey = `${config.service}ApiKey`;
  await writeSettings(db, {
    ...(isDefined(settings.url) && { [urlKey]: settings.url }),
    ...(isDefined(settings.apiKey) && { [credentialKey]: settings.apiKey }),
  });
}
