import {
  isDefined,
  JellyfinSettingsQuerySchema,
  media,
  objectKeys,
  type JellyfinSettings,
  type JellyfinSettingsQuery,
  type MediaType,
} from '@findarr/shared';
import { eq, inArray, isNotNull, sql } from 'drizzle-orm';

import type { Database } from '../db/service.js';
import { readSettings, writeSettings } from '../settings/repository.js';
import type { JellyfinMedia } from './transformers.js';

// ============================================================================
// Jellyfin Media Sync Operations
// ============================================================================

/**
 * Upsert media from Jellyfin into the database
 * Updates jellyfinId, status, and season availability (for TV shows)
 * Only updates when jellyfinId, status, or seasons have actually changed
 */
export async function upsertMediaFromJellyfin(
  db: Database,
  items: JellyfinMedia[],
): Promise<number> {
  let affectedRows = 0;

  const upsertItem = async (item: JellyfinMedia) => {
    let updatedSeasons:
      | {
          seasonNumber: number;
          status: 'none' | 'requested' | 'monitored' | 'downloaded' | 'available';
        }[]
      | null = null;

    if (item.type === 'tv' && item.availableSeasons) {
      const existing = await db.query.media.findFirst({
        where: eq(media.tmdbId, item.tmdbId),
        columns: { seasons: true },
      });

      const existingSeasons = (existing?.seasons ?? []) as {
        seasonNumber: number;
        status: 'none' | 'requested' | 'monitored' | 'downloaded' | 'available';
      }[];
      const availableSet = new Set(item.availableSeasons);

      updatedSeasons =
        existingSeasons.length > 0
          ? existingSeasons.map((season) => ({
              seasonNumber: season.seasonNumber,
              status: availableSet.has(season.seasonNumber) ? 'available' : season.status,
            }))
          : null;
    }

    const result = await db
      .insert(media)
      .values({
        tmdbId: item.tmdbId,
        type: item.type,
        jellyfinId: item.jellyfinId,
        jellyfinAddedAt: item.jellyfinAddedAt,
        status: 'available',
        seasons: updatedSeasons ?? undefined,
      })
      .onConflictDoUpdate({
        target: [media.tmdbId, media.type],
        set: {
          jellyfinId: item.jellyfinId,
          jellyfinAddedAt: sql`coalesce(${media.jellyfinAddedAt}, excluded.jellyfinAddedAt)`,
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
 * Get all media with Jellyfin IDs for sync matching
 */
export async function getMediaWithJellyfinIds(db: Database): Promise<
  {
    id: number;
    type: MediaType;
    jellyfinId: string;
    status: string;
  }[]
> {
  const results = await db
    .select({
      id: media.id,
      type: media.type,
      jellyfinId: media.jellyfinId,
      status: media.status,
    })
    .from(media)
    .where(isNotNull(media.jellyfinId));

  // Filter out null values and assert type (we know they're not null due to where clause)
  return results.filter(
    (item): item is typeof item & { jellyfinId: string } => item.jellyfinId !== null,
  );
}

/**
 * Clear removed items from Jellyfin
 * Resets jellyfinId and status for items no longer in Jellyfin library
 */
export async function clearRemovedJellyfinItems(
  db: Database,
  jellyfinIds: string[],
): Promise<number> {
  if (jellyfinIds.length === 0) {
    return 0;
  }

  // Single set-based update: detach Jellyfin metadata and reset to pending so
  // the next Arr sync can re-resolve status. Uniform across all matched rows.
  const result = await db
    .update(media)
    .set({
      jellyfinId: null,
      jellyfinAddedAt: null,
      status: 'pending',
      updatedAt: Date.now(),
    })
    .where(inArray(media.jellyfinId, jellyfinIds));

  return result.changes;
}

export interface JellyfinSettingsFull extends JellyfinSettings {
  jellyfinApiKey: string | null;
}

const jellyfinKeys = objectKeys(JellyfinSettingsQuerySchema.shape);

export async function setJellyfinSettings(
  db: Database,
  settings: JellyfinSettingsQuery,
): Promise<void> {
  await writeSettings(db, settings);
}

export async function getJellyfinSettingsFull(db: Database): Promise<JellyfinSettingsFull> {
  const settingsValues = await readSettings(db, jellyfinKeys);
  return {
    jellyfinUrl: settingsValues.jellyfinUrl,
    jellyfinApiKeySet: isDefined(settingsValues.jellyfinApiKey),
    jellyfinApiKey: settingsValues.jellyfinApiKey,
  };
}

export async function getJellyfinSettings(db: Database): Promise<JellyfinSettings> {
  const { jellyfinApiKey: _jellyfinApiKey, ...settings } = await getJellyfinSettingsFull(db);
  return settings;
}
