import { appSettings, media, userMediaInteractions, userPreferences } from '@findarr/shared/db';
import type { MediaType } from '@findarr/shared/media';
import { eq } from 'drizzle-orm';

import type { Database } from '../db/service.js';
import { processWithWorkerPool } from '../tmdb/helpers.js';
import type { TMDBService } from '../tmdb/service.js';
import type { AppLogger } from '../utils/logger.js';
import { getPreferenceSubjects } from './service.js';

const USER_PREFERENCES_REBUILD_KEY = 'userPreferencesRebuild';
const USER_PREFERENCES_REBUILD_VERSION = '1';

export async function rebuildUserPreferences(
  db: Database,
  tmdb: TMDBService,
  appLog: AppLogger,
): Promise<void> {
  const timer = appLog.timer('rebuildUserPreferences');

  const marker = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, USER_PREFERENCES_REBUILD_KEY));

  if (marker[0]?.value === USER_PREFERENCES_REBUILD_VERSION || !tmdb.isConfigured()) {
    return;
  }

  appLog.warn('Rebuilding user preferences from stored media interactions, this may take a while');

  const interactions = await db
    .select({
      userId: userMediaInteractions.userId,
      mediaType: media.type,
      tmdbId: media.tmdbId,
      action: userMediaInteractions.action,
    })
    .from(userMediaInteractions)
    .innerJoin(media, eq(userMediaInteractions.mediaId, media.id));

  const rebuilt = new Map<
    string,
    {
      userId: number;
      mediaType: MediaType;
      kind: 'genre' | 'keyword' | 'cast';
      subjectKey: string;
      subjectName: string;
      score: number;
      count: number;
    }
  >();

  timer.lap('loadInteractions');

  const { successCount, results: interactionDetails } = await processWithWorkerPool({
    items: interactions,
    appLog,
    processFn: async (interaction) => {
      if (interaction.tmdbId === null) {
        return null;
      }

      const details = await tmdb.details({ id: interaction.tmdbId, type: interaction.mediaType });

      return { interaction, details };
    },
  });

  timer.lap('fetchDetails');

  if (interactions.length > 0 && successCount === 0) {
    appLog.error(
      { totalInteractions: interactions.length },
      'User preference rebuild skipped because no TMDB details were available',
    );
    timer.end('skipped');
    return;
  }

  if (successCount !== interactions.length) {
    appLog.warn(
      {
        successfulInteractions: successCount,
        totalInteractions: interactions.length,
      },
      'Some interactions were skipped because TMDB details were unavailable',
    );
  }

  for (const { interaction, details } of interactionDetails) {
    const score = interaction.action === 'liked' ? 1 : -1;
    const subjects = getPreferenceSubjects(interaction.mediaType, {
      genres: details.genres,
      keywords: details.keywords ?? [],
      cast: details.cast,
    });

    for (const subject of subjects) {
      const key = `${interaction.userId}:${subject.mediaType}:${subject.kind}:${subject.subjectKey}`;
      const existing = rebuilt.get(key);
      if (existing) {
        existing.score += score;
        existing.count += 1;
      } else {
        rebuilt.set(key, {
          userId: interaction.userId,
          mediaType: interaction.mediaType,
          kind: subject.kind,
          subjectKey: subject.subjectKey,
          subjectName: subject.subjectName,
          score,
          count: 1,
        });
      }
    }
  }

  db.transaction((tx) => {
    tx.delete(userPreferences).run();

    for (const preference of rebuilt.values()) {
      tx.insert(userPreferences).values(preference).run();
    }

    tx.insert(appSettings)
      .values({ key: USER_PREFERENCES_REBUILD_KEY, value: USER_PREFERENCES_REBUILD_VERSION })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: USER_PREFERENCES_REBUILD_VERSION },
      })
      .run();
  });

  timer.lap('persistPreferences');
  timer.end();
  appLog.info(
    {
      interactions: interactions.length,
      preferences: rebuilt.size,
    },
    'User preference rebuild completed',
  );
}
