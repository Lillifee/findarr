import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getUserByEmail } from '../services/user.js';
import { seed } from './seed.js';
import { createDatabase } from './setup.js';
import type { DB } from './setup.js';

describe('seed', () => {
  let app: FastifyInstance;
  let db: DB;

  const settings = {
    email: 'admin@findarr.com',
    password: 'changeme',
  };

  beforeEach(() => {
    app = Fastify();
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates an admin user if not present', async () => {
    const adminBefore = getUserByEmail(db, settings.email);
    expect(adminBefore).toBeFalsy();
    await seed(app, db);
    const adminAfter = getUserByEmail(db, settings.email);
    expect(adminAfter).toBeDefined();
    expect(adminAfter?.role).toBe('admin');
  });

  it('does not create duplicate admin user', async () => {
    await seed(app, db);
    const admin1 = getUserByEmail(db, settings.email);
    await seed(app, db);
    const admin2 = getUserByEmail(db, settings.email);
    expect(admin1?.id).toBe(admin2?.id);
  });

  it('should throw on database errors', async () => {
    db.close(); // Close DB to trigger error
    await expect(seed(app, db)).rejects.toThrow();
  });
});
