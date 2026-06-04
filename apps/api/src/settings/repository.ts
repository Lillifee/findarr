import { appSettings } from '@findarr/shared/db';
import { objectEntries, isDefined, objectFromEntries } from '@findarr/shared/utils';
import { inArray } from 'drizzle-orm';

import type { Database } from '../db/service.js';

export async function readSettings<K extends string>(
  db: Database,
  keys: K[],
): Promise<Record<K, string | null>> {
  const rows = await db.query.appSettings.findMany({ where: inArray(appSettings.key, keys) });
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  return objectFromEntries(keys.map((k) => [k, stored.get(k) ?? null]));
}

export async function writeSettings(
  db: Database,
  values: Partial<Record<string, string | undefined>>,
): Promise<void> {
  const entries = objectEntries(values).filter((entry): entry is [string, string] =>
    isDefined(entry[1]),
  );
  if (entries.length === 0) {
    return;
  }
  await Promise.all(
    entries.map(([key, value]) =>
      db.insert(appSettings).values({ key, value }).onConflictDoUpdate({
        target: appSettings.key,
        set: { value },
      }),
    ),
  );
}
