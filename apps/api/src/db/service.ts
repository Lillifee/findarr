import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { relationsSchema, schema } from '@findarr/shared';
import BetterSqlite3 from 'better-sqlite3';
import type SqlDatabase from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const currentDirname = import.meta.dirname;

// Combined schema for type inference
export const combinedSchema = { ...schema, ...relationsSchema } as const;

export type Database = ReturnType<typeof drizzle<typeof combinedSchema>>;

export type DatabaseConnection = {
  db: Database;
  sqliteDb: SqlDatabase.Database;
};

/**
 * Creates and initializes a SQLite database with Drizzle ORM
 * Uses auto-generated migrations from drizzle-kit
 */
export function createDatabase(dbPath: string): DatabaseConnection {
  // Ensure data directory exists
  const dataDir = dirname(dbPath);
  mkdirSync(dataDir, { recursive: true });

  // Open SQLite database
  const sqliteDb = new BetterSqlite3(dbPath);
  sqliteDb.pragma('foreign_keys = ON');

  // Create Drizzle instance with schema and relations for relational queries
  const db = drizzle(sqliteDb, { schema: combinedSchema });

  // Apply migrations (from drizzle-kit generated folder)
  migrate(db, { migrationsFolder: join(currentDirname, '..', '..', 'drizzle') });

  return { db, sqliteDb };
}
