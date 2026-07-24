import type { User } from '@findarr/shared/auth';
import type { DbMedia } from '@findarr/shared/db';
import type { CreateMediaInteraction, InteractionsQuery } from '@findarr/shared/interaction';
import type { MediaDetails, UserInteractionsResponse } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import type { AnyArrService } from '../arr/service.js';
import type { CatalogService } from '../catalog/service.js';
import type { Database } from '../db/service.js';
import {
  createMedia,
  getMediaByTmdbId,
  advanceMediaStatus,
  updateMediaSeasons,
} from '../media/repository.js';
import type { MediaService } from '../media/service.js';
import { updatePreferencesForInteraction } from '../preferences/service.js';
import type { AdministrationService } from '../settings/administration';
import type { TMDBService } from '../tmdb/service.js';
import type { UserService } from '../user/service.js';
import type { AppLogger } from '../utils/logger.js';
import {
  addInteraction,
  hasInteraction,
  removeAllInteractions,
  getVoteCounts,
  getMediaByActivityStatusPaginated,
} from './repository.js';

export interface InteractionContext {
  db: Database;
  tmdb: TMDBService;
  radarr: AnyArrService;
  sonarr: AnyArrService;
  catalog: CatalogService;
  user: UserService;
  media: MediaService;
  administration: AdministrationService;
  appLog: AppLogger;
}

/**
 * Interaction service - orchestrates voting, auto-requests, and enriched
 * activity lists. Mandatory services are injected once via the context.
 */
