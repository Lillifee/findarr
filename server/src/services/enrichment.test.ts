import type { Media, MediaInteraction, MediaInteractionWithUser } from '@findarr/shared';
import type { Statement } from 'better-sqlite3';
import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import type { DB } from '../db/setup.js';
import type { TMDBService } from '../tmdb/service.js';
import { createMedia } from '../utils/testHelper.js';
import {
  addDatabaseRecords,
  addInteractions,
  addAllInteractions,
  fetchTMDBDetails,
} from './enrichment.js';
import type { MediaDbRow } from './media.js';

describe('enrichment service', () => {
  let stmtMock: Mocked<Partial<Statement>>;
  let dbMock: DB;

  const mockMediaItem: Media = createMedia({
    id: 123,
    type: 'movie',
  });

  const mockDbRow: MediaDbRow = {
    id: 1,
    tmdbId: 123,
    mediaType: 'movie',
    status: 'pending',
    jellyfinId: null,
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

  describe('addDatabaseRecords', () => {
    it('should return empty array for empty input', () => {
      const result = addDatabaseRecords(dbMock, []);
      expect(result).toEqual([]);
    });

    it('should add database records to media items', () => {
      const mediaItems: Media[] = [
        createMedia({ id: 123, type: 'movie' }),
        createMedia({ id: 456, type: 'tv' }),
      ];

      const dbRecords = [
        {
          id: 1,
          tmdbId: 123,
          mediaType: 'movie',
          status: 'pending',
          jellyfinId: null,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 2,
          tmdbId: 456,
          mediaType: 'tv',
          status: 'approved',
          jellyfinId: 'jf-123',
          createdAt: 2000,
          updatedAt: 2000,
        },
      ];

      stmtMock.all = vi.fn().mockReturnValue(dbRecords);

      const result = addDatabaseRecords(dbMock, mediaItems);

      expect(result[0]?.state?.record).toEqual({
        id: 1,
        status: 'pending',
        jellyfinId: null,
        createdAt: 1000,
        updatedAt: 1000,
      });
      expect(result[1]?.state?.record).toEqual({
        id: 2,
        status: 'approved',
        jellyfinId: 'jf-123',
        createdAt: 2000,
        updatedAt: 2000,
      });
    });

    it('should handle media items without database records', () => {
      const mediaItems: Media[] = [createMedia({ id: 123, type: 'movie' })];

      stmtMock.all = vi.fn().mockReturnValue([]);

      const result = addDatabaseRecords(dbMock, mediaItems);

      expect(result[0]?.state?.record).toBeUndefined();
    });
  });

  describe('addInteractions', () => {
    it('should add user interactions to media items', () => {
      const mediaItems: Media[] = [
        createMedia({
          id: 123,
          type: 'movie',
          state: {
            record: {
              id: 1,
              status: 'pending',
              jellyfinId: null,
              createdAt: 1000,
              updatedAt: 1000,
            },
          },
        }),
      ];

      const interactions: (MediaInteraction & { mediaId: number })[] = [
        { mediaId: 1, action: 'requested', createdAt: 1000 },
        { mediaId: 1, action: 'liked', createdAt: 2000 },
      ];

      stmtMock.all = vi.fn().mockReturnValue(interactions);

      const result = addInteractions(dbMock, mediaItems, 42);

      expect(result[0]?.state?.interactions).toEqual([
        { action: 'requested', createdAt: 1000 },
        { action: 'liked', createdAt: 2000 },
      ]);
    });

    it('should skip items without database records', () => {
      const mediaItems: Media[] = [createMedia({ id: 123, type: 'movie' })];

      stmtMock.all = vi.fn().mockReturnValue([]);

      const result = addInteractions(dbMock, mediaItems, 42);

      expect(result[0]?.state?.interactions).toBeUndefined();
    });

    it('should return empty interactions map when no media IDs', () => {
      const mediaItems: Media[] = [createMedia({ id: 123, type: 'movie' })];

      addInteractions(dbMock, mediaItems, 42);

      expect(dbMock.prepare).not.toHaveBeenCalled();
    });
  });

  describe('addAllInteractions', () => {
    it('should add all interactions with user info', () => {
      const mediaItems: Media[] = [
        createMedia({
          id: 123,
          type: 'movie',
          state: {
            record: {
              id: 1,
              status: 'pending',
              jellyfinId: null,
              createdAt: 1000,
              updatedAt: 1000,
            },
          },
        }),
      ];

      const allInteractions: (MediaInteractionWithUser & { mediaId: number })[] = [
        {
          mediaId: 1,
          action: 'requested',
          createdAt: 1000,
          userId: 42,
          userEmail: 'user@example.com',
          userDisplayName: 'John Doe',
        },
      ];

      stmtMock.all = vi.fn().mockReturnValue(allInteractions);

      const result = addAllInteractions(dbMock, mediaItems);

      expect(result[0]?.state?.allInteractions).toEqual([
        {
          action: 'requested',
          createdAt: 1000,
          userId: 42,
          userEmail: 'user@example.com',
          userDisplayName: 'John Doe',
        },
      ]);
    });

    it('should skip items without database records', () => {
      const mediaItems: Media[] = [createMedia({ id: 123, type: 'movie' })];

      stmtMock.all = vi.fn().mockReturnValue([]);

      const result = addAllInteractions(dbMock, mediaItems);

      expect(result[0]?.state?.allInteractions).toBeUndefined();
    });

    it('should return empty map when no media IDs', () => {
      const mediaItems: Media[] = [createMedia({ id: 123, type: 'movie' })];

      addAllInteractions(dbMock, mediaItems);

      expect(dbMock.prepare).not.toHaveBeenCalled();
    });
  });

  describe('fetchTMDBDetails', () => {
    it('should fetch TMDB details for database records', async () => {
      const dbRows: MediaDbRow[] = [mockDbRow];

      const mockTmdbService = {
        getDetails: vi.fn().mockResolvedValue(mockMediaItem),
      } as unknown as TMDBService;

      const result = await fetchTMDBDetails(mockTmdbService, dbRows);

      expect(mockTmdbService.getDetails).toHaveBeenCalledWith({ id: 123, type: 'movie' });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 123,
        type: 'movie',
        state: {
          record: {
            id: 1,
            status: 'pending',
            jellyfinId: null,
            createdAt: mockDbRow.createdAt,
            updatedAt: mockDbRow.updatedAt,
          },
        },
      });
    });

    it('should filter out failed TMDB lookups', async () => {
      const dbRows: MediaDbRow[] = [mockDbRow, { ...mockDbRow, id: 2, tmdbId: 999 }];

      const mockTmdbService = {
        getDetails: vi
          .fn()
          .mockResolvedValueOnce(mockMediaItem)
          .mockRejectedValueOnce(new Error('Not found')),
      } as unknown as TMDBService;

      const result = await fetchTMDBDetails(mockTmdbService, dbRows);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(123);
    });

    it('should return empty array for empty input', async () => {
      const mockTmdbService = {} as TMDBService;
      const result = await fetchTMDBDetails(mockTmdbService, []);
      expect(result).toEqual([]);
    });
  });
});
