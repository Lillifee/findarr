import { useState, useEffect } from 'react';
import { searchService } from './services/api';
import {
  Movie,
  MovieDetails,
  SearchResponse,
  SearchType,
  TVDetails,
  TVShow,
  RecentPeriod,
} from '../../shared/dist/types';
import { ResultsGrid } from './components/ResultsGrid';
import { SearchBar } from './components/SearchBar';
import { MediaView } from './components/MediaView';
import { TimeRangeSlider } from './components/TimeRangeSlider';
import { RegionSelector } from './components/RegionSelector';
import { RegionGroupId } from '@findarr/shared';

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
  const [timePeriod, setTimePeriod] = useState<RecentPeriod>('last_month');
  const [language, setLanguage] = useState<string>('de-DE');
  const [selectedRegions, setSelectedRegions] = useState<RegionGroupId[]>([]); // Default to no filtering - show all content
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentQuery, setCurrentQuery] = useState<string>('');

  // Load popular content on initial render or when back to discovery mode
  useEffect(() => {
    const loadDiscoveryContent = async () => {
      if (hasSearched) return; // Don't reload if user has searched

      setLoading(true);

      try {
        const discoveryResults = await searchService.discoverMedia({
          type: currentSearchType,
          sort_by: 'popularity.desc',
          page: currentPage,
          recent_period: timePeriod as RecentPeriod,
          language,
          region_groups: selectedRegions,
          // vote_count_gte: 50, // Higher threshold for better quality
        });

        setSearchResults(discoveryResults);
      } catch (error) {
        console.error('Failed to load discovery content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDiscoveryContent();
  }, [timePeriod, hasSearched, currentSearchType, language, selectedRegions, currentPage]);

  const handleTimePeriodChange = async (newTimePeriod: RecentPeriod) => {
    setTimePeriod(newTimePeriod);
    setCurrentPage(1); // Reset to first page when changing filters
    setSearchResults(null); // Clear existing results for fresh filtered content
  };

  const handleRegionsChange = (regions: RegionGroupId[]) => {
    setSelectedRegions(regions);
    setCurrentPage(1); // Reset to first page when changing filters
    setSearchResults(null); // Clear existing results for fresh filtered content
  };

  const handleTypeChange = (type: SearchType) => {
    setCurrentSearchType(type);
    setCurrentPage(1); // Reset to first page when changing filters
    setSearchResults(null); // Clear existing results for fresh filtered content
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
    setCurrentPage(1); // Reset to first page when changing language
    setSearchResults(null); // Clear existing results for fresh filtered content
  };

  const handleBackToDiscovery = () => {
    setHasSearched(false);
    setSelectedItem(null);
    setSelectedDetails(null);
    setCurrentPage(1);
    setCurrentQuery('');
    setSearchResults(null); // Clear existing results for fresh discovery content
  };

  const handleSearch = async (query: string, page: number = 1) => {
    setLoading(true);
    setHasSearched(true);
    setCurrentQuery(query);
    setCurrentPage(page);

    try {
      const results = await searchService.searchMedia({
        query,
        page,
        include_adult: false,
        language,
        type: currentSearchType,
        per_page: 40, // Get more results per page (TMDB supports up to 100)
      });

      setSearchResults(results);
      setSelectedItem(null);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage: number) => {
    if (hasSearched && currentQuery) {
      // Handle search pagination
      await handleSearch(currentQuery, newPage);
    } else {
      // Handle discovery pagination
      setCurrentPage(newPage);
    }

    // Scroll to results section after page change
    setTimeout(() => {
      const resultsSection = document.getElementById('results-section');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100); // Small delay to ensure content is loaded
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

          {/* Expandable Filter Controls */}
          <div
            style={{
              marginBottom: '2rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
            }}
          >
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#495057',
              }}
            >
              <span>
                🎛️ Advanced Filters
                {!filtersExpanded && selectedRegions.length > 0 && (
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '400',
                      color: '#6c757d',
                      marginLeft: '0.5rem',
                    }}
                  >
                    ({selectedRegions.length} region{selectedRegions.length !== 1 ? 's' : ''},{' '}
                    {currentSearchType}, {language.split('-')[0].toUpperCase()})
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: '1.2rem',
                  transform: filtersExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                ▼
              </span>
            </button>

            {filtersExpanded && (
              <div
                style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e9ecef',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '1.5rem',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-start',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6c757d' }}>
                      Media Type
                    </label>
                    <select
                      value={currentSearchType}
                      onChange={e => handleTypeChange(e.target.value as SearchType)}
                      disabled={loading}
                      style={{
                        padding: '0.75rem',
                        fontSize: '1rem',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        minWidth: '180px',
                      }}
                    >
                      <option value="both">Movies & TV Shows</option>
                      <option value="movie">Movies Only</option>
                      <option value="tv">TV Shows Only</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6c757d' }}>
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={handleLanguageChange}
                      disabled={loading}
                      style={{
                        padding: '0.75rem',
                        fontSize: '1rem',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        minWidth: '180px',
                      }}
                    >
                      <option value="de-DE">German (Germany)</option>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="fr-FR">French (France)</option>
                      <option value="es-ES">Spanish (Spain)</option>
                      <option value="it-IT">Italian (Italy)</option>
                      <option value="nl-NL">Dutch (Netherlands)</option>
                      <option value="pt-BR">Portuguese (Brazil)</option>
                    </select>
                  </div>

                  <RegionSelector
                    selectedRegions={selectedRegions}
                    onRegionsChange={handleRegionsChange}
                    disabled={loading}
                  />
                </div>
              </div>
            )}
          </div>

          {!hasSearched && <TimeRangeSlider value={timePeriod} onChange={handleTimePeriodChange} />}

          {searchResults && (
            <div id="results-section">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h2 style={{ margin: '0', color: '#333' }}>
                    {hasSearched
                      ? currentSearchType === 'movie'
                        ? 'Movies'
                        : currentSearchType === 'tv'
                          ? 'TV Shows'
                          : 'Movies & TV Shows'
                      : 'Popular Movies & TV Shows'}
                  </h2>
                  {hasSearched && (
                    <button
                      onClick={handleBackToDiscovery}
                      style={{
                        padding: '0.375rem 0.75rem',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                    >
                      Back to Discovery
                    </button>
                  )}
                </div>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>
                  {searchResults.total_results.toLocaleString()} results
                </span>
              </div>

              <ResultsGrid results={searchResults.results} onSelectItem={handleSelectItem} />

              {/* Pagination Controls */}
              {searchResults.total_pages > 1 && (
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '2rem',
                    padding: '1rem',
                    borderTop: '1px solid #e9ecef',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Previous button */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: currentPage <= 1 ? '#f8f9fa' : '#007bff',
                        color: currentPage <= 1 ? '#6c757d' : 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: currentPage <= 1 || loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      ← Previous
                    </button>

                    {/* Page numbers */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {/* First page */}
                      {currentPage > 3 && (
                        <>
                          <button
                            onClick={() => handlePageChange(1)}
                            disabled={loading}
                            style={{
                              padding: '0.5rem 0.75rem',
                              backgroundColor: 'white',
                              color: '#007bff',
                              border: '1px solid #dee2e6',
                              borderRadius: '4px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                            }}
                          >
                            1
                          </button>
                          {currentPage > 4 && <span style={{ color: '#6c757d' }}>...</span>}
                        </>
                      )}

                      {/* Current page and neighbors */}
                      {Array.from({ length: Math.min(5, searchResults.total_pages) }, (_, i) => {
                        const pageStart = Math.max(1, currentPage - 2);
                        const pageEnd = Math.min(searchResults.total_pages, pageStart + 4);
                        const adjustedStart = Math.max(1, pageEnd - 4);
                        const pageNum = adjustedStart + i;

                        if (pageNum > pageEnd) return null;

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loading}
                            style={{
                              padding: '0.5rem 0.75rem',
                              backgroundColor: pageNum === currentPage ? '#007bff' : 'white',
                              color: pageNum === currentPage ? 'white' : '#007bff',
                              border: `1px solid ${pageNum === currentPage ? '#007bff' : '#dee2e6'}`,
                              borderRadius: '4px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: pageNum === currentPage ? '600' : '400',
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {/* Last page */}
                      {currentPage < searchResults.total_pages - 2 && (
                        <>
                          {currentPage < searchResults.total_pages - 3 && (
                            <span style={{ color: '#6c757d' }}>...</span>
                          )}
                          <button
                            onClick={() => handlePageChange(searchResults.total_pages)}
                            disabled={loading}
                            style={{
                              padding: '0.5rem 0.75rem',
                              backgroundColor: 'white',
                              color: '#007bff',
                              border: '1px solid #dee2e6',
                              borderRadius: '4px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                            }}
                          >
                            {searchResults.total_pages}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Next button */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= searchResults.total_pages || loading}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor:
                          currentPage >= searchResults.total_pages ? '#f8f9fa' : '#007bff',
                        color: currentPage >= searchResults.total_pages ? '#6c757d' : 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor:
                          currentPage >= searchResults.total_pages || loading
                            ? 'not-allowed'
                            : 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Next →
                    </button>
                  </div>

                  <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#6c757d' }}>
                    Page {currentPage} of {searchResults.total_pages} (
                    {searchResults.total_results.toLocaleString()} total results)
                  </div>
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
