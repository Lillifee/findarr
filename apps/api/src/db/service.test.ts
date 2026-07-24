import type SqlDatabase from 'better-sqlite3';

import { createDatabase } from './service.js';

describe('setup', () => {
  let sqliteDb: SqlDatabase.Database;

  beforeEach(() => {
    const { sqliteDb: db } = createDatabase(':memory:');
    sqliteDb = db;
  });

  afterEach(() => {
    sqliteDb.close();
  });

  it('creates users tables', () => {
    // Check users table exists
    const users = sqliteDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
      .get();

    expect(users).toBeTruthy();
  });

  it('creates user_media_interactions table', () => {
    // Check user_media_interactions table exists
    const requests = sqliteDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='user_media_interactions'",
      )
      .get();
    expect(requests).toBeTruthy();
  });
});
