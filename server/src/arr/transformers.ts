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
    arrUrl: `/movie/${radarrMovie.tmdbId}`,
    title: radarrMovie.title,
    year: radarrMovie.year,
    monitored: radarrMovie.monitored,
    hasFile: radarrMovie.hasFile,
  };
}

/**
 * Transform Sonarr Series to unified ArrLibraryItem type
 */
export function transformSonarrSeries(series: SonarrSeries): ArrLibraryItem {
  const seasons = series.seasons?.map(s => {
    const stats = s.statistics;
    const total = stats?.totalEpisodeCount ?? stats?.episodeCount ?? 0;
    const downloaded = stats?.episodeFileCount ?? 0;

    return {
      seasonNumber: s.seasonNumber,
      status:
        total > 0 && downloaded >= total
          ? 'downloaded'
          : s.monitored
            ? 'monitored'
            : 'none',
    } as const;
  });

  return {
    id: series.id,
    type: 'tv',
    tvdbId: series.tvdbId,
    title: series.title,
    year: series.year,
    monitored: series.monitored,
    hasFile: (series.statistics?.episodeFileCount ?? 0) > 0,
    ...(series.titleSlug && { arrUrl: `/series/${series.titleSlug}` }),
    ...(seasons && { seasons }),
  };
}

/**
 * Unified transformer that uses the type discriminator from the validated schema
 * Since RadarrMovie and SonarrSeries now include type field, we can use it directly
 */
export function transformArrMedia(
  item: RadarrMovie | SonarrSeries
): ArrLibraryItem {
  return item.type === 'movie'
    ? transformRadarrMovie(item)
    : transformSonarrSeries(item);
}
