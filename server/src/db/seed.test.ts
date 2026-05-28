import { users } from '@findarr/shared';
import type SqlDatabase from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { seed } from './seed.js';
import { createDatabase } from './service.js';
import type { Database } from './service.js';

describe('seed', () => {
  let app: FastifyInstance;
  let db: Database;
  let sqliteDb: SqlDatabase.Database;

  const settings = {
    email: 'admin@findarr.com',
    password: 'changeme',
  };

  beforeEach(() => {
    app = Fastify();
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;
  });

  afterEach(() => {
    sqliteDb.close();
  });

  it('creates an admin user if not present', async () => {
    const adminBefore = await db.query.users.findFirst({
      where: eq(users.email, settings.email),
    });
    expect(adminBefore).toBeFalsy();
    await seed(app, db);
    const adminAfter = await db.query.users.findFirst({
      where: eq(users.email, settings.email),
    });
    expect(adminAfter).toBeDefined();
    expect(adminAfter?.role).toBe('admin');
  });

  it('does not create duplicate admin user', async () => {
    await seed(app, db);
    const admin1 = await db.query.users.findFirst({
      where: eq(users.email, settings.email),
    });
    await seed(app, db);
    const admin2 = await db.query.users.findFirst({
      where: eq(users.email, settings.email),
    });
    expect(admin1?.id).toBe(admin2?.id);
  });

  it('should throw on database errors', async () => {
    sqliteDb.close(); // Close DB to trigger error
    await expect(seed(app, db)).rejects.toThrow();
  });
});
