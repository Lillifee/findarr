import React, { useState } from 'react';
import { searchService } from '../services/api';
import { SearchResponse, SearchType } from '@findarr/shared';

interface SearchBarProps {
  onSearch: (results: SearchResponse, type: SearchType) => void;
  loading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, loading }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('both');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const results = await searchService.searchMedia({
        query: query.trim(),
        page: 1,
        include_adult: false,
        language: 'en-US',
        type: searchType,
      });

      onSearch(results, searchType);
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
          value={searchType}
          onChange={e => setSearchType(e.target.value as SearchType)}
          disabled={loading}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid #ddd',
            borderRadius: '4px',
          }}
        >
          <option value="both">Movies & TV Shows</option>
          <option value="movie">Movies Only</option>
          <option value="tv">TV Shows Only</option>
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
