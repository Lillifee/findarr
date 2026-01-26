import { MovieDetails, TVDetails, Video } from '@findarr/shared';

interface MediaDetailsProps {
  media: MovieDetails | TVDetails;
  onRequest: () => void;
}

// Type guards
function isMovie(media: MovieDetails | TVDetails): media is MovieDetails {
  return 'title' in media && 'release_date' in media;
}

export function MediaView({ media, onRequest }: MediaDetailsProps) {
  const isMovieType = isMovie(media);

  // Common data extraction
  const title = isMovieType ? media.title : media.name;
  const releaseDate = isMovieType ? media.release_date : media.first_air_date;
  const buttonText = isMovieType ? '📥 Request Movie' : '📥 Request TV Show';
  const buttonColor = isMovieType ? '#28a745' : '#17a2b8';

  // Format helpers
  const formatRuntime = (value: number | number[] | null) => {
    if (!value) return 'Unknown';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'Unknown';
      if (value.length === 1) return `${value[0]}m`;
      return `${Math.min(...value)}-${Math.max(...value)}m per episode`;
    }
    const hours = Math.floor(value / 60);
    const remainingMinutes = value % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${value}m`;
  };

  const formatBudget = (amount: number) => {
    if (amount === 0) return 'Unknown';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '2rem',
        alignItems: 'start',
      }}
    >
      {media.poster_path && (
        <img
          src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
          alt={title}
          style={{
            width: '300px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        />
      )}

      <div>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem' }}>{title}</h1>

        {/* Movie tagline or TV original name */}
        {isMovieType && media.tagline && (
          <p
            style={{
              fontStyle: 'italic',
              color: '#666',
              marginBottom: '1rem',
              fontSize: '1.1rem',
            }}
          >
            "{media.tagline}"
          </p>
        )}

        {!isMovieType && media.original_name !== media.name && (
          <p
            style={{
              fontStyle: 'italic',
              color: '#666',
              marginBottom: '1rem',
              fontSize: '1.1rem',
            }}
          >
            Original: {media.original_name}
          </p>
        )}

        {/* Common stats row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.5rem',
            marginBottom: '1.5rem',
            fontSize: '0.95rem',
          }}
        >
          <span>
            ⭐ {media.vote_average.toFixed(1)} ({media.vote_count.toLocaleString()} votes)
          </span>
          <span>📅 {releaseDate}</span>
          <span>⏱️ {formatRuntime(isMovieType ? media.runtime : media.episode_run_time)}</span>
          <span>🎭 {media.status}</span>
        </div>

        {/* TV-specific additional stats */}
        {!isMovieType && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.95rem',
            }}
          >
            <span>📺 {media.type}</span>
            <span>
              🏠 {media.number_of_seasons} Season{media.number_of_seasons !== 1 ? 's' : ''}
            </span>
            <span>
              📽️ {media.number_of_episodes} Episode{media.number_of_episodes !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Genres */}
        {media.genres && media.genres.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Genres</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {media.genres.map(genre => (
                <span
                  key={genre.id}
                  style={{
                    backgroundColor: '#e9ecef',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '16px',
                    fontSize: '0.85rem',
                    color: '#495057',
                  }}
                >
                  {genre.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* TV-specific origin countries */}
        {!isMovieType && media.origin_country && media.origin_country.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Origin Country</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {media.origin_country.map((country, index) => (
                <span
                  key={index}
                  style={{
                    backgroundColor: '#fff3cd',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '16px',
                    fontSize: '0.85rem',
                    color: '#856404',
                  }}
                >
                  {country}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Overview */}
        {media.overview && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0' }}>Overview</h3>
            <p style={{ lineHeight: '1.6', color: '#444', fontSize: '1rem' }}>{media.overview}</p>
          </div>
        )}

        {/* Info grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
          }}
        >
          {isMovieType && (
            <>
              <div>
                <strong>Budget:</strong>
                <br />
                {formatBudget(media.budget)}
              </div>
              <div>
                <strong>Revenue:</strong>
                <br />
                {formatBudget(media.revenue)}
              </div>
            </>
          )}

          {!isMovieType && (
            <>
              <div>
                <strong>Show Type:</strong>
                <br />
                {media.type}
              </div>
              <div>
                <strong>Popularity:</strong>
                <br />
                {media.popularity.toFixed(1)}
              </div>
            </>
          )}

          <div>
            <strong>Original Language:</strong>
            <br />
            {media.original_language?.toUpperCase()}
          </div>

          {isMovieType && media.imdb_id && (
            <div>
              <strong>IMDB:</strong>
              <br />
              <a
                href={`https://www.imdb.com/title/${media.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#007bff', textDecoration: 'none' }}
              >
                View on IMDB →
              </a>
            </div>
          )}
        </div>

        {/* Trailers and Videos */}
        {media.videos && media.videos.results.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Trailers & Videos</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem',
              }}
            >
              {media.videos.results
                .filter((video: Video) => video.site === 'YouTube')
                .slice(0, 6) // Limit to 6 videos to avoid overwhelming
                .map((video: Video) => (
                  <div
                    key={video.id}
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: 'white',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        aspectRatio: '16/9',
                        backgroundColor: '#f0f0f0',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        window.open(`https://www.youtube.com/watch?v=${video.key}`, '_blank')
                      }
                    >
                      <img
                        src={`https://img.youtube.com/vi/${video.key}/hqdefault.jpg`}
                        alt={video.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          borderRadius: '50%',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          color: 'white',
                        }}
                      >
                        ▶️
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem' }}>
                      <h4
                        style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: '600' }}
                      >
                        {video.name}
                      </h4>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#666',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{video.type}</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {video.official && (
                            <span
                              style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                              }}
                            >
                              Official
                            </span>
                          )}
                          <span style={{ textTransform: 'uppercase' }}>{video.site}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Homepage link */}
        {media.homepage && (
          <div style={{ marginBottom: '2rem' }}>
            <a
              href={media.homepage}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#007bff',
                textDecoration: 'none',
                fontSize: '0.95rem',
              }}
            >
              🌐 Official Website →
            </a>
          </div>
        )}

        {/* Request button */}
        <button
          onClick={onRequest}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: buttonColor,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
