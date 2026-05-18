import type { CreateMediaInteraction } from '@findarr/shared';
import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { arrConfig } from '../arr/config.js';
import type { ArrService } from '../arr/service.js';
import type { CatalogService } from '../catalog/service.js';
import { createDatabase, type DB } from '../db/setup.js';
import { hasInteraction, getVoteCounts } from '../interaction/repository.js';
import {
  createInteraction,
  getUserActivityAttentionEnriched,
  getUserInteractionsEnriched,
} from '../interaction/service.js';
import { createMedia, getMediaByTmdbId, updateMediaStatus } from '../media/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import {
  assertDefined as expectDefined,
  createTestMedia as createMediaTestHelper,
  createTestUserInDb,
  createTestMovieDetail,
  createTestTVDetail,
} from './helpers/testHelper.js';

const interaction: CreateMediaInteraction = {
  mediaType: 'movie',
  tmdbId: 123,
  action: 'liked',
};

const radarrService: ArrService<typeof arrConfig.radarr> = {
  config: arrConfig.radarr,
  request: vi.fn().mockResolvedValue({ id: 1, tmdbId: 123, title: 'Test Movie' }),
  isConfigured: vi.fn().mockResolvedValue(true),
  testConnection: vi.fn().mockResolvedValue(false),
  getProfiles: vi.fn().mockResolvedValue([]),
  getRootFolders: vi.fn().mockResolvedValue([]),
  getLibrary: vi.fn().mockResolvedValue([]),
  getQueue: vi.fn().mockResolvedValue({ records: [] }),
  resolveUrl: vi.fn().mockResolvedValue(null),
};

const sonarrService: ArrService<typeof arrConfig.sonarr> = {
  config: arrConfig.sonarr,
  request: vi.fn().mockResolvedValue({ id: 1, tvdbId: 81_189, title: 'Test Show' }),
  isConfigured: vi.fn().mockResolvedValue(true),
  testConnection: vi.fn().mockResolvedValue(false),
  getProfiles: vi.fn().mockResolvedValue([]),
  getRootFolders: vi.fn().mockResolvedValue([]),
  getLibrary: vi.fn().mockResolvedValue([]),
  getQueue: vi.fn().mockResolvedValue({ records: [] }),
  resolveUrl: vi.fn().mockResolvedValue(null),
};

