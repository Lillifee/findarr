/**
 * Transformers to convert TMDB API responses to application types
 * These functions map the raw TMDB data structure to our unified application structure
 */
import type { Movie, TVShow, MovieDetails, TVDetails, Genre, Media } from '@findarr/shared';
import type { TMDBMovie, TMDBTVShow, TMDBMovieDetails, TMDBTVDetails } from './schemas.js';

/**
 * Custom enrichment fields that can be added to transformed items
 */
interface CustomFields {
  trendingRank?: number;
  customPopularity?: number;
}

/**
 * Transform TMDB Movie to application Movie type
 */
export function transformMedia(
  item: TMDBMovie | TMDBTVShow,
  genreMap: Map<number, Genre>,
  customFields?: CustomFields
): Media {
  return item.type === 'movie'
    ? transformMovie(item as TMDBMovie, genreMap, customFields)
    : transformTVShow(item as TMDBTVShow, genreMap, customFields);
}

/**
 * Transform TMDB Movie to application Movie type
 */
function transformMovie(
  tmdbMovie: TMDBMovie,
  genreMap: Map<number, Genre>,
  customFields?: CustomFields
): Movie {
  // Map genre_ids to full genre objects
  const genres = tmdbMovie.genre_ids
    ? tmdbMovie.genre_ids.map(id => genreMap.get(id)).filter((g): g is Genre => g !== undefined)
    : [];

  return {
    id: tmdbMovie.id,
    type: tmdbMovie.type,
    name: tmdbMovie.title,
    date: tmdbMovie.release_date ?? undefined,
    posterPath: tmdbMovie.poster_path ?? undefined,
    overview: tmdbMovie.overview ?? undefined,
    voteAverage: tmdbMovie.vote_average,
    voteCount: tmdbMovie.vote_count,
    popularity: tmdbMovie.popularity,
    originalLanguage: tmdbMovie.original_language,
    originCountry: undefined, // Movies don't have origin_country
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
  customFields?: CustomFields
): TVShow {
  // Map genre_ids to full genre objects
  const genres = tmdbTV.genre_ids
    ? tmdbTV.genre_ids.map(id => genreMap.get(id)).filter((g): g is Genre => g !== undefined)
    : [];

  return {
    id: tmdbTV.id,
    type: tmdbTV.type,
    name: tmdbTV.name,
    date: tmdbTV.first_air_date ?? undefined,
    posterPath: tmdbTV.poster_path ?? undefined,
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
 * Transform TMDB Movie Details or TV Show Details to application type
 */
export function transformDetails(item: TMDBMovieDetails | TMDBTVDetails) {
  return item.type === 'movie' ? transformMovieDetails(item) : transformTVDetails(item);
}

/**
 * Transform TMDB Movie Details to application MovieDetails type
 */
function transformMovieDetails(tmdbMovie: TMDBMovieDetails): MovieDetails {
  return {
    id: tmdbMovie.id,
    type: tmdbMovie.type,
    name: tmdbMovie.title,
    date: tmdbMovie.release_date ?? undefined,
    posterPath: tmdbMovie.poster_path ?? undefined,
    overview: tmdbMovie.overview ?? undefined,
    voteAverage: tmdbMovie.vote_average,
    voteCount: tmdbMovie.vote_count,
    popularity: tmdbMovie.popularity,
    originalLanguage: tmdbMovie.original_language,
    originCountry: undefined,
    genres: tmdbMovie.genres,
    tagline: tmdbMovie.tagline ?? undefined,
    runtime: tmdbMovie.runtime ?? undefined,
    budget: tmdbMovie.budget,
    revenue: tmdbMovie.revenue,
    status: tmdbMovie.status,
    homepage: tmdbMovie.homepage ?? undefined,
    imdbId: tmdbMovie.imdb_id ?? undefined,
  };
}

/**
 * Transform TMDB TV Show Details to application TVDetails type
 */
function transformTVDetails(tmdbTV: TMDBTVDetails): TVDetails {
  return {
    id: tmdbTV.id,
    type: tmdbTV.type,
    name: tmdbTV.name,
    date: tmdbTV.first_air_date ?? undefined,
    posterPath: tmdbTV.poster_path ?? undefined,
    overview: tmdbTV.overview ?? undefined,
    voteAverage: tmdbTV.vote_average,
    voteCount: tmdbTV.vote_count,
    popularity: tmdbTV.popularity,
    originalLanguage: tmdbTV.original_language,
    originCountry: tmdbTV.origin_country,
    genres: tmdbTV.genres,
    originalName: tmdbTV.original_name,
    episodeRunTime: tmdbTV.episode_run_time,
    showType: tmdbTV.show_type,
    numberOfSeasons: tmdbTV.number_of_seasons,
    numberOfEpisodes: tmdbTV.number_of_episodes,
    status: tmdbTV.status,
    homepage: tmdbTV.homepage ?? undefined,
  };
}
