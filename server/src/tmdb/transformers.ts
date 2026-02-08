/**
 * Transformers to convert TMDB API responses to application types
 * These functions map the raw TMDB data structure to our unified application structure
 */
import type { Movie, TVShow, MovieDetails, TVDetails, Genre, Media } from '@findarr/shared';
import { TMDBMovie, TMDBTVShow, TMDBMovieDetails, TMDBTVDetails } from './schemas.js';

/**
 * Custom enrichment fields that can be added to transformed items
 */
interface CustomFields {
  trending_rank?: number;
  custom_popularity?: number;
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
    date: tmdbMovie.release_date,
    poster_path: tmdbMovie.poster_path,
    overview: tmdbMovie.overview,
    vote_average: tmdbMovie.vote_average,
    vote_count: tmdbMovie.vote_count,
    popularity: tmdbMovie.popularity,
    original_language: tmdbMovie.original_language,
    origin_country: undefined, // Movies don't have origin_country, set to empty array
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
    date: tmdbTV.first_air_date,
    poster_path: tmdbTV.poster_path,
    overview: tmdbTV.overview,
    vote_average: tmdbTV.vote_average,
    vote_count: tmdbTV.vote_count,
    popularity: tmdbTV.popularity,
    original_language: tmdbTV.original_language,
    origin_country: tmdbTV.origin_country,
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
    date: tmdbMovie.release_date,
    poster_path: tmdbMovie.poster_path,
    overview: tmdbMovie.overview,
    vote_average: tmdbMovie.vote_average,
    vote_count: tmdbMovie.vote_count,
    popularity: tmdbMovie.popularity,
    original_language: tmdbMovie.original_language,
    origin_country: undefined,
    genres: tmdbMovie.genres,
    tagline: tmdbMovie.tagline,
    runtime: tmdbMovie.runtime,
    budget: tmdbMovie.budget,
    revenue: tmdbMovie.revenue,
    status: tmdbMovie.status,
    homepage: tmdbMovie.homepage,
    imdb_id: tmdbMovie.imdb_id,
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
    date: tmdbTV.first_air_date,
    poster_path: tmdbTV.poster_path,
    overview: tmdbTV.overview,
    vote_average: tmdbTV.vote_average,
    vote_count: tmdbTV.vote_count,
    popularity: tmdbTV.popularity,
    original_language: tmdbTV.original_language,
    origin_country: tmdbTV.origin_country,
    genres: tmdbTV.genres,
    original_name: tmdbTV.original_name,
    episode_run_time: tmdbTV.episode_run_time,
    show_type: tmdbTV.show_type,
    number_of_seasons: tmdbTV.number_of_seasons,
    number_of_episodes: tmdbTV.number_of_episodes,
    status: tmdbTV.status,
    homepage: tmdbTV.homepage,
  };
}
