import { useState } from 'react';
import type { GenreKey } from '../../../shared/src/constants';

interface Props {
  selectedGenres: GenreKey[];
  onGenreChange: (genres: GenreKey[]) => void;
}

export default function GenreSelector({ selectedGenres, onGenreChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleGenreToggle = (genreKey: GenreKey) => {
    const updatedKeys = selectedGenres.includes(genreKey)
      ? selectedGenres.filter(k => k !== genreKey)
      : [...selectedGenres, genreKey];

    onGenreChange(updatedKeys);
  };

  const clearAllGenres = () => {
    onGenreChange([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6c757d' }}>
        Genres {selectedGenres.length > 0 && `(${selectedGenres.length} selected)`}
      </label>
      <div style={{ position: 'relative', minWidth: '180px' }}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid #ddd',
            borderRadius: '6px',
            backgroundColor: 'white',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: selectedGenres.length === 0 ? '#999' : '#333' }}>
            {selectedGenres.length === 0
              ? 'Select genres...'
              : `${selectedGenres.length} genre${selectedGenres.length !== 1 ? 's' : ''} selected`}
          </span>
          <span
            style={{
              fontSize: '1.2rem',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              color: '#666',
            }}
          >
            ▼
          </span>
        </button>

        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              backgroundColor: 'white',
              border: '2px solid #ddd',
              borderRadius: '6px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              maxHeight: '240px',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                padding: '0.5rem 0.75rem',
                borderBottom: '1px solid #e9ecef',
                backgroundColor: '#f8f9fa',
              }}
            >
              <button
                type="button"
                onClick={clearAllGenres}
                style={{
                  fontSize: '0.875rem',
                  color: '#007bff',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Clear all
              </button>
            </div>
            {objectEntries(unifiedGenres).map(([key, genre]) => {
              const isSelected = selectedGenres.includes(key);
              return (
                <div
                  key={key}
                  onClick={() => handleGenreToggle(key)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isSelected ? '#e3f2fd' : 'white',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: isSelected ? '500' : '400',
                      color: isSelected ? '#1976d2' : '#333',
                    }}
                  >
                    {genre.name}
                  </span>
                  {isSelected && <span style={{ color: '#1976d2', fontSize: '1rem' }}>✓</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
