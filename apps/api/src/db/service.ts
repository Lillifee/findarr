import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { isSea } from 'node:sea';

import { relationsSchema, schema } from '@findarr/shared/db';
import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const migrationsFolder = isSea()
  ? path.join(path.dirname(process.execPath), 'drizzle')
  : path.join(import.meta.dirname, '..', '..', 'drizzle');

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

  // Create Drizzle instance with schema and relations for relational queries
  const db = drizzle(sqliteDb, { schema: combinedSchema });

  // FKs must be off during migrations: some migrations recreate tables via
  // DROP + rename, which would cascade-delete related rows (e.g.
  // user_media_interactions) if enforcement were on.
  sqliteDb.pragma('foreign_keys = OFF');

  // Migrate database to latest version using migrations from drizzle-kit
  migrate(db, { migrationsFolder });

  // Enable foreign key enforcement only after migrations have completed.
  sqliteDb.pragma('foreign_keys = ON');

  return { db, sqliteDb };
}