export function createInteractionService(context: InteractionContext) {
  const {
    db,
    tmdb,
    radarr,
    sonarr,
    catalog,
    user: userService,
    media,
    administration,
    appLog,
  } = context;
  const log = appLog.scope('interaction');

  /**
   * Forward a media request to Radarr (movies) or Sonarr (TV shows).
   * Automatically handles both creating new media and updating existing media.
   * For existing media with arrId, updates monitored seasons instead of creating duplicate.
   * Resolves title from TMDB, fetches TVDB ID for TV shows if needed.
   * Stores Radarr/Sonarr IDs immediately for tracking if the service is configured.
   * Triggers fast queue sync scheduler to detect when download starts.
   * If Radarr/Sonarr is not configured, this is a no-op (gracefully skipped).
   */
  async function requestMediaToArr(
    mediaRecord: DbMedia,
    details: MediaDetails,
    seasons: number[] | undefined,
  ): Promise<void> {
    const service = details.type === 'movie' ? radarr : sonarr;
    const externalId = details.type === 'movie' ? details.tmdbId : details.tvdbId;

    await service.requestMedia(
      mediaRecord.id,
      externalId,
      details.name,
      mediaRecord.arrId,
      seasons,
    );
  }

  async function enrichInteractionPage(
    userId: number,
    items: DbMedia[],
    page: number,
  ): Promise<UserInteractionsResponse> {
    // Fetch TMDB details for all interacted media
    const enrichedMedia = await media.fetchTMDBDetails(items);

    // Add user interactions and vote counts in optimized batch query
    const results = await media.enrichWithInteractions(enrichedMedia, userId);

    return { results, page };
  }

  /**
   * Create or toggle a media interaction (like/dislike)
   * Automatically creates media request when vote threshold is met or if admin likes it
   * Stores user genre preferences for personalized scoring
   * Returns enriched media with updated state (TMDB + DB + interactions + votes)
   */
  async function createInteraction(
    data: CreateMediaInteraction,
    user?: User,
  ): Promise<MediaDetails | undefined> {
    if (!isDefined(user?.id)) {
      return undefined;
    }

    const { voteThreshold } = await administration.getSettings();
    const { language } = await userService.getSettings(user.id);
    const timer = log.timer('createInteraction', { action: data.action });

    // Get or create media record
    const existing = await getMediaByTmdbId(db, data.tmdbId, data.mediaType);
    const mediaRow = existing ?? (await createMedia(db, data.tmdbId, data.mediaType));

    // Update seasons if provided (TV shows only)
    if (data.mediaType === 'tv' && data.seasons !== undefined) {
      await updateMediaSeasons(db, mediaRow.id, data.seasons);
    }

    // Determine if this is a toggle vs an update:
    // - Toggle: clicking same action without seasons (movies or direct button click)
    // - Update: providing seasons array (TV shows via modal confirmation)
    const isSeasonUpdate = data.seasons !== undefined;
    const isToggle =
      !isSeasonUpdate && (await hasInteraction(db, user.id, mediaRow.id, data.action));

    // Handle empty season selection as "unlike" (user deselected all seasons)
    const isUnlike = isSeasonUpdate && data.seasons?.length === 0;

    // Remove all existing interactions for this user on this media
    await removeAllInteractions(db, user.id, mediaRow.id);

    // Add new interaction unless toggling off or unliking with empty seasons
    if (!isToggle && !isUnlike) {
      await addInteraction(db, user.id, mediaRow.id, data.action);
    }

    // Calculate votes and check if auto-request threshold is met
    const { likes } = await getVoteCounts(db, mediaRow.id);

    const isAdmin = user.role === 'admin';
    timer.lap('persistVote');

    // Fetch TMDB details a single time and reuse them for the request, preferences,
    // and (via the shared cache) the final enriched response.
    const details = await tmdb.details({ id: data.tmdbId, type: data.mediaType, language });
    timer.lap('details');

    // Advance media status to 'voting' if the user liked it (even if below threshold)
    if (data.action === 'liked') {
      await advanceMediaStatus(db, mediaRow, 'voting');
    }

    // Request media. Skip if it's already available in the library (e.g. still on
    // Jellyfin/Plex after being removed from Radarr/Sonarr) so we don't needlessly
    // re-request it — but a TV season update still needs to reach Sonarr.
    const shouldRequest =
      data.action === 'liked' &&
      (likes >= voteThreshold || (isAdmin && likes >= 1)) &&
      (mediaRow.status !== 'available' || isSeasonUpdate);

    if (shouldRequest) {
      // Forward to Radarr/Sonarr (handles both create and update based on arrId)
      await requestMediaToArr(mediaRow, details, data.seasons);
      timer.lap('requestArr');

      // Mark as requested only after the request actually reached Radarr/Sonarr
      await advanceMediaStatus(db, mediaRow, 'requested');
      timer.lap('updateMediaStatus');
    }

    // Update user genre preferences based on the interaction.
    await updatePreferencesForInteraction(
      db,
      user.id,
      details.genres,
      details.keywords,
      data.action,
      isToggle,
    );
    timer.lap('preferences');

    // Return enriched media with updated state using catalog service
    const enriched = await catalog.getMediaDetails(
      { id: data.tmdbId, type: data.mediaType },
      user.id,
    );

    timer.lap('getMediaDetails');
    timer.end();

    return enriched;
  }

  async function getActivityItems(params: InteractionsQuery): Promise<DbMedia[]> {
    const { page = 1, action = 'all', statuses, type = 'both', userId } = params;
    const limit = 20;
    const offset = (page - 1) * limit;

    return getMediaByActivityStatusPaginated(db, {
      type,
      action,
      statuses,
      limit,
      offset,
      ...(userId === undefined ? {} : { userId }),
    });
  }

  /**
   * Get user's interacted media (likes AND dislikes) enriched with TMDB metadata,
   * interactions, and vote counts. Supports pagination for large vote lists.
   */
  async function getUserInteractionsEnriched(
    params: InteractionsQuery,
    user: User,
  ): Promise<UserInteractionsResponse> {
    const { page = 1 } = params;
    const items = await getActivityItems(params);

    return enrichInteractionPage(user.id, items, page);
  }

  return {
    createInteraction,
    getUserInteractionsEnriched,
  };
}

export type InteractionService = ReturnType<typeof createInteractionService>;
