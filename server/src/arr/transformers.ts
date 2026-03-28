/**
 * Transformers to convert Radarr/Sonarr API responses to unified ArrLibraryItem type
 * These functions map the raw API data structure to our unified internal structure
 */
import type { ArrLibraryItem, RadarrMovie, SonarrSeries } from './schemas.js';

/**
 * Transform Radarr Movie to unified ArrLibraryItem type
 */
export function transformRadarrMovie(radarrMovie: RadarrMovie): ArrLibraryItem {
  return {
    id: radarrMovie.id,
    type: 'movie',
    tmdbId: radarrMovie.tmdbId,
    title: radarrMovie.title,
    year: radarrMovie.year,
    monitored: radarrMovie.monitored,
    hasFile: radarrMovie.hasFile,
  };
}

/**
 * Transform Sonarr Series to unified ArrLibraryItem type
 */
export function transformSonarrSeries(sonarrSeries: SonarrSeries): ArrLibraryItem {
  // Compute hasFile from statistics (series has files if any episodes downloaded)
  const hasFile = (sonarrSeries.statistics?.episodeFileCount ?? 0) > 0;

  return {
    id: sonarrSeries.id,
    type: 'tv',
    tvdbId: sonarrSeries.tvdbId,
    title: sonarrSeries.title,
    year: sonarrSeries.year,
    monitored: sonarrSeries.monitored,
    hasFile,
  };
}

/**
 * Unified transformer that uses the type discriminator from the validated schema
 * Since RadarrMovie and SonarrSeries now include type field, we can use it directly
 */
export function transformArrMedia(item: RadarrMovie | SonarrSeries): ArrLibraryItem {
  return item.type === 'movie' ? transformRadarrMovie(item) : transformSonarrSeries(item);
}
