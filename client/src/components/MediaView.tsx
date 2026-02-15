import type { MovieDetails, TVDetails } from '@findarr/shared';

interface MediaDetailsProps {
  media: MovieDetails | TVDetails;
  onRequest: () => void;
}

export function MediaView({ media, onRequest }: MediaDetailsProps) {
  // Common data extraction
  const title = media.name;
  const releaseDate = media.date;
  const buttonText = media.type === 'movie' ? '📥 Request Movie' : '📥 Request TV Show';
  const buttonColor = media.type === 'movie' ? '#28a745' : '#17a2b8';

  // Format helpers
  const formatRuntime = (value: number | number[] | undefined) => {
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
      {media.posterPath && (
        <img
          src={`https://image.tmdb.org/t/p/w500${media.posterPath}`}
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
        {media.type === 'movie' && media.tagline && (
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

        {media.type === 'tv' && media.originalName !== media.name && (
          <p
            style={{
              fontStyle: 'italic',
              color: '#666',
              marginBottom: '1rem',
              fontSize: '1.1rem',
            }}
          >
            Original: {media.originalName}
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
            ⭐ {media.voteAverage.toFixed(1)} ({media.voteCount.toLocaleString()} votes)
          </span>
          <span>📅 {releaseDate}</span>
          <span>
            ⏱️ {formatRuntime(media.type === 'movie' ? media.runtime : media.episodeRunTime)}
          </span>
          <span>🎭 {media.status}</span>
        </div>

        {/* TV-specific additional stats */}
        {media.type === 'tv' && (
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
              🏠 {media.numberOfSeasons} Season{media.numberOfSeasons === 1 ? '' : 's'}
            </span>
            <span>
              📽️ {media.numberOfEpisodes} Episode{media.numberOfEpisodes === 1 ? '' : 's'}
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
        {media.type === 'tv' && media.originCountry && media.originCountry.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Origin Country</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {media.originCountry.map((country, index) => (
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
          {media.type === 'movie' && (
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

          {media.type === 'tv' && (
            <>
              <div>
                <strong>Show Type:</strong>
                <br />
                {media.showType}
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
            {media.originalLanguage?.toUpperCase()}
          </div>

          {media.type === 'movie' && media.imdbId && (
            <div>
              <strong>IMDB:</strong>
              <br />
              <a
                href={`https://www.imdb.com/title/${media.imdbId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#007bff', textDecoration: 'none' }}
              >
                View on IMDB →
              </a>
            </div>
          )}
        </div>

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
