import type {
  SearchQuery,
  DiscoverQuery,
  DetailsQuery,
  GenresQuery,
  MovieDetails,
  TVDetails,
  SearchResponse,
  DiscoverResponse,
  Genre,
  Movie,
  TVShow,
} from '@findarr/shared';
import type { TMDBService } from '../tmdb/service';
import { calculateCustomPopularity, createTrendingScoreMap } from './scoring';

/**
 * Media service - orchestrates multiple data sources and applies business logic
 * Currently uses TMDB, can be extended with Radarr/Sonarr/etc.
 */
export function createMediaService(tmdbService: TMDBService) {
  /**
   * Initialize all data sources
   */
  async function initialize() {
    await tmdbService.loadGenres();
  }

  /**
   * Search for media across all sources
   * Currently delegates to TMDB
   */
  async function search(params: SearchQuery): Promise<SearchResponse> {
    return tmdbService.search(params);
  }

  /**
   * Discover media with advanced orchestration:
   * - Fetches from discover and trending endpoints
   * - Applies custom scoring algorithm
   * - Deduplicates and sorts results
   */
  async function discover(params: DiscoverQuery): Promise<DiscoverResponse> {
    // Fetch discover and trending data in parallel
    const [discoverResults, trendingResults] = await Promise.all([
      tmdbService.fetchDiscover(params),
      tmdbService.fetchTrending(params),
    ]);

    // Create trending score map
    const trendingScoreMap = createTrendingScoreMap(trendingResults);

    // Apply custom scoring to all results
    const allResultsWithScoring = [...trendingResults, ...discoverResults].map(item => {
      const trendingData = trendingScoreMap.get(item.id);
      const customPopularity = calculateCustomPopularity(
        item,
        trendingData?.trending_rank,
        trendingData?.trending_boost
      );

      return {
        ...item,
        custom_popularity: customPopularity,
        is_trending: !!trendingData,
        trending_rank: trendingData?.trending_rank,
      };
    });

    // Remove duplicates and sort by custom popularity
    const uniqueResults = allResultsWithScoring.reduce<(Movie | TVShow)[]>((acc, item) => {
      const existing = acc.find(u => u.id === item.id);
      if (!existing) {
        acc.push(item);
      } else if (item.is_trending && !existing.is_trending) {
        const index = acc.indexOf(existing);
        acc[index] = item;
      }
      return acc;
    }, []);

    const sortedResults = uniqueResults.sort(
      (a, b) => (b.custom_popularity || 0) - (a.custom_popularity || 0)
    );

    return { results: sortedResults };
  }

  /**
   * Get detailed information about a media item
   * Currently delegates to TMDB
   */
  async function getDetails(params: DetailsQuery): Promise<MovieDetails | TVDetails> {
    return tmdbService.getDetails(params);
  }

  /**
   * Get all available genres
   * Currently delegates to TMDB
   */
  async function getGenres(params: GenresQuery): Promise<{ genres: Genre[] }> {
    return tmdbService.getGenres(params);
  }

  return { initialize, search, discover, getDetails, getGenres };
}

export type MediaService = ReturnType<typeof createMediaService>;
