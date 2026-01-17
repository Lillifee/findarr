import { MovieDetails } from '@findarr/shared';

interface MovieDetailsProps {
  movie: MovieDetails;
  onRequest: () => void;
}

export function MovieDetailsComponent({ movie, onRequest }: MovieDetailsProps) {
  const formatRuntime = (minutes: number | null) => {
    if (!minutes) return 'Unknown';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
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
      {movie.poster_path && (
        <img
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={movie.title}
          style={{
            width: '300px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        />
      )}

      <div>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem' }}>{movie.title}</h1>

        {movie.tagline && (
          <p
            style={{
              fontStyle: 'italic',
              color: '#666',
              marginBottom: '1rem',
              fontSize: '1.1rem',
            }}
          >
            "{movie.tagline}"
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
            ⭐ {movie.vote_average.toFixed(1)} ({movie.vote_count.toLocaleString()} votes)
          </span>
          <span>📅 {movie.release_date}</span>
          <span>⏱️ {formatRuntime(movie.runtime)}</span>
          <span>🎭 {movie.status}</span>
        </div>

        {movie.genres && movie.genres.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Genres</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {movie.genres.map(genre => (
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

        {movie.overview && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0' }}>Overview</h3>
            <p style={{ lineHeight: '1.6', color: '#444', fontSize: '1rem' }}>{movie.overview}</p>
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
            <strong>Budget:</strong>
            <br />
            {formatBudget(movie.budget)}
          </div>
          <div>
            <strong>Revenue:</strong>
            <br />
            {formatBudget(movie.revenue)}
          </div>
          <div>
            <strong>Original Language:</strong>
            <br />
            {movie.original_language?.toUpperCase()}
          </div>
          {movie.imdb_id && (
            <div>
              <strong>IMDB:</strong>
              <br />
              <a
                href={`https://www.imdb.com/title/${movie.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#007bff', textDecoration: 'none' }}
              >
                View on IMDB →
              </a>
            </div>
          )}
        </div>

        {movie.homepage && (
          <div style={{ marginBottom: '2rem' }}>
            <a
              href={movie.homepage}
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
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          📥 Request Movie
        </button>
      </div>
    </div>
  );
}
