import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import SqlDatabase from 'better-sqlite3';

export const SCHEMA = `
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

-- Media table (global state for all movies/shows)
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdbId INTEGER NOT NULL,
  mediaType TEXT NOT NULL CHECK(mediaType IN ('movie', 'tv')),
  jellyfinId TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'requested', 'available')) DEFAULT 'pending',
  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tmdbId, mediaType)
);

CREATE INDEX IF NOT EXISTS idx_media_tmdb ON media(tmdbId, mediaType);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);
CREATE INDEX IF NOT EXISTS idx_media_jellyfin ON media(jellyfinId);

-- User media interactions table (user actions: liked, disliked)
CREATE TABLE IF NOT EXISTS user_media_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mediaId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('liked', 'disliked')),
  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(mediaId, userId, action),
  FOREIGN KEY (mediaId) REFERENCES media(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_media_interactions(userId, action);
CREATE INDEX IF NOT EXISTS idx_interactions_media ON user_media_interactions(mediaId, action);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON user_media_interactions(userId, createdAt);
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
