import type { CreateMediaRequest } from '@findarr/shared';
import type { Statement } from 'better-sqlite3';
import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import type { DB } from '../db/setup.js';
import type { TMDBService } from '../tmdb/service.js';
import { createMedia } from '../utils/testHelper.js';
import type { MediaDbRow } from './media.js';
import {
  createRequest,
  updateRequestStatus,
  getUserRequests,
  getAllRequests,
  getUserRequestById,
  getUserRequestsEnriched,
  getAllRequestsEnriched,
} from './request.js';

const mockCreateMediaRequest: CreateMediaRequest = {
  mediaType: 'movie',
  tmdbId: 123,
};

describe('request service', () => {
  let stmtMock: Mocked<Partial<Statement<MediaDbRow>>>;
  let dbMock: DB;

  const fakeRequest: MediaDbRow = {
    id: 1,
    mediaType: 'movie',
    tmdbId: 123,
    jellyfinId: null,
    status: 'pending',
    createdAt: Date.now(),
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
      transaction: (fn: () => unknown) => () => fn(),
    } as unknown as DB;
  });

  describe('createRequest', () => {
    it('should creates a new request if not exists', () => {
      // First get → check existing media by tmdbId (undefined)
      // Second get → fetch inserted row after creation
      stmtMock.get = vi
        .fn()
        .mockReturnValueOnce(undefined) // getMediaByTmdbId
        .mockReturnValueOnce(fakeRequest); // getMediaById
      stmtMock.run = vi.fn().mockReturnValue({ lastInsertRowid: 1 });

      const result = createRequest(dbMock, mockCreateMediaRequest, 42);
      // First run: createMedia(db, tmdbId, mediaType, 'pending')
      expect(stmtMock.run).toHaveBeenNthCalledWith(1, 123, 'movie', 'pending');
      // Second run: addInteraction(db, userId, mediaId, 'requested')
      expect(stmtMock.run).toHaveBeenNthCalledWith(2, 42, 1, 'requested');
      expect(result).toEqual(fakeRequest);
    });

    it('should return undefined if no userId provided', () => {
      const result = createRequest(dbMock, mockCreateMediaRequest, undefined);
      expect(result).toBeUndefined();
    });

    it('should throw if request already exists', () => {
      // First get → media exists
      // Second get → hasInteraction returns true (count > 0)
      stmtMock.get = vi
        .fn()
        .mockReturnValueOnce(fakeRequest) // getMediaByTmdbId
        .mockReturnValueOnce({ count: 1 }); // hasInteraction
      expect(() => createRequest(dbMock, mockCreateMediaRequest, 42)).toThrow(
        'You have already requested this media'
      );
    });

    it('should add interaction to existing media when user has not requested it', () => {
      // First get → media exists
      // Second get → hasInteraction returns false (count = 0)
      // Third get → fetch updated row
      stmtMock.get = vi
        .fn()
        .mockReturnValueOnce(fakeRequest) // getMediaByTmdbId
        .mockReturnValueOnce({ count: 0 }) // hasInteraction
        .mockReturnValueOnce(fakeRequest); // getMediaById
      stmtMock.run = vi.fn().mockReturnValue({ lastInsertRowid: 1 });

      const result = createRequest(dbMock, mockCreateMediaRequest, 42);

      // Should only call addInteraction, not createMedia
      expect(stmtMock.run).toHaveBeenCalledWith(42, 1, 'requested');
      expect(result).toEqual(fakeRequest);
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
      expect(() => updateRequestStatus(dbMock, 999, 'approved')).toThrow('Media not found');
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
      // First get → getMediaById
      // Second get → hasInteraction (returns true, count > 0)
      stmtMock.get = vi
        .fn()
        .mockReturnValueOnce(fakeRequest) // getMediaById
        .mockReturnValueOnce({ count: 1 }); // hasInteraction
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

  describe('getUserRequestsEnriched', () => {
    it('should return enriched user requests', async () => {
      const mockMedia = createMedia({ id: 123, type: 'movie' });

      stmtMock.all = vi.fn().mockReturnValue([fakeRequest]);

      const mockTmdbService = {
        getDetails: vi.fn().mockResolvedValue(mockMedia),
      } as unknown as TMDBService;

      const result = await getUserRequestsEnriched(mockTmdbService, dbMock, 42);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 123,
        type: 'movie',
      });
      expect(mockTmdbService.getDetails).toHaveBeenCalledWith({ id: 123, type: 'movie' });
    });

    it('should return empty array if no userId', async () => {
      const mockTmdbService = {} as TMDBService;
      const result = await getUserRequestsEnriched(mockTmdbService, dbMock, undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array if no requests found', async () => {
      stmtMock.all = vi.fn().mockReturnValue([]);
      const mockTmdbService = {} as TMDBService;
      const result = await getUserRequestsEnriched(mockTmdbService, dbMock, 42);
      expect(result).toEqual([]);
    });
  });

  describe('getAllRequestsEnriched', () => {
    it('should return all enriched requests', async () => {
      const mockMedia = createMedia({ id: 123, type: 'movie' });

      stmtMock.all = vi.fn().mockReturnValue([fakeRequest]);

      const mockTmdbService = {
        getDetails: vi.fn().mockResolvedValue(mockMedia),
      } as unknown as TMDBService;

      const result = await getAllRequestsEnriched(mockTmdbService, dbMock);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 123,
        type: 'movie',
      });
      expect(mockTmdbService.getDetails).toHaveBeenCalledWith({ id: 123, type: 'movie' });
    });

    it('should return empty array if no requests found', async () => {
      stmtMock.all = vi.fn().mockReturnValue([]);
      const mockTmdbService = {} as TMDBService;
      const result = await getAllRequestsEnriched(mockTmdbService, dbMock);
      expect(result).toEqual([]);
    });
  });
});
