import { media } from '@findarr/shared/db';
import type { MediaType } from '@findarr/shared/media';
import {
  PlexSettingsQuerySchema,
  type PlexSettings,
  type PlexSettingsQuery,
} from '@findarr/shared/settings';
import { isDefined, objectKeys } from '@findarr/shared/utils';
import { eq, inArray, isNotNull, sql } from 'drizzle-orm';

import type { Database } from '../db/service.js';
import { readSettings, writeSettings } from '../settings/repository.js';
import { mergeAvailableSeasons } from '../utils/helper.js';
import type { PlexMedia } from './transformers.js';

// ============================================================================
// Plex Media Sync Operations
// ============================================================================

/**
 * Upsert media from Plex into the database.
 * Updates plexId, libraryAddedAt, status, and season availability (for TV shows).
 * Only updates when plexId, status, or seasons have actually changed.
 */
export async function upsertMediaFromPlex(db: Database, items: PlexMedia[]): Promise<number> {
  let affectedRows = 0;

  const upsertItem = async (item: PlexMedia) => {
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
    // Sequential read-modify-write: each upsert may first read existing season
    // JSON to merge availability. better-sqlite3 is synchronous, so parallelizing
    // gives no benefit and would complicate the per-row merge.
    // oxlint-disable-next-line eslint/no-await-in-loop
    await upsertItem(item);
  }

  return affectedRows;
}

/**
 * Get all media with Plex IDs for sync matching.
 */
export async function getMediaWithLibIds(db: Database): Promise<
  {
    id: number;
    type: MediaType;
    libId: string;
    status: string;
  }[]
> {
  const results = await db
    .select({
      id: media.id,
      type: media.type,
      libId: media.libId,
      status: media.status,
    })
    .from(media)
    .where(isNotNull(media.libId));

  return results.filter((item): item is typeof item & { libId: string } => isDefined(item.libId));
}

/**
 * Clear removed items from Plex.
 * Only resets status to pending if Jellyfin is also not linked.
 */
export async function clearRemovedLibItems(db: Database, libIds: string[]): Promise<number> {
  if (libIds.length === 0) {
    return 0;
  }

  const result = await db
    .update(media)
    .set({
      libId: null,
      libUrl: null,
      libAddedAt: null,
      status: 'pending',
      updatedAt: Date.now(),
    })
    .where(inArray(media.libId, libIds));

  return result.changes;
}

// ============================================================================
// Plex Settings Operations
// ============================================================================

export interface PlexSettingsFull extends PlexSettings {
  plexToken: string | null;
}

const plexKeys = objectKeys(PlexSettingsQuerySchema.shape);

export async function setPlexSettings(db: Database, settings: PlexSettingsQuery): Promise<void> {
  await writeSettings(db, settings);
}

export async function getPlexSettingsFull(db: Database): Promise<PlexSettingsFull> {
  const settingsValues = await readSettings(db, plexKeys);
  return {
    plexUrl: settingsValues.plexUrl,
    plexTokenSet: isDefined(settingsValues.plexToken),
    plexToken: settingsValues.plexToken,
  };
}

export async function getPlexSettings(db: Database): Promise<PlexSettings> {
  const { plexToken: _plexToken, ...settings } = await getPlexSettingsFull(db);
  return settings;
}
