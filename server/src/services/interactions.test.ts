import type { Statement } from 'better-sqlite3';
import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import type { DB } from '../db/setup.js';
import { addInteraction, hasInteraction, removeInteraction } from './interactions.js';

describe('interactions service', () => {
  let stmtMock: Mocked<Partial<Statement>>;
  let dbMock: DB;

  beforeEach(() => {
    vi.clearAllMocks();

    stmtMock = {
      run: vi.fn(),
      all: vi.fn(),
      get: vi.fn(),
    };

    dbMock = {
      prepare: vi.fn().mockReturnValue(stmtMock),
      transaction: (fn: () => unknown) => () => fn(),
    } as unknown as DB;
  });

  describe('addInteraction', () => {
    it('should add user interaction', () => {
      addInteraction(dbMock, 42, 1, 'requested');

      expect(dbMock.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO'));
      expect(stmtMock.run).toHaveBeenCalledWith(42, 1, 'requested');
    });

    it('should handle ON CONFLICT by doing nothing', () => {
      // The SQL has "ON CONFLICT DO NOTHING", so duplicate calls should be idempotent
      addInteraction(dbMock, 42, 1, 'requested');
      addInteraction(dbMock, 42, 1, 'requested');

      expect(stmtMock.run).toHaveBeenCalledTimes(2);
    });
  });

  describe('hasInteraction', () => {
    it('should return true when interaction exists', () => {
      stmtMock.get = vi.fn().mockReturnValue({ count: 1 });

      const result = hasInteraction(dbMock, 42, 1, 'requested');

      expect(result).toBe(true);
      expect(stmtMock.get).toHaveBeenCalledWith(42, 1, 'requested');
    });

    it('should return false when interaction does not exist', () => {
      stmtMock.get = vi.fn().mockReturnValue({ count: 0 });

      const result = hasInteraction(dbMock, 42, 1, 'requested');

      expect(result).toBe(false);
    });

    it('should return false when query returns undefined', () => {
      stmtMock.get = vi.fn().mockReturnValue(undefined);

      const result = hasInteraction(dbMock, 42, 1, 'requested');

      expect(result).toBe(false);
    });
  });

  describe('removeInteraction', () => {
    it('should remove user interaction', () => {
      removeInteraction(dbMock, 42, 1, 'liked');

      expect(dbMock.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM'));
      expect(stmtMock.run).toHaveBeenCalledWith(42, 1, 'liked');
    });

    it('should handle all interaction types', () => {
      removeInteraction(dbMock, 42, 1, 'requested');
      removeInteraction(dbMock, 42, 1, 'liked');
      removeInteraction(dbMock, 42, 1, 'disliked');

      expect(stmtMock.run).toHaveBeenCalledTimes(3);
    });
  });
});
