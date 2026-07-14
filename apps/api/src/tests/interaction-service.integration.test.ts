import type { CreateMediaInteraction } from '@findarr/shared/interaction';
import type SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, vi, afterEach, type Mocked } from 'vite-plus/test';

import { createDatabase, type Database } from '../db/service.js';
import { hasInteraction, getVoteCounts } from '../interaction/repository.js';
import { createInteractionService, type InteractionService } from '../interaction/service.js';
import { createMedia, getMediaByTmdbId, updateMediaStatus } from '../media/repository.js';
import { createMediaService } from '../media/service.js';
import type { TMDBService } from '../tmdb/service.js';
import { createUserService } from '../user/service.js';
import {
  createMockCatalogService,
  createMockRadarrService,
  createMockSonarrService,
  createMockTMDBService,
  createMockAppLogger,
} from './helpers/mockServices.js';
import {
  assertDefined as expectDefined,
  createTestUserInDb,
  createTestMovieDetail,
  createTestTVDetail,
} from './helpers/testHelper.js';

const interaction: CreateMediaInteraction = {
  mediaType: 'movie',
  tmdbId: 123,
  action: 'liked',
};

const radarrService = createMockRadarrService();
const sonarrService = createMockSonarrService();
const catalogService = createMockCatalogService();

// Thin adapters that build the interaction service from the mocked dependencies
// and delegate to it, so the existing call sites exercise createInteractionService.
const createInteraction = async (
  db: Database,
  tmdb: TMDBService,
  radarr: typeof radarrService,
  sonarr: typeof sonarrService,
  catalog: typeof catalogService,
  ...args: Parameters<InteractionService['createInteraction']>
) => {
  const userService = createUserService({ db });
  const mediaService = createMediaService({ db, tmdb, user: userService });
  const appLogService = createMockAppLogger();

  return createInteractionService({
    db,
    tmdb,
    radarr,
    sonarr,
    catalog,
    user: userService,
    media: mediaService,
    appLog: appLogService,
  }).createInteraction(...args);
};

const buildService = (tmdbService: TMDBService, db: Database): InteractionService => {
  const userService = createUserService({ db });
  const mediaService = createMediaService({ db, tmdb: tmdbService, user: userService });
  const appLogService = createMockAppLogger();

  return createInteractionService({
    db,
    tmdb: tmdbService,
    radarr: radarrService,
    sonarr: sonarrService,
    catalog: catalogService,
    user: userService,
    media: mediaService,
    appLog: appLogService,
  });
};

const getUserInteractionsEnriched = async (
  tmdbService: TMDBService,
  db: Database,
  ...args: Parameters<InteractionService['getUserInteractionsEnriched']>
) => buildService(tmdbService, db).getUserInteractionsEnriched(...args);

const getUserActivityAttentionEnriched = async (
  tmdbService: TMDBService,
  db: Database,
  ...args: Parameters<InteractionService['getUserActivityAttentionEnriched']>
) => buildService(tmdbService, db).getUserActivityAttentionEnriched(...args);

