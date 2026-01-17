import { useState } from 'react';
import { searchService } from './services/api';
import {
  MediaType,
  Movie,
  MovieDetails,
  SearchResponse,
  TVDetails,
  TVShow,
} from '../../shared/dist/types';
import { MovieDetailsComponent } from './components/MovieDetails';
import { ResultsGrid } from './components/ResultsGrid';
import { SearchBar } from './components/SearchBar';
import { TVDetailsComponent } from './components/TVDetails';

function App() {
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [currentMediaType, setCurrentMediaType] = useState<MediaType>('movie');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Movie | TVShow | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<MovieDetails | TVDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const handleSearch = async (results: SearchResponse, type: MediaType) => {
    setLoading(true);
    try {
      setSearchResults(results);
      setCurrentMediaType(type);
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
      let details;
      if (currentMediaType === 'movie') {
        details = await searchService.getMovieDetails(item.id);
      } else {
        details = await searchService.getTVDetails(item.id);
      }
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
                  {currentMediaType === 'movie' ? 'Movies' : 'TV Shows'}
                </h2>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>
                  {searchResults.total_results.toLocaleString()} results
                </span>
              </div>

              <ResultsGrid
                results={searchResults.results}
                mediaType={currentMediaType}
                onSelectItem={handleSelectItem}
              />

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
            <>
              {currentMediaType === 'movie' ? (
                <MovieDetailsComponent
                  movie={selectedDetails as MovieDetails}
                  onRequest={() => {
                    // TODO: Implement request functionality for Jellyseer/Radarr
                    alert(
                      'Movie request functionality coming soon! This will integrate with Jellyseer or Radarr.'
                    );
                  }}
                />
              ) : (
                <TVDetailsComponent
                  tv={selectedDetails as TVDetails}
                  onRequest={() => {
                    // TODO: Implement request functionality for Jellyseer/Sonarr
                    alert(
                      'TV Show request functionality coming soon! This will integrate with Jellyseer or Sonarr.'
                    );
                  }}
                />
              )}
            </>
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
          <p style={{ fontSize: '1.1rem' }}>
            Search for your favorite movies and TV shows to get started!
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
