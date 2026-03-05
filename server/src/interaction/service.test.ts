import type { CreateMediaInteraction } from '@findarr/shared';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DB } from '../db/setup.js';
import type { MediaDbRow } from '../media/repository.js';
import * as mediaRepository from '../media/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import { createMedia as createMediaTestHelper } from '../utils/testHelper.js';
import * as interactionRepository from './repository.js';
import {
  createInteraction,
  getUserInteractionsEnriched,
  getAllInteractionsEnriched,
} from './service.js';

const mockCreateMediaInteraction: CreateMediaInteraction = {
  mediaType: 'movie',
  tmdbId: 123,
  action: 'liked',
};

describe('interaction service - business logic', () => {
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
    dbMock = {
      transaction: (fn: () => unknown) => () => fn(),
    } as unknown as DB;

    // Spy on and mock repository functions for business logic tests
    vi.spyOn(interactionRepository, 'addInteraction').mockImplementation(() => {});
    vi.spyOn(interactionRepository, 'hasInteraction').mockReturnValue(false); // Default: not a toggle
    vi.spyOn(interactionRepository, 'removeAllInteractions').mockImplementation(() => {});
    vi.spyOn(interactionRepository, 'getVoteCounts').mockReturnValue({ likes: 0, dislikes: 0 });
    vi.spyOn(interactionRepository, 'getMediaByUserInteractions').mockReturnValue([]);
    vi.spyOn(interactionRepository, 'getAllMediaWithInteractions').mockReturnValue([]);
    vi.spyOn(interactionRepository, 'getInteractionsBatch').mockReturnValue(new Map());
    vi.spyOn(interactionRepository, 'getAllInteractionsWithUsersBatch').mockReturnValue(new Map());
    vi.spyOn(interactionRepository, 'getVoteCountsBatch').mockReturnValue(new Map());

    vi.spyOn(mediaRepository, 'createMedia').mockReturnValue(fakeRequest);
    vi.spyOn(mediaRepository, 'getMediaById').mockReturnValue(fakeRequest);
    vi.spyOn(mediaRepository, 'getMediaByTmdbId').mockReturnValue(undefined);
    vi.spyOn(mediaRepository, 'updateMediaStatus').mockImplementation(() => {});
  });

  describe('createMediaInteraction', () => {
    it('should creates a new interaction if not exists', () => {
      // Mock repository responses for the flow
      vi.mocked(mediaRepository.getMediaByTmdbId).mockReturnValueOnce(undefined); // media doesn't exist
      vi.mocked(mediaRepository.createMedia).mockReturnValueOnce(fakeRequest); // create returns media with id 1
      vi.mocked(interactionRepository.hasInteraction).mockReturnValueOnce(false); // not a toggle
      vi.mocked(interactionRepository.getVoteCounts).mockReturnValueOnce({ likes: 0, dislikes: 0 });
      vi.mocked(mediaRepository.getMediaById).mockReturnValue(fakeRequest); // threshold check and final return

      const mockUser = {
        id: 42,
        role: 'user' as const,
        email: 'test@test.com',
        displayName: 'Test',
        createdAt: Date.now(),
      };
      const result = createInteraction(dbMock, mockCreateMediaInteraction, mockUser);

      // Verify repository calls
      expect(mediaRepository.createMedia).toHaveBeenCalledWith(dbMock, 123, 'movie');
      expect(interactionRepository.removeAllInteractions).toHaveBeenCalledWith(dbMock, 42, 1);
      expect(interactionRepository.addInteraction).toHaveBeenCalledWith(dbMock, 42, 1, 'liked');
      expect(result).toEqual(fakeRequest);
    });

    it('should return undefined if no userId provided', () => {
      const result = createInteraction(dbMock, mockCreateMediaInteraction, undefined);
      expect(result).toBeUndefined();
    });

    it('should remove interaction if it already exists (toggle behavior)', () => {
      // Mock repository responses
      vi.mocked(mediaRepository.getMediaByTmdbId).mockReturnValueOnce(fakeRequest); // media exists
      vi.mocked(interactionRepository.hasInteraction).mockReturnValueOnce(true); // interaction exists (toggle)
      vi.mocked(interactionRepository.getVoteCounts).mockReturnValueOnce({ likes: 0, dislikes: 0 });
      vi.mocked(mediaRepository.getMediaById).mockReturnValue(fakeRequest); // threshold check and final return

      const mockUser = {
        id: 42,
        role: 'user' as const,
        email: 'test@test.com',
        displayName: 'Test',
        createdAt: Date.now(),
      };
      const result = createInteraction(dbMock, mockCreateMediaInteraction, mockUser);

      // Should only call removeAllInteractions, not addInteraction (toggle off)
      expect(interactionRepository.removeAllInteractions).toHaveBeenCalledWith(dbMock, 42, 1);
      expect(interactionRepository.removeAllInteractions).toHaveBeenCalledTimes(1);
      expect(interactionRepository.addInteraction).not.toHaveBeenCalled();
      expect(result).toEqual(fakeRequest);
    });

    it('should add interaction to existing media when user has not requested it', () => {
      // Mock repository responses
      vi.mocked(mediaRepository.getMediaByTmdbId).mockReturnValueOnce(fakeRequest); // media exists
      vi.mocked(interactionRepository.hasInteraction).mockReturnValueOnce(false); // not a toggle
      vi.mocked(interactionRepository.getVoteCounts).mockReturnValueOnce({ likes: 0, dislikes: 0 });
      vi.mocked(mediaRepository.getMediaById).mockReturnValue(fakeRequest); // threshold check and final return

      const mockUser = {
        id: 42,
        role: 'user' as const,
        email: 'test@test.com',
        displayName: 'Test',
        createdAt: Date.now(),
      };
      const result = createInteraction(dbMock, mockCreateMediaInteraction, mockUser);

      // Should call removeAllInteractions then addInteraction, not createMedia
      expect(mediaRepository.createMedia).not.toHaveBeenCalled();
      expect(interactionRepository.removeAllInteractions).toHaveBeenCalledWith(dbMock, 42, 1);
      expect(interactionRepository.addInteraction).toHaveBeenCalledWith(dbMock, 42, 1, 'liked');
      expect(result).toEqual(fakeRequest);
    });
  });

  describe('getUserInteractionsEnriched', () => {
    it('should return enriched user interactions', async () => {
      const mockMedia = createMediaTestHelper({ id: 123, type: 'movie' });

      vi.mocked(interactionRepository.getMediaByUserInteractions).mockReturnValue([fakeRequest]);

      const mockTmdbService = {
        getDetails: vi.fn().mockResolvedValue(mockMedia),
      } as unknown as TMDBService;

      const result = await getUserInteractionsEnriched(mockTmdbService, dbMock, 42);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 123,
        type: 'movie',
      });
      expect(mockTmdbService.getDetails).toHaveBeenCalledWith({ id: 123, type: 'movie' });
    });

    it('should return empty array if no userId', async () => {
      const mockTmdbService = {} as TMDBService;
      const result = await getUserInteractionsEnriched(mockTmdbService, dbMock, undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array if no interactions found', async () => {
      vi.mocked(interactionRepository.getMediaByUserInteractions).mockReturnValue([]);
      const mockTmdbService = {} as TMDBService;
      const result = await getUserInteractionsEnriched(mockTmdbService, dbMock, 42);
      expect(result).toEqual([]);
    });
  });

  describe('getAllInteractionsEnriched', () => {
    it('should return all enriched interactions', async () => {
      const mockMedia = createMediaTestHelper({ id: 123, type: 'movie' });

      vi.mocked(interactionRepository.getAllMediaWithInteractions).mockReturnValue([fakeRequest]);

      const mockTmdbService = {
        getDetails: vi.fn().mockResolvedValue(mockMedia),
      } as unknown as TMDBService;

      const result = await getAllInteractionsEnriched(mockTmdbService, dbMock);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 123,
        type: 'movie',
      });
      expect(mockTmdbService.getDetails).toHaveBeenCalledWith({ id: 123, type: 'movie' });
    });

    it('should return empty array if no interactions found', async () => {
      vi.mocked(interactionRepository.getAllMediaWithInteractions).mockReturnValue([]);
      const mockTmdbService = {} as TMDBService;
      const result = await getAllInteractionsEnriched(mockTmdbService, dbMock);
      expect(result).toEqual([]);
    });
  });
});
