import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { relationsSchema, schema } from '@findarr/shared/db';
import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const currentDirname = import.meta.dirname;

// Combined schema for type inference
export const combinedSchema = { ...schema, ...relationsSchema } as const;

export type Database = ReturnType<typeof drizzle<typeof combinedSchema>>;

export type DatabaseConnection = {
  db: Database;
  sqliteDb: BetterSqlite3.Database;
};

/**
 * Creates and initializes a SQLite database with Drizzle ORM
 * Uses auto-generated migrations from drizzle-kit
 */
export function createDatabase(dbPath: string): DatabaseConnection {
  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  mkdirSync(dataDir, { recursive: true });

  // Open SQLite database
  const sqliteDb = new BetterSqlite3(dbPath);

  // Performance & concurrency pragmas. WAL + synchronous=NORMAL avoids an fsync
  // on every commit (fsync only happens at checkpoint), which is dramatically
  // faster on slow/network storage such as a NAS — the difference between
  // multi-second and single-digit-ms writes. It stays crash-safe: at most the
  // last committed transaction can be lost on power loss, never corruption.
  // busy_timeout prevents SQLITE_BUSY errors when a write overlaps a checkpoint.
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('synchronous = NORMAL');
  sqliteDb.pragma('busy_timeout = 5000');
  sqliteDb.pragma('foreign_keys = ON');

  // Create Drizzle instance with schema and relations for relational queries
  const db = drizzle(sqliteDb, { schema: combinedSchema });

  // Apply migrations (from drizzle-kit generated folder)
  migrate(db, { migrationsFolder: path.join(currentDirname, '..', '..', 'drizzle') });

  return { db, sqliteDb };
}
