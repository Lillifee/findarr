import { TVDetails } from '@findarr/shared';

interface TVDetailsProps {
  tv: TVDetails;
  onRequest: () => void;
}

export function TVDetailsComponent({ tv, onRequest }: TVDetailsProps) {
  const formatRuntime = (episodes: number[]) => {
    if (!episodes || episodes.length === 0) return 'Unknown';
    if (episodes.length === 1) return `${episodes[0]}m`;
    return `${Math.min(...episodes)}-${Math.max(...episodes)}m per episode`;
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
      {tv.poster_path && (
        <img
          src={`https://image.tmdb.org/t/p/w500${tv.poster_path}`}
          alt={tv.name}
          style={{
            width: '300px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        />
      )}

      <div>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem' }}>{tv.name}</h1>

        {tv.original_name !== tv.name && (
          <p
            style={{
              fontStyle: 'italic',
              color: '#666',
              marginBottom: '1rem',
              fontSize: '1.1rem',
            }}
          >
            Original: {tv.original_name}
          </p>
        )}

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
            ⭐ {tv.vote_average.toFixed(1)} ({tv.vote_count.toLocaleString()} votes)
          </span>
          <span>📅 {tv.first_air_date}</span>
          <span>📺 {tv.type}</span>
          <span>🎭 {tv.status}</span>
        </div>

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
            🏠 {tv.number_of_seasons} Season
            {tv.number_of_seasons !== 1 ? 's' : ''}
          </span>
          <span>
            📽️ {tv.number_of_episodes} Episode
            {tv.number_of_episodes !== 1 ? 's' : ''}
          </span>
          <span>⏱️ {formatRuntime(tv.episode_run_time)}</span>
        </div>

        {tv.genres && tv.genres.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Genres</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {tv.genres.map(genre => (
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

        {tv.origin_country && tv.origin_country.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Origin Country</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {tv.origin_country.map((country, index) => (
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

        {tv.overview && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0' }}>Overview</h3>
            <p style={{ lineHeight: '1.6', color: '#444', fontSize: '1rem' }}>{tv.overview}</p>
          </div>
        )}

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
          <div>
            <strong>Original Language:</strong>
            <br />
            {tv.original_language?.toUpperCase()}
          </div>
          <div>
            <strong>Popularity:</strong>
            <br />
            {tv.popularity.toFixed(1)}
          </div>
          <div>
            <strong>Show Type:</strong>
            <br />
            {tv.type}
          </div>
          <div>
            <strong>Status:</strong>
            <br />
            {tv.status}
          </div>
        </div>

        {tv.homepage && (
          <div style={{ marginBottom: '2rem' }}>
            <a
              href={tv.homepage}
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

        <button
          onClick={onRequest}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          📥 Request TV Show
        </button>
      </div>
    </div>
  );
}