describe('interaction service - integration tests', () => {
  let db: Database;
  let sqliteDb: SqlDatabase.Database;
  let tmdb: Mocked<TMDBService>;

  beforeEach(() => {
    // Create fresh in-memory database for each test
    const result = createDatabase(':memory:');
    ({ db } = result);
    ({ sqliteDb } = result);

    // Mock TMDB service that returns movie/TV details with genres
    tmdb = createMockTMDBService({
      details: vi.fn<TMDBService['details']>().mockResolvedValue(
        createTestMovieDetail({
          tmdbId: 123,
          genres: [
            { id: 28, name: 'Action' },
            { id: 12, name: 'Adventure' },
          ],
        }),
      ),
    });
  });

  afterEach(() => {
    sqliteDb.close();
  });

  describe('createInteraction', () => {
    it('should create new media and interaction when media does not exist', async () => {
      const user = await createTestUserInDb(db, { email: 'user1@test.com' });
      expectDefined(user);

      const result = await createInteraction(
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user,
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
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
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
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user,
      );

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);

      // Verify interaction exists
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(true);

      // Toggle off - click the same action again
      await createInteraction(
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user,
      );

      // Verify interaction was removed
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(false);
    });

    it('should switch from dislike to like', async () => {
      const user = await createTestUserInDb(db, { email: 'user1@test.com' });
      expectDefined(user);

      // First dislike
      await createInteraction(
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        { ...interaction, action: 'disliked' },
        user,
      );

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);

      // Verify dislike exists
      expect(await hasInteraction(db, user.id, media.id, 'disliked')).toBe(true);
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(false);

      // Switch to like
      await createInteraction(
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user,
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
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        admin,
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
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        { ...interaction, action: 'disliked' },
        user1,
      );
      await createInteraction(
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        { ...interaction, action: 'disliked' },
        user2,
      );
      await createInteraction(
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        { ...interaction, action: 'disliked' },
        user3,
      );

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);
      expect(media.status).toBe('pending');

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
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user,
      );
      await createInteraction(
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        { mediaType: 'tv', tmdbId: 456, action: 'liked' },
        user,
      );

      const mockMedia1 = createTestMovieDetail({ tmdbId: 123, type: 'movie', name: 'Test Movie' });
      const mockMedia2 = createTestTVDetail({ tmdbId: 456, type: 'tv', name: 'Test Show' });

      tmdb.details = vi
        .fn<TMDBService['details']>()
        .mockResolvedValueOnce(mockMedia1)
        .mockResolvedValueOnce(mockMedia2);

      const result = await getUserInteractionsEnriched(tmdb, db, {}, user);

      expect(result.results).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      // Verify both items are present (order may vary)
      const ids = result.results.map((r) => r.tmdbId);
      expect(ids).toContain(123);
      expect(ids).toContain(456);
      expect(tmdb.details).toHaveBeenCalledTimes(2);
    });

    it('should return empty results for userId with no interactions', async () => {
      const user = await createTestUserInDb(db, { email: 'no-interactions@test.com' });
      expectDefined(user);

      const result = await getUserInteractionsEnriched(tmdb, db, {}, user);
      expect(result).toStrictEqual({ results: [], page: 1, totalPages: 0 });
    });

    it('should keep the main activity list ordered by newest interaction instead of status priority', async () => {
      const user = await createTestUserInDb(db, { email: 'activity-order@test.com' });
      expectDefined(user);

      await createInteraction(
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user,
      );

      const olderMedia = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(olderMedia);
      await updateMediaStatus(db, olderMedia.id, 'downloading');

      vi.mocked(tmdb.details).mockResolvedValueOnce(
        createTestTVDetail({
          tmdbId: 456,
          name: 'Newest Show',
          genres: [{ id: 18, name: 'Drama' }],
        }),
      );

      await createInteraction(
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        { mediaType: 'tv', tmdbId: 456, action: 'liked' },
        user,
      );

      tmdb.details = vi
        .fn<TMDBService['details']>()
        .mockResolvedValueOnce(createTestTVDetail({ tmdbId: 456, type: 'tv', name: 'Newest Show' }))
        .mockResolvedValueOnce(
          createTestMovieDetail({ tmdbId: 123, type: 'movie', name: 'Older Download' }),
        );

      const result = await getUserInteractionsEnriched(tmdb, db, {}, user);

      expect(result.results.map((item) => item.tmdbId)).toStrictEqual([456, 123]);
    });
  });

  describe('getUserActivityAttentionEnriched', () => {
    it('should return only interacted media that need attention or are in progress', async () => {
      const user = await createTestUserInDb(db, { email: 'attention@test.com' });
      expectDefined(user);

      await createInteraction(
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user,
      );

      vi.mocked(tmdb.details).mockResolvedValueOnce(
        createTestTVDetail({
          tmdbId: 456,
          name: 'Warning Show',
          genres: [{ id: 80, name: 'Crime' }],
        }),
      );

      await createInteraction(
        db,
        tmdb,
        radarrService,
        sonarrService,
        catalogService,
        { mediaType: 'tv', tmdbId: 456, action: 'liked' },
        user,
      );

      const movieMedia = await getMediaByTmdbId(db, 123, 'movie');
      const showMedia = await getMediaByTmdbId(db, 456, 'tv');
      expectDefined(movieMedia);
      expectDefined(showMedia);

      await updateMediaStatus(db, movieMedia.id, 'downloading');
      await updateMediaStatus(db, showMedia.id, 'warning');

      tmdb.details = vi
        .fn<TMDBService['details']>()
        .mockResolvedValueOnce(
          createTestTVDetail({ tmdbId: 456, type: 'tv', name: 'Warning Show' }),
        )
        .mockResolvedValueOnce(
          createTestMovieDetail({ tmdbId: 123, type: 'movie', name: 'Downloading Movie' }),
        );

      const result = await getUserActivityAttentionEnriched(tmdb, db, {}, user);

      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.results).toHaveLength(2);
      expect(result.results.map((item) => item.tmdbId)).toStrictEqual(
        expect.arrayContaining([123, 456]),
      );
      expect(result.results.map((item) => item.state?.record?.status)).toStrictEqual(
        expect.arrayContaining(['warning', 'downloading']),
      );
    });

    it('should include warning media without interactions for admins', async () => {
      const admin = await createTestUserInDb(db, {
        email: 'admin-attention@test.com',
        role: 'admin',
      });
      expectDefined(admin);

      await createMedia(db, 777, 'movie', 'warning');

      tmdb.details = vi
        .fn<TMDBService['details']>()
        .mockResolvedValueOnce(
          createTestMovieDetail({ tmdbId: 777, type: 'movie', name: 'Needs Attention' }),
        );

      const result = await getUserActivityAttentionEnriched(tmdb, db, {}, admin);

      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.tmdbId).toBe(777);
      expect(result.results[0]?.state?.record?.status).toBe('warning');
    });
  });

  describe('requestMediaToArr', () => {
    const tmdbWithTvdb = createMockTMDBService({
      details: vi
        .fn<TMDBService['details']>()
        .mockResolvedValue(createTestMovieDetail({ tmdbId: 123 })),
    });

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(tmdbWithTvdb.details).mockResolvedValue(createTestMovieDetail({ tmdbId: 123 }));
      // Re-mock services after clearAllMocks
      vi.mocked(radarrService.requestMedia).mockResolvedValue({
        type: 'movie',
        id: 1,
        tmdbId: 123,
        title: '',
        arrUrl: '/movie/123',
        monitored: true,
        hasFile: false,
      });
      vi.mocked(sonarrService.requestMedia).mockResolvedValue({
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
        db,
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user1,
      );
      await createInteraction(
        db,
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user2,
      );
      await createInteraction(
        db,
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user3,
      );

      // Allow fire-and-forget to complete
      await vi.waitFor(() => {
        expect(radarrService.requestMedia).toHaveBeenCalledWith(
          1,
          123,
          'Test Movie',
          null,
          undefined,
        );
      });
    });

    it('should call sonarr request with TVDB ID when a TV show reaches the threshold', async () => {
      const tvInteraction: CreateMediaInteraction = {
        mediaType: 'tv',
        tmdbId: 456,
        action: 'liked',
        seasons: [1, 2],
      };
      vi.mocked(tmdbWithTvdb.details).mockResolvedValue(
        createTestTVDetail({ tmdbId: 456, name: 'Test Show', tvdbId: 81_189 }),
      );

      const user1 = await createTestUserInDb(db, { email: 'tv1@test.com', displayName: 'U1' });
      const user2 = await createTestUserInDb(db, { email: 'tv2@test.com', displayName: 'U2' });
      const user3 = await createTestUserInDb(db, { email: 'tv3@test.com', displayName: 'U3' });
      expectDefined(user1);
      expectDefined(user2);
      expectDefined(user3);

      await createInteraction(
        db,
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        tvInteraction,
        user1,
      );
      await createInteraction(
        db,
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        tvInteraction,
        user2,
      );
      await createInteraction(
        db,
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        tvInteraction,
        user3,
      );

      await vi.waitFor(() => {
        expect(sonarrService.requestMedia).toHaveBeenCalledWith(
          1,
          81_189,
          'Test Show',
          null,
          [1, 2],
        );
      });
    });

    it('should not forward when arr service is not configured', async () => {
      const user1 = await createTestUserInDb(db, { email: 'u1@test.com', displayName: 'U1' });
      const user2 = await createTestUserInDb(db, { email: 'u2@test.com', displayName: 'U2' });
      const user3 = await createTestUserInDb(db, { email: 'u3@test.com', displayName: 'U3' });
      expectDefined(user1);
      expectDefined(user2);
      expectDefined(user3);

      const undefinedArrItem = undefined;
      // Simulate arr not configured — request returns empty object gracefully
      vi.mocked(radarrService.requestMedia).mockResolvedValue(undefinedArrItem);

      await createInteraction(
        db,
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user1,
      );
      await createInteraction(
        db,
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user2,
      );
      await createInteraction(
        db,
        tmdbWithTvdb,
        radarrService,
        sonarrService,
        catalogService,
        interaction,
        user3,
      );

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);
      // Status is still marked requested (arr forwarding is best-effort, non-fatal)
      expect(media.status).toBe('requested');
      // request was attempted but returned empty object (not configured)
      await vi.waitFor(() => {
        expect(radarrService.requestMedia).toHaveBeenCalled();
      });
    });
  });
});
