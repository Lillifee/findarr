import React from 'react';
import { MediaType, Movie, TVShow } from '../../../shared/dist/types';

interface ResultsGridProps {
  results: (Movie | TVShow)[];
  mediaType: MediaType;
  onSelectItem: (item: Movie | TVShow) => void;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export const ResultsGrid: React.FC<ResultsGridProps> = ({ results, mediaType, onSelectItem }) => {
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
        const title = mediaType === 'movie' ? (item as Movie).title : (item as TVShow).name;
        const releaseDate =
          mediaType === 'movie' ? (item as Movie).release_date : (item as TVShow).first_air_date;
        const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';

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

              <div
                style={{
                  fontSize: '0.875rem',
                  color: '#666',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{year}</span>
                <span>⭐ {item.vote_average.toFixed(1)}</span>
              </div>

              {item.overview && (
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: '#888',
                    margin: '0.5rem 0 0 0',
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
