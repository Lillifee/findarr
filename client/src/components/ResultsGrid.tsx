import React from 'react';
import { Media } from '../../../shared/dist/types';

interface ResultsGridProps {
  results: Media[];
  onSelectItem: (item: Media) => void;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export const ResultsGrid: React.FC<ResultsGridProps> = ({ results, onSelectItem }) => {
  if (results.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>No results found</div>;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem',
      }}
    >
      {results.map(item => {
        const title = item.name;
        const releaseDate = item.date;
        const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
        const itemType = item.type === 'movie' ? 'Movie' : 'TV Show';

        return (
          <div
            key={item.id}
            onClick={() => onSelectItem(item)}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              backgroundColor: 'white',
              position: 'relative',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Trending Badge */}
            {item.trending_rank && (
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                🔥 TRENDING
              </div>
            )}

            {item.poster_path ? (
              <img
                src={`${TMDB_IMAGE_BASE}${item.poster_path}`}
                alt={title}
                style={{
                  width: '100%',
                  height: '300px',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '300px',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                }}
              >
                No Image
              </div>
            )}

            <div style={{ padding: '1rem' }}>
              <h3
                style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1rem',
                  fontWeight: '600',
                  lineHeight: '1.3',
                }}
              >
                {title}
              </h3>

              {/* Year and Rating Row */}
              <div
                style={{
                  fontSize: '0.875rem',
                  color: '#666',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.25rem',
                }}
              >
                <span>{year}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⭐ {item.vote_average.toFixed(1)}</span>
                  <span style={{ fontSize: '0.75rem', color: '#999' }}>
                    ({item.vote_count.toLocaleString()} votes)
                  </span>
                </div>
              </div>

              {/* Media Type and Popularity Row */}
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#888',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <span style={{ fontStyle: 'italic' }}>{itemType}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span title="Popularity Score">🔥 {Math.round(item.popularity || 0)}</span>

                  <span
                    title="Original Language"
                    style={{ textTransform: 'uppercase', fontWeight: '500' }}
                  >
                    {item.original_language}
                  </span>
                </div>
              </div>

              {/* Custom Score Row */}
              {item.custom_popularity && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#666',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span title="Custom Score (Trending + Quality + Recency)">
                    📊 Custom: {Math.round(item.custom_popularity || 0)}
                  </span>
                  {item.trending_rank && (
                    <span title={`Trending Rank #${item.trending_rank}`}>
                      #{item.trending_rank}
                    </span>
                  )}
                </div>
              )}

              {item.overview && (
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: '#888',
                    margin: '0',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.overview}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
