import type { ServerEnvSeed } from '@findarr/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getUserByEmail } from '../services/user.js';
import { seed } from './seed.js';
import { createDatabase } from './setup.js';
import type { DB } from './setup.js';

describe('seed', () => {
  let app: FastifyInstance;
  let db: DB;

  const serverEnvSeed: ServerEnvSeed = {
    ADMIN_EMAIL: 'admin@findarr.local',
    ADMIN_PASSWORD: 'changeme',
  };

  beforeEach(() => {
    app = Fastify();
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates an admin user if not present', async () => {
    const adminBefore = getUserByEmail(db, serverEnvSeed.ADMIN_EMAIL);
    expect(adminBefore).toBeFalsy();
    await seed(app, db, serverEnvSeed);
    const adminAfter = getUserByEmail(db, serverEnvSeed.ADMIN_EMAIL);
    expect(adminAfter).toBeDefined();
    expect(adminAfter?.role).toBe('admin');
  });

  it('does not create duplicate admin user', async () => {
    await seed(app, db, serverEnvSeed);
    const admin1 = getUserByEmail(db, serverEnvSeed.ADMIN_EMAIL);
    await seed(app, db, serverEnvSeed);
    const admin2 = getUserByEmail(db, serverEnvSeed.ADMIN_EMAIL);
    expect(admin1?.id).toBe(admin2?.id);
  });
});
