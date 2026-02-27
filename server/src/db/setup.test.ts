import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase } from '../db/setup.js';
import type { DB } from '../db/setup.js';

describe('setup', () => {
  let db: DB;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates users tables', () => {
    // Check users table exists
    const users = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
      .get();

    expect(users).toBeTruthy();
  });

  it('creates user_media_interactions table', () => {
    // Check user_media_interactions table exists
    const requests = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='user_media_interactions'"
      )
      .get();
    expect(requests).toBeTruthy();
  });
});
