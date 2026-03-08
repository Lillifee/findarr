import type { Media } from '@findarr/shared';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DB } from '../db/setup.js';
import * as interactionRepository from '../interaction/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import { createTestMedia } from '../utils/testHelper.js';
import { enrichWithRecords, enrichWithInteractions, fetchTMDBDetails } from './enrichment.js';
import type { MediaDbRow } from './repository.js';
import * as mediaRepository from './repository.js';

describe('enrichment service', () => {
  let dbMock: DB;

  const mockMediaItem: Media = createTestMedia({
    id: 123,
    type: 'movie',
  });

  const mockDbRow: MediaDbRow = {
    id: 1,
    tmdbId: 123,
    mediaType: 'movie',
    status: 'requested',
    jellyfinId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    dbMock = {
      transaction: (fn: () => unknown) => () => fn(),
    } as unknown as DB;

    // Spy on repository functions
    vi.spyOn(mediaRepository, 'getMediaRecordsBatch').mockResolvedValue(new Map());
    vi.spyOn(interactionRepository, 'getInteractionsBatch').mockResolvedValue(new Map());
    vi.spyOn(interactionRepository, 'getAllInteractionsWithUsersBatch').mockResolvedValue(
      new Map()
    );
    vi.spyOn(interactionRepository, 'getVoteCountsBatch').mockResolvedValue(new Map());
  });

  describe('enrichWithRecords', () => {
    it('should return empty array for empty input', async () => {
      const result = await enrichWithRecords(dbMock, []);
      expect(result).toEqual([]);
    });

    it('should add database records to media items', async () => {
      const mediaItems: Media[] = [
        createTestMedia({ id: 123, type: 'movie' }),
        createTestMedia({ id: 456, type: 'tv' }),
      ];

      const dbRecordsMap = new Map([
        [
          '123_movie',
          {
            id: 1,
            status: 'requested' as const,
            jellyfinId: null,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        [
          '456_tv',
          {
            id: 2,
            status: 'available' as const,
            jellyfinId: 'jf-123',
            createdAt: 2000,
            updatedAt: 2000,
          },
        ],
      ]);

      vi.mocked(mediaRepository.getMediaRecordsBatch).mockResolvedValue(dbRecordsMap);

      const result = await enrichWithRecords(dbMock, mediaItems);

      expect(result[0]?.state?.record).toEqual({
        id: 1,
        status: 'requested',
        jellyfinId: null,
        createdAt: 1000,
        updatedAt: 1000,
      });
      expect(result[1]?.state?.record).toEqual({
        id: 2,
        status: 'available',
        jellyfinId: 'jf-123',
        createdAt: 2000,
        updatedAt: 2000,
      });
    });

    it('should handle media items without database records', async () => {
      const mediaItems: Media[] = [createTestMedia({ id: 123, type: 'movie' })];

      vi.mocked(mediaRepository.getMediaRecordsBatch).mockResolvedValue(new Map());

      const result = await enrichWithRecords(dbMock, mediaItems);

      expect(result[0]?.state?.record).toBeUndefined();
    });
  });

  describe('enrichWithInteractions', () => {
    it('should enrich with user-specific interactions when userId is provided', async () => {
      const mediaItems: Media[] = [
        createTestMedia({
          id: 123,
          type: 'movie',
          state: {
            record: {
              id: 1,
              status: 'requested',
              jellyfinId: null,
              createdAt: 1000,
              updatedAt: 1000,
            },
          },
        }),
      ];

      const interactionsMap = new Map([
        [
          1,
          [
            { id: 123, action: 'liked' as const, createdAt: 1000 },
            { id: 124, action: 'liked' as const, createdAt: 2000 },
          ],
        ],
      ]);

      const votesMap = new Map([[1, { likes: 2, dislikes: 0 }]]);

      vi.mocked(interactionRepository.getInteractionsBatch).mockResolvedValue(interactionsMap);
      vi.mocked(interactionRepository.getVoteCountsBatch).mockResolvedValue(votesMap);

      const result = await enrichWithInteractions(dbMock, mediaItems, 999);

      expect(result[0]?.state?.interactions).toEqual([
        { id: 123, action: 'liked', createdAt: 1000 },
        { id: 124, action: 'liked', createdAt: 2000 },
      ]);
      expect(result[0]?.state?.votes).toEqual({ likes: 2, dislikes: 0 });
    });

    it('should enrich with all interactions including user info when userId is undefined', async () => {
      const mediaItems: Media[] = [
        createTestMedia({
          id: 123,
          type: 'movie',
          state: {
            record: {
              id: 1,
              status: 'requested',
              jellyfinId: null,
              createdAt: 1000,
              updatedAt: 1000,
            },
          },
        }),
      ];

      const allInteractionsMap = new Map([
        [
          1,
          [
            {
              id: 555,
              action: 'liked' as const,
              createdAt: 1000,
              userInfo: {
                id: 42,
                email: 'user@example.com',
                displayName: 'John Doe',
              },
            },
          ],
        ],
      ]);

      const votesMap = new Map([[1, { likes: 1, dislikes: 0 }]]);

      vi.mocked(interactionRepository.getAllInteractionsWithUsersBatch).mockResolvedValue(
        allInteractionsMap
      );
      vi.mocked(interactionRepository.getVoteCountsBatch).mockResolvedValue(votesMap);

      const result = await enrichWithInteractions(dbMock, mediaItems, undefined);

      expect(result[0]?.state?.interactions).toEqual([
        {
          id: 555,
          action: 'liked',
          createdAt: 1000,
          userInfo: {
            id: 42,
            email: 'user@example.com',
            displayName: 'John Doe',
          },
        },
      ]);
      expect(result[0]?.state?.votes).toEqual({ likes: 1, dislikes: 0 });
    });

    it('should skip items without database records', async () => {
      const mediaItems: Media[] = [createTestMedia({ id: 123, type: 'movie' })];

      vi.mocked(interactionRepository.getInteractionsBatch).mockResolvedValue(new Map());
      vi.mocked(interactionRepository.getVoteCountsBatch).mockResolvedValue(new Map());

      const result = await enrichWithInteractions(dbMock, mediaItems, 42);

      expect(result[0]?.state?.interactions).toBeUndefined();
    });

    it('should return empty interactions map when no media IDs', async () => {
      const mediaItems: Media[] = [createTestMedia({ id: 123, type: 'movie' })];

      await enrichWithInteractions(dbMock, mediaItems, 42);

      expect(interactionRepository.getInteractionsBatch).toHaveBeenCalledWith(
        dbMock,
        mediaItems,
        42
      );
      expect(interactionRepository.getVoteCountsBatch).toHaveBeenCalledWith(dbMock, mediaItems);
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
            status: 'requested',
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
