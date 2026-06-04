/**
 * Transformers to convert TMDB API responses to application types
 * These functions map the raw TMDB data structure to our unified application structure
 */
import type {
  Movie,
  TVShow,
  MovieDetails,
  TVDetails,
  Genre,
  Keyword,
  Media,
  CastMember,
  Video,
} from '@findarr/shared';

import type {
  TMDBMovie,
  TMDBTVShow,
  TMDBMovieDetails,
  TMDBTVDetails,
  TMDBCredits,
  TMDBVideos,
} from './schemas.js';

/**
 * Helper: Extract and transform cast members
 * Limits to top 15 actors sorted by order field
 */
function extractCast(credits: TMDBCredits | undefined): CastMember[] | undefined {
  if (!credits?.cast || credits.cast.length === 0) {
    return undefined;
  }

  return credits.cast.slice(0, 6).map((member) => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profilePath: member.profile_path ?? undefined,
    order: member.order,
  }));
}

/**
 * Helper: Extract and transform videos (trailers)
 * Filters for official YouTube trailers and teasers
 */
function extractVideos(videos: TMDBVideos | undefined): Video[] | undefined {
  if (!videos?.results || videos.results.length === 0) {
    return undefined;
  }

  const trailerVideos = videos.results
    .filter(
      (video) =>
        video.site === 'YouTube' &&
        (video.type === 'Trailer' || video.type === 'Teaser') &&
        video.official,
    )
    .map((video) => ({
      id: video.id,
      key: video.key,
      name: video.name,
      site: video.site,
      type: video.type,
      official: video.official,
      publishedAt: video.published_at ?? undefined,
    }));

  return trailerVideos.length > 0 ? trailerVideos : undefined;
}

/**
 * Transform TMDB Movie Details to application MovieDetails type
 */
function transformMovieDetails(tmdbMovie: TMDBMovieDetails): MovieDetails {
  // Extract keywords from movie response (direct array)
  const keywords: Keyword[] = tmdbMovie.keywords?.keywords ?? [];

  // Extract rich media data
  const cast = extractCast(tmdbMovie.credits);
  const videos = extractVideos(tmdbMovie.videos);

  return {
    tmdbId: tmdbMovie.id,
    type: tmdbMovie.type,
    name: tmdbMovie.title,
    date: tmdbMovie.release_date ?? undefined,
    posterPath: tmdbMovie.poster_path ?? undefined,
    backdropPath: tmdbMovie.backdrop_path ?? undefined,
    overview: tmdbMovie.overview ?? undefined,
    voteAverage: tmdbMovie.vote_average,
    voteCount: tmdbMovie.vote_count,
    popularity: tmdbMovie.popularity,
    originalLanguage: tmdbMovie.original_language,
    originCountry: undefined,
    genres: tmdbMovie.genres,
    keywords,
    tagline: tmdbMovie.tagline ?? undefined,
    runtime: tmdbMovie.runtime ?? undefined,
    budget: tmdbMovie.budget,
    revenue: tmdbMovie.revenue,
    status: tmdbMovie.status,
    homepage: tmdbMovie.homepage ?? undefined,
    imdbId: tmdbMovie.imdb_id ?? undefined,
    cast,
    videos,
  };
}

/**
 * Transform TMDB TV Show Details to application TVDetails type
 */
