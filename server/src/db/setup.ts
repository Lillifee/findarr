import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import SqlDatabase from 'better-sqlite3';

const SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  displayName TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'admin')),
  createdAt INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Media requests table
CREATE TABLE IF NOT EXISTS media_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  mediaType TEXT NOT NULL CHECK(mediaType IN ('movie', 'tv')),
  tmdbId INTEGER NOT NULL,
  title TEXT NOT NULL,
  posterPath TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'available')) DEFAULT 'pending',
  requestedAt INTEGER NOT NULL DEFAULT (unixepoch()),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_requests_userId ON media_requests(userId);
CREATE INDEX IF NOT EXISTS idx_requests_status ON media_requests(status);
`;

export function createDatabase(dbPath: string): SqlDatabase.Database {
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
