import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as setupModule from '../db/setup.js';
import databasePlugin from './database.js';

describe('databasePlugin', () => {
  let app: FastifyInstance;

  const mockDb = {
    close: vi.fn(),
  };

  beforeEach(async () => {
    app = Fastify();

    vi.spyOn(setupModule, 'createDatabase').mockReturnValue(mockDb as unknown as setupModule.DB);
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('should decorate fastify instance with db', async () => {
    await app.register(databasePlugin, { dbPath: ':memory:' });

    await app.ready();

    expect(setupModule.createDatabase).toHaveBeenCalledWith(':memory:');
    expect(app.db).toBe(mockDb);
  });

  it('should close database on app shutdown', async () => {
    await app.register(databasePlugin, { dbPath: ':memory:' });

    await app.ready();
    await app.close();

    expect(mockDb.close).toHaveBeenCalled();
  });
});
