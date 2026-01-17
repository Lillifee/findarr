import React, { useState } from 'react';
import { searchService } from '../services/api';
import { SearchResponse, MediaType } from '@findarr/shared';

interface SearchBarProps {
  onSearch: (results: SearchResponse, type: MediaType) => void;
  loading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, loading }) => {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('movie');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const results =
        mediaType === 'movie'
          ? await searchService.searchMovies({
              query: query.trim(),
              page: 1,
              include_adult: false,
              language: '',
            })
          : await searchService.searchTV({
              query: query.trim(),
              page: 1,
              include_adult: false,
              language: '',
            });

      onSearch(results, mediaType);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for movies or TV shows..."
          disabled={loading}
          style={{
            flex: 1,
            minWidth: '300px',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid #ddd',
            borderRadius: '4px',
          }}
        />

        <select
          value={mediaType}
          onChange={e => setMediaType(e.target.value as MediaType)}
          disabled={loading}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid #ddd',
            borderRadius: '4px',
          }}
        >
          <option value="movie">Movies</option>
          <option value="tv">TV Shows</option>
        </select>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
};
