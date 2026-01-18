import { useState, useEffect } from 'react';
import { searchService } from './services/api';
import {
  Movie,
  MovieDetails,
  SearchResponse,
  SearchType,
  TVDetails,
  TVShow,
} from '../../shared/dist/types';
import { ResultsGrid } from './components/ResultsGrid';
import { SearchBar } from './components/SearchBar';
import { MediaView } from './components/MediaView';

// Helper function to determine if an item is a movie
function isMovie(item: Movie | TVShow): item is Movie {
  return 'title' in item && 'release_date' in item;
}

function App() {
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [currentSearchType, setCurrentSearchType] = useState<SearchType>('both');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Movie | TVShow | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<MovieDetails | TVDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load popular content on initial render
  useEffect(() => {
    const loadDiscoveryContent = async () => {
      setLoading(true);
      try {
        const discoveryResults = await searchService.discoverMedia({
          type: 'both',
          sort_by: 'popularity.desc',
          page: 1,
        });
        setSearchResults(discoveryResults);
      } catch (error) {
        console.error('Failed to load discovery content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDiscoveryContent();
  }, []);

  const handleSearch = async (results: SearchResponse, type: SearchType) => {
    setLoading(true);
    setHasSearched(true);
    try {
      setSearchResults(results);
      setCurrentSearchType(type);
      setSelectedItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = async (item: Movie | TVShow) => {
    setSelectedItem(item);
    setSelectedDetails(null);
    setDetailsLoading(true);

    try {
      const type = isMovie(item) ? 'movie' : 'tv';
      const details = await searchService.detailsMedia({ id: item.id, type });
      setSelectedDetails(details);
    } catch (error) {
      console.error('Failed to fetch details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleBackToResults = () => {
    setSelectedItem(null);
    setSelectedDetails(null);
  };

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", roboto, sans-serif',
      }}
    >
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1
          style={{
            fontSize: '2.5rem',
            color: '#333',
            margin: '0 0 1rem 0',
            fontWeight: '700',
          }}
        >
          🎬 Findarr
        </h1>
        <p
          style={{
            fontSize: '1.2rem',
            color: '#666',
            margin: '0',
          }}
        >
          Discover movies and TV shows with TMDB
        </p>
      </header>

      {!selectedItem && (
        <>
          <SearchBar onSearch={handleSearch} loading={loading} />

          {searchResults && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                <h2 style={{ margin: '0', color: '#333' }}>
                  {hasSearched
                    ? currentSearchType === 'movie'
                      ? 'Movies'
                      : currentSearchType === 'tv'
                        ? 'TV Shows'
                        : 'Movies & TV Shows'
                    : 'Popular Movies & TV Shows'}
                </h2>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>
                  {searchResults.total_results.toLocaleString()} results
                </span>
              </div>

              <ResultsGrid results={searchResults.results} onSelectItem={handleSelectItem} />

              {searchResults.total_pages > 1 && (
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '2rem',
                    color: '#666',
                  }}
                >
                  Page {searchResults.page} of {searchResults.total_pages}
                  {/* TODO: Add pagination controls */}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selectedItem && (
        <div>
          <button
            onClick={handleBackToResults}
            style={{
              marginBottom: '2rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ← Back to Results
          </button>

          {detailsLoading && (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#666',
              }}
            >
              Loading details...
            </div>
          )}

          {selectedDetails && !detailsLoading && (
            <MediaView
              media={selectedDetails}
              onRequest={() => {
                const mediaType = isMovie(selectedItem) ? 'Movie' : 'TV Show';
                const service = isMovie(selectedItem) ? 'Jellyseer/Radarr' : 'Jellyseer/Sonarr';
                alert(
                  `${mediaType} request functionality coming soon! This will integrate with ${service}.`
                );
              }}
            />
          )}
        </div>
      )}

      {!searchResults && !loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#666',
          }}
        >
          <p style={{ fontSize: '1.1rem' }}>Loading popular content...</p>
        </div>
      )}
    </div>
  );
}

export default App;