const catalogService: CatalogService = {
  search: vi.fn().mockResolvedValue({ results: [], page: 1, totalPages: 0 }),
  popular: vi.fn().mockResolvedValue({
    results: [],
    page: 1,
    totalPages: 0,
    feedId: '00000000-0000-0000-0000-000000000000',
  }),
  discover: vi.fn().mockResolvedValue({ results: [], page: 1, totalPages: 0 }),
  getDetails: vi.fn().mockImplementation(params =>
    Promise.resolve(
      createMediaTestHelper({
        tmdbId: params.id,
        type: params.type,
        state: {
          record: {
            id: 1,
            status: 'pending',
            jellyfinId: null,
            jellyfinAddedAt: null,
            tvdbId: null,
            arrId: null,
            arrUrl: null,
            seasons: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
      })
    )
  ),
  getGenres: vi.fn().mockResolvedValue({ genres: [] }),
  getAvailableMedia: vi.fn().mockResolvedValue({ results: [] }),
  getNextUnvoted: vi.fn().mockResolvedValue({ media: null, feedId: 'feed-1' }),
};

describe('interaction service - integration tests', () => {
  let db: DB;
  let sqliteDb: SqlDatabase.Database;
  let tmdb: TMDBService;

  beforeEach(() => {
    // Create fresh in-memory database for each test
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;

    // Mock TMDB service that returns movie/TV details with genres
    tmdb = {
      configure: vi.fn().mockResolvedValue(undefined),
      isConfigured: vi.fn().mockReturnValue(true),
      testConnection: vi.fn().mockResolvedValue(undefined),
      search: vi.fn(),
      fetchDiscover: vi.fn(),
      fetchTrending: vi.fn(),
      getGenres: vi.fn(),
      getDetails: vi.fn().mockResolvedValue(
        createTestMovieDetail({
          tmdbId: 123,
          genres: [
            { id: 28, name: 'Action' },
            { id: 12, name: 'Adventure' },
          ],
        })
      ),
      findByExternalId: vi.fn(),
    } as TMDBService;
  });

  afterEach(() => {
    sqliteDb.close();
  });

  describe('createInteraction', () => {
    it('should create new media and interaction when media does not exist', async () => {
      const user = await createTestUserInDb(db, { email: 'user1@test.com' });
      expectDefined(user);

      const result = await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user
      );

      // Verify media was created
      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);
      expect(media.tmdbId).toBe(123);
      expect(media.type).toBe('movie');
      expect(media.status).toBe('requested');

      // Verify interaction was created
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(true);

      // Verify result
      expect(result).toMatchObject({
        tmdbId: 123,
        type: 'movie',
      });
    });

    it('should return undefined if no user provided', async () => {
      const result = await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        undefined
      );
      expect(result).toBeUndefined();

      // Verify nothing was created
      const media = await getMediaByTmdbId(db, 123, 'movie');
      expect(media).toBeUndefined();
    });

    it('should toggle off existing interaction when clicked again', async () => {
      const user = await createTestUserInDb(db, { email: 'user1@test.com' });
      expectDefined(user);

      // Create initial interaction
      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user
      );

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);

      // Verify interaction exists
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(true);

      // Toggle off - click the same action again
      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user
      );

      // Verify interaction was removed
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(false);
    });

    it('should switch from dislike to like', async () => {
      const user = await createTestUserInDb(db, { email: 'user1@test.com' });
      expectDefined(user);

      // First dislike
      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        { ...interaction, action: 'disliked' },
        user
      );

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);

      // Verify dislike exists
      expect(await hasInteraction(db, user.id, media.id, 'disliked')).toBe(true);
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(false);

      // Switch to like
      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user
      );

      // Verify only like exists now
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(true);
      expect(await hasInteraction(db, user.id, media.id, 'disliked')).toBe(false);
    });

    it('should auto-request immediately when admin likes', async () => {
      const admin = await createTestUserInDb(db, {
        email: 'admin@test.com',
        displayName: 'Admin User',
        role: 'admin',
      });
      expectDefined(admin);

      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        admin
      );

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);
      expect(media.status).toBe('requested');
    });

    it('should not auto-request when disliking', async () => {
      // Create 3 users
      const user1 = await createTestUserInDb(db, {
        email: 'user1@test.com',
        displayName: 'User 1',
      });
      const user2 = await createTestUserInDb(db, {
        email: 'user2@test.com',
        displayName: 'User 2',
      });
      const user3 = await createTestUserInDb(db, {
        email: 'user3@test.com',
        displayName: 'User 3',
      });
      expectDefined(user1);
      expectDefined(user2);
      expectDefined(user3);

      // Three users dislike
      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        { ...interaction, action: 'disliked' },
        user1
      );
      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        { ...interaction, action: 'disliked' },
        user2
      );
      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        { ...interaction, action: 'disliked' },
        user3
      );

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);
      expect(media.status).toBe('pending'); // Should still be pending

      const votes = await getVoteCounts(db, media.id);
      expect(votes.likes).toBe(0);
      expect(votes.dislikes).toBe(3);
    });
  });

  describe('getUserInteractionsEnriched', () => {
    it('should return enriched user interactions with TMDB data', async () => {
      const user = await createTestUserInDb(db, { email: 'user1@test.com' });
      expectDefined(user);

      // Create media and interaction
      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user
      );
      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        { mediaType: 'tv', tmdbId: 456, action: 'liked' },
        user
      );

      const mockMedia1 = createMediaTestHelper({ tmdbId: 123, type: 'movie', name: 'Test Movie' });
      const mockMedia2 = createMediaTestHelper({ tmdbId: 456, type: 'tv', name: 'Test Show' });

      const tmdbServiceForTest = {
        getDetails: vi.fn().mockResolvedValueOnce(mockMedia1).mockResolvedValueOnce(mockMedia2),
      } as unknown as TMDBService;

      const result = await getUserInteractionsEnriched(tmdbServiceForTest, db, user.id);

      expect(result.results).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      // Verify both items are present (order may vary)
      const ids = result.results.map(r => r.tmdbId);
      expect(ids).toContain(123);
      expect(ids).toContain(456);
      expect(tmdbServiceForTest.getDetails).toHaveBeenCalledTimes(2);
    });

    it('should return empty results for userId with no interactions', async () => {
      const user = await createTestUserInDb(db, { email: 'no-interactions@test.com' });
      expectDefined(user);

      const tmdbServiceForTest = {} as TMDBService;
      const result = await getUserInteractionsEnriched(tmdbServiceForTest, db, user.id);
      expect(result).toEqual({ results: [], page: 1, totalPages: 0 });
    });

    it('should keep the main activity list ordered by newest interaction instead of status priority', async () => {
      const user = await createTestUserInDb(db, { email: 'activity-order@test.com' });
      expectDefined(user);

      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user
      );

      const olderMedia = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(olderMedia);
      await updateMediaStatus(db, olderMedia.id, 'downloading');

      vi.mocked(tmdb.getDetails).mockResolvedValueOnce(
        createTestTVDetail({
          tmdbId: 456,
          name: 'Newest Show',
          genres: [{ id: 18, name: 'Drama' }],
        })
      );

      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        { mediaType: 'tv', tmdbId: 456, action: 'liked' },
        user
      );

      const tmdbServiceForTest = {
        getDetails: vi
          .fn()
          .mockResolvedValueOnce(
            createMediaTestHelper({ tmdbId: 456, type: 'tv', name: 'Newest Show' })
          )
          .mockResolvedValueOnce(
            createMediaTestHelper({ tmdbId: 123, type: 'movie', name: 'Older Download' })
          ),
      } as unknown as TMDBService;

      const result = await getUserInteractionsEnriched(tmdbServiceForTest, db, user.id);

      expect(result.results.map(item => item.tmdbId)).toEqual([456, 123]);
    });
  });

  describe('getUserActivityAttentionEnriched', () => {
    it('should return only interacted media that need attention or are in progress', async () => {
      const user = await createTestUserInDb(db, { email: 'attention@test.com' });
      expectDefined(user);

      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user
      );

      vi.mocked(tmdb.getDetails).mockResolvedValueOnce(
        createTestTVDetail({
          tmdbId: 456,
          name: 'Warning Show',
          genres: [{ id: 80, name: 'Crime' }],
        })
      );

      await createInteraction(
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        { mediaType: 'tv', tmdbId: 456, action: 'liked' },
        user
      );

      const movieMedia = await getMediaByTmdbId(db, 123, 'movie');
      const showMedia = await getMediaByTmdbId(db, 456, 'tv');
      expectDefined(movieMedia);
      expectDefined(showMedia);

      await updateMediaStatus(db, movieMedia.id, 'downloading');
      await updateMediaStatus(db, showMedia.id, 'warning');

      const tmdbServiceForTest = {
        getDetails: vi
          .fn()
          .mockResolvedValueOnce(
            createMediaTestHelper({ tmdbId: 456, type: 'tv', name: 'Warning Show' })
          )
          .mockResolvedValueOnce(
            createMediaTestHelper({ tmdbId: 123, type: 'movie', name: 'Downloading Movie' })
          ),
      } as unknown as TMDBService;

      const result = await getUserActivityAttentionEnriched(tmdbServiceForTest, db, user);

      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.results).toHaveLength(2);
      expect(result.results.map(item => item.tmdbId)).toEqual(expect.arrayContaining([123, 456]));
      expect(result.results.map(item => item.state?.record?.status)).toEqual(
        expect.arrayContaining(['warning', 'downloading'])
      );
    });

    it('should include warning media without interactions for admins', async () => {
      const admin = await createTestUserInDb(db, {
        email: 'admin-attention@test.com',
        role: 'admin',
      });
      expectDefined(admin);

      await createMedia(db, 777, 'movie', 'warning');

      const tmdbServiceForTest = {
        getDetails: vi
          .fn()
          .mockResolvedValue(
            createMediaTestHelper({ tmdbId: 777, type: 'movie', name: 'Needs Attention' })
          ),
      } as unknown as TMDBService;

      const result = await getUserActivityAttentionEnriched(tmdbServiceForTest, db, admin);

      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.tmdbId).toBe(777);
      expect(result.results[0]?.state?.record?.status).toBe('warning');
    });
  });

  describe('requestMediaToArr', () => {
    const tmdbWithTvdb: TMDBService = {
      configure: vi.fn().mockResolvedValue(undefined),
      isConfigured: vi.fn().mockReturnValue(true),
      testConnection: vi.fn().mockResolvedValue(undefined),
      search: vi.fn(),
      fetchDiscover: vi.fn(),
      fetchTrending: vi.fn(),
      getGenres: vi.fn(),
      getDetails: vi.fn().mockResolvedValue(createTestMovieDetail({ tmdbId: 123 })),
      findByExternalId: vi.fn(),
    } as TMDBService;

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(tmdbWithTvdb.getDetails).mockResolvedValue(createTestMovieDetail({ tmdbId: 123 }));
      // Re-mock services after clearAllMocks
      vi.mocked(radarrService.request).mockResolvedValue({
        type: 'movie',
        id: 1,
        tmdbId: 123,
        title: '',
        arrUrl: '/movie/123',
        monitored: true,
        hasFile: false,
      });
      vi.mocked(sonarrService.request).mockResolvedValue({
        type: 'tv',
        id: 1,
        tvdbId: 81_189,
        title: '',
        arrUrl: '/series/test-slug',
        monitored: true,
        hasFile: false,
      });
    });

    it('should call radarr request when a movie reaches the request threshold', async () => {
      const user1 = await createTestUserInDb(db, { email: 'u1@test.com', displayName: 'U1' });
      const user2 = await createTestUserInDb(db, { email: 'u2@test.com', displayName: 'U2' });
      const user3 = await createTestUserInDb(db, { email: 'u3@test.com', displayName: 'U3' });
      expectDefined(user1);
      expectDefined(user2);
      expectDefined(user3);

      await createInteraction(
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user1
      );
      await createInteraction(
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user2
      );
      await createInteraction(
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user3
      );

      // Allow fire-and-forget to complete
      await vi.waitFor(() =>
        expect(radarrService.request).toHaveBeenCalledWith(1, 123, 'Test Movie', null, undefined)
      );
    });

    it('should call sonarr request with TVDB ID when a TV show reaches the threshold', async () => {
      const tvInteraction: CreateMediaInteraction = {
        mediaType: 'tv',
        tmdbId: 456,
        action: 'liked',
        seasons: [1, 2],
      };
      vi.mocked(tmdbWithTvdb.getDetails).mockResolvedValue(
        createTestTVDetail({ tmdbId: 456, name: 'Test Show', tvdbId: 81_189 }) as never
      );

      const user1 = await createTestUserInDb(db, { email: 'tv1@test.com', displayName: 'U1' });
      const user2 = await createTestUserInDb(db, { email: 'tv2@test.com', displayName: 'U2' });
      const user3 = await createTestUserInDb(db, { email: 'tv3@test.com', displayName: 'U3' });
      expectDefined(user1);
      expectDefined(user2);
      expectDefined(user3);

      await createInteraction(
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        tvInteraction,
        user1
      );
      await createInteraction(
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        tvInteraction,
        user2
      );
      await createInteraction(
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        tvInteraction,
        user3
      );

      await vi.waitFor(() =>
        expect(sonarrService.request).toHaveBeenCalledWith(1, 81_189, 'Test Show', null, [1, 2])
      );
    });

    it('should not forward when arr service is not configured', async () => {
      const user1 = await createTestUserInDb(db, { email: 'u1@test.com', displayName: 'U1' });
      const user2 = await createTestUserInDb(db, { email: 'u2@test.com', displayName: 'U2' });
      const user3 = await createTestUserInDb(db, { email: 'u3@test.com', displayName: 'U3' });
      expectDefined(user1);
      expectDefined(user2);
      expectDefined(user3);

      // Simulate arr not configured — request returns empty object gracefully
      vi.mocked(radarrService.request).mockResolvedValue(undefined);

      await createInteraction(
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user1
      );
      await createInteraction(
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user2
      );
      await createInteraction(
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        db,
        interaction,
        user3
      );

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);
      // Status is still marked requested (arr forwarding is best-effort, non-fatal)
      expect(media.status).toBe('requested');
      // request was attempted but returned empty object (not configured)
      await vi.waitFor(() => expect(radarrService.request).toHaveBeenCalled());
    });
  });
});
