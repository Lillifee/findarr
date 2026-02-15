import type { CreateMediaRequest, MediaRequest } from '@findarr/shared';
import type { Statement } from 'better-sqlite3';
import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import type { DB } from '../db/setup.js';
import {
  createRequest,
  updateRequestStatus,
  getUserRequests,
  getAllRequests,
  getUserRequestById,
} from './request.js';

const mockCreateMediaRequest: CreateMediaRequest = {
  mediaType: 'movie',
  tmdbId: 123,
  title: 'Test Movie',
  posterPath: '/test.jpg',
};

describe('request service', () => {
  let stmtMock: Mocked<Partial<Statement<MediaRequest>>>;
  let dbMock: DB;

  const fakeRequest: MediaRequest = {
    id: 1,
    userId: 1,
    mediaType: 'movie',
    tmdbId: 123,
    title: 'Test Movie',
    posterPath: '/test.jpg',
    status: 'pending',
    requestedAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    stmtMock = {
      run: vi.fn(),
      all: vi.fn(),
      get: vi.fn(),
    };

    dbMock = {
      prepare: vi.fn().mockReturnValue(stmtMock),
    } as unknown as DB;
  });

  describe('createRequest', () => {
    it('should creates a new request if not exists', () => {
      // First get → check existing (undefined)
      // Second get → fetch inserted row
      stmtMock.get = vi.fn().mockReturnValueOnce(undefined).mockReturnValueOnce(fakeRequest);
      stmtMock.run = vi.fn().mockReturnValue({ lastInsertRowid: 1 });

      const result = createRequest(dbMock, mockCreateMediaRequest, 42);
      expect(stmtMock.run).toHaveBeenCalledWith(42, 'movie', 123, 'Test Movie', '/test.jpg');
      expect(result).toEqual(fakeRequest);
    });

    it('should return undefined if no userId provided', () => {
      const result = createRequest(dbMock, mockCreateMediaRequest, undefined);
      expect(result).toBeUndefined();
    });

    it('should throw if request already exists', () => {
      stmtMock.get = vi.fn().mockReturnValue(fakeRequest);
      expect(() => createRequest(dbMock, mockCreateMediaRequest, 42)).toThrow(
        'Media already requested'
      );
    });
  });

  describe('updateRequestStatus', () => {
    it('should update request status', () => {
      stmtMock.run = vi.fn().mockReturnValue({ changes: 1 });
      updateRequestStatus(dbMock, 1, 'approved');
      expect(stmtMock.run).toHaveBeenCalledWith('approved', 1);
    });

    it('should throw if no rows updated', () => {
      stmtMock.run = vi.fn().mockReturnValue({ changes: 0 });
      expect(() => updateRequestStatus(dbMock, 999, 'approved')).toThrow('Request not found');
    });
  });

  describe('getUserRequests', () => {
    it('should return user requests', () => {
      stmtMock.all = vi.fn().mockReturnValue([fakeRequest]);
      const result = getUserRequests(dbMock, 1);
      expect(stmtMock.all).toHaveBeenCalledWith(1);
      expect(result).toEqual([fakeRequest]);
    });

    it('should return undefined if no userId', () => {
      const result = getUserRequests(dbMock, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('getAllRequests', () => {
    it('should return all requests', () => {
      stmtMock.all = vi.fn().mockReturnValue([fakeRequest]);
      const result = getAllRequests(dbMock);
      expect(result).toEqual([fakeRequest]);
    });
  });

  describe('getUserRequestById', () => {
    it('should return request for same user', () => {
      stmtMock.get = vi.fn().mockReturnValue(fakeRequest);
      const result = getUserRequestById(dbMock, 1, 1, 'user');
      expect(result).toEqual(fakeRequest);
    });

    it('should throw if request does not exist', () => {
      stmtMock.get = vi.fn().mockReturnValue(undefined);
      expect(() => getUserRequestById(dbMock, 999, 1, 'user')).toThrow('Request not found');
    });

    it('should throw if user is not owner and not admin', () => {
      stmtMock.get = vi.fn().mockReturnValue(fakeRequest);
      expect(() => getUserRequestById(dbMock, 1, 999, 'user')).toThrow('Access denied');
    });

    it('should allow admin access', () => {
      stmtMock.get = vi.fn().mockReturnValue(fakeRequest);
      const result = getUserRequestById(dbMock, 1, 999, 'admin');
      expect(result).toEqual(fakeRequest);
    });
  });
});
