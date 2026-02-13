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

  it('creates media_requests table', () => {
    // Check media_requests table exists
    const requests = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='media_requests'")
      .get();
    expect(requests).toBeTruthy();
  });
});
