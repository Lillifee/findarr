import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import SqlDatabase from 'better-sqlite3';

const SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'admin')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Media requests table
CREATE TABLE IF NOT EXISTS media_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN ('movie', 'tv')),
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'available')) DEFAULT 'pending',
  requested_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_requests_user_id ON media_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON media_requests(status);
`;

export function createDatabase(dbPath: string = './data/findarr.db'): SqlDatabase.Database {
  // Ensure data directory exists
  const dataDir = dirname(dbPath);
  mkdirSync(dataDir, { recursive: true });

  // Open database
  const db = new SqlDatabase(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  return db;
}

export type DB = SqlDatabase.Database;
