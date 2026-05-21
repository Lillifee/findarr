import {
  JellyfinSettingsQuerySchema,
  media,
  type JellyfinSettings,
  type JellyfinSettingsQuery,
  type MediaType,
} from '@findarr/shared';
import { eq, isNotNull, sql } from 'drizzle-orm';
import type { DB } from '../db/setup.js';
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
export async function upsertMediaFromJellyfin(db: DB, items: JellyfinMedia[]): Promise<number> {
  let affectedRows = 0;

  const upsertItem = async (item: JellyfinMedia) => {
    let updatedSeasons: Array<{
      seasonNumber: number;
      status: 'none' | 'requested' | 'monitored' | 'downloaded' | 'available';
    }> | null = null;

    if (item.type === 'tv' && item.availableSeasons) {
      const existing = await db.query.media.findFirst({
        where: eq(media.tmdbId, item.tmdbId),
        columns: { seasons: true },
      });

      const existingSeasons = (existing?.seasons ?? []) as Array<{
        seasonNumber: number;
        status: 'none' | 'requested' | 'monitored' | 'downloaded' | 'available';
      }>;
      const availableSet = new Set(item.availableSeasons);

      updatedSeasons =
        existingSeasons.length > 0
          ? existingSeasons.map(season => ({
              seasonNumber: season.seasonNumber,
              status: (availableSet.has(season.seasonNumber) ? 'available' : season.status) as
                | 'none'
                | 'requested'
                | 'monitored'
                | 'downloaded'
                | 'available',
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

    if (result.changes > 0) affectedRows++;
  };

  for (const item of items) {
    await upsertItem(item);
  }

  return affectedRows;
}

/**
 * Get all media with Jellyfin IDs for sync matching
 */
export async function getMediaWithJellyfinIds(db: DB): Promise<
  Array<{
    id: number;
    type: MediaType;
    jellyfinId: string;
    status: string;
  }>
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
    (item): item is typeof item & { jellyfinId: string } => item.jellyfinId !== null
  );
}

/**
 * Clear removed items from Jellyfin
 * Resets jellyfinId and status for items no longer in Jellyfin library
 */
export async function clearRemovedJellyfinItems(db: DB, jellyfinIds: string[]): Promise<number> {
  if (jellyfinIds.length === 0) return 0;

  let cleared = 0;

  for (const id of jellyfinIds) {
    const current = await db.query.media.findFirst({
      where: eq(media.jellyfinId, id),
      columns: { id: true, status: true, arrId: true },
    });

    if (!current) continue;

    // Reset to pending and let Arr sync handle updating status on next run
    await db
      .update(media)
      .set({
        jellyfinId: null,
        jellyfinAddedAt: null,
        status: 'pending',
        updatedAt: Date.now(),
      })
      .where(eq(media.id, current.id));

    cleared++;
  }

  return cleared;
}

export interface JellyfinSettingsFull extends JellyfinSettings {
  jellyfinApiKey: string | null;
}

type JellyfinSettingKeys = Extract<keyof typeof JellyfinSettingsQuerySchema.shape, string>;

const jellyfinKeys = Object.keys(JellyfinSettingsQuerySchema.shape) as JellyfinSettingKeys[];

export async function setJellyfinSettings(db: DB, settings: JellyfinSettingsQuery): Promise<void> {
  await writeSettings(db, settings);
}

export async function getJellyfinSettingsFull(db: DB): Promise<JellyfinSettingsFull> {
  const s = await readSettings(db, jellyfinKeys);
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