function transformTVDetails(tmdbTV: TMDBTVDetails): TVDetails {
  // Extract keywords from TV response (nested in results)
  const keywords: Keyword[] = tmdbTV.keywords?.results ?? [];

  // Transform seasons array
  const seasons = tmdbTV.seasons.map((season) => ({
    seasonNumber: season.season_number,
    name: season.name,
    episodeCount: season.episode_count,
    airDate: season.air_date ?? undefined,
  }));

  // Extract rich media data
  const cast = extractCast(tmdbTV.credits);
  const videos = extractVideos(tmdbTV.videos);

  return {
    tmdbId: tmdbTV.id,
    type: tmdbTV.type,
    name: tmdbTV.name,
    date: tmdbTV.first_air_date ?? undefined,
    lastAirDate: tmdbTV.last_air_date ?? undefined,
    posterPath: tmdbTV.poster_path ?? undefined,
    backdropPath: tmdbTV.backdrop_path ?? undefined,
    overview: tmdbTV.overview ?? undefined,
    voteAverage: tmdbTV.vote_average,
    voteCount: tmdbTV.vote_count,
    popularity: tmdbTV.popularity,
    originalLanguage: tmdbTV.original_language,
    originCountry: tmdbTV.origin_country,
    genres: tmdbTV.genres,
    keywords,
    originalName: tmdbTV.original_name,
    episodeRunTime: tmdbTV.episode_run_time,
    showType: tmdbTV.show_type,
    numberOfSeasons: tmdbTV.number_of_seasons,
    numberOfEpisodes: tmdbTV.number_of_episodes,
    seasons,
    status: tmdbTV.status,
    homepage: tmdbTV.homepage ?? undefined,
    tvdbId: tmdbTV.external_ids?.tvdb_id ?? undefined,
    imdbId: tmdbTV.external_ids?.imdb_id ?? undefined,
    cast,
    videos,
  };
}

/**
 * Custom state fields that can be added to transformed items
 */
interface CustomFields {
  trendingRank?: number;
}

/**
 * Transform TMDB Movie to application Movie type
 */
function transformMovie(
  tmdbMovie: TMDBMovie,
  genreMap: Map<number, Genre>,
  customFields?: CustomFields,
): Movie {
  // Map genre_ids to full genre objects
  const genres = tmdbMovie.genre_ids
    ? tmdbMovie.genre_ids.map((id) => genreMap.get(id)).filter((g): g is Genre => g !== undefined)
    : [];

  return {
    tmdbId: tmdbMovie.id,
    type: tmdbMovie.type,
    name: tmdbMovie.title,
    date: tmdbMovie.release_date ?? undefined,
    posterPath: tmdbMovie.poster_path ?? undefined,
    backdropPath: tmdbMovie.backdrop_path ?? undefined,
    overview: tmdbMovie.overview ?? undefined,
    voteAverage: tmdbMovie.vote_average,
    voteCount: tmdbMovie.vote_count,
    popularity: tmdbMovie.popularity,
    originalLanguage: tmdbMovie.original_language,
    originCountry: undefined,
    genres,
    ...customFields,
  };
}

/**
 * Transform TMDB TV Show to application TVShow type
 */
function transformTVShow(
  tmdbTV: TMDBTVShow,
  genreMap: Map<number, Genre>,
  customFields?: CustomFields,
): TVShow {
  // Map genre_ids to full genre objects
  const genres = tmdbTV.genre_ids
    ? tmdbTV.genre_ids.map((id) => genreMap.get(id)).filter((g): g is Genre => g !== undefined)
    : [];

  return {
    tmdbId: tmdbTV.id,
    type: tmdbTV.type,
    name: tmdbTV.name,
    date: tmdbTV.first_air_date ?? undefined,
    posterPath: tmdbTV.poster_path ?? undefined,
    backdropPath: tmdbTV.backdrop_path ?? undefined,
    overview: tmdbTV.overview ?? undefined,
    voteAverage: tmdbTV.vote_average,
    voteCount: tmdbTV.vote_count,
    popularity: tmdbTV.popularity,
    originalLanguage: tmdbTV.original_language,
    originCountry: tmdbTV.origin_country,
    genres,
    ...customFields,
  };
}

/**
 * Transform TMDB Movie to application Movie type
 */
export function transformMedia(
  item: TMDBMovie | TMDBTVShow,
  genreMap: Map<number, Genre>,
  customState?: CustomFields,
): Media {
  return item.type === 'movie'
    ? transformMovie(item, genreMap, customState)
    : transformTVShow(item, genreMap, customState);
}

/**
 * Transform TMDB Movie Details or TV Show Details to application type
 */
export function transformDetails(item: TMDBMovieDetails | TMDBTVDetails) {
  return item.type === 'movie' ? transformMovieDetails(item) : transformTVDetails(item);
}
