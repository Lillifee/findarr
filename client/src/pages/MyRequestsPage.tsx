import type { DiscoverResponse, Media } from '@findarr/shared';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ResultsGrid } from '../components/ResultsGrid';
import { interactionService } from '../services/api';

export function MyRequestsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchResults, setSearchResults] = useState<DiscoverResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(
    Number.parseInt(searchParams.get('page') || '1', 10)
  );

  // Sync state with URL params when they change (e.g., browser back/forward)
  useEffect(() => {
    const urlPage = Number.parseInt(searchParams.get('page') || '1', 10);
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load user's voted media on initial render or when page changes
  useEffect(() => {
    const loadVotedMedia = async () => {
      setLoading(true);

      try {
        const results = await interactionService.listLiked(currentPage);
        setSearchResults(results);
      } catch (error) {
        console.error('Failed to load voted media:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVotedMedia().catch(error => {
      console.error('Error loading voted media:', error);
    });
  }, [currentPage]);

  const handlePageChange = async (newPage: number) => {
    setCurrentPage(newPage);
    setSearchParams({ page: newPage.toString() });

    setTimeout(() => {
      const resultsSection = document.querySelector('#results-section');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleSelectItem = (item: Media) => {
    void navigate(`/${item.type}/${item.tmdbId}`);
  };

  const handleUpdateItem = (updatedItem: Media) => {
    setSearchResults(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        results: prev.results.map(item =>
          item.tmdbId === updatedItem.tmdbId && item.type === updatedItem.type ? updatedItem : item
        ),
      };
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-amber-400 mb-2">My Votes</h1>
        <p className="text-sm md:text-base text-gray-400">Movies and TV shows you've voted on</p>
      </div>

      {/* Loading State */}
      {loading && !searchResults && (
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading your votes...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && searchResults && searchResults.results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <svg
            className="w-24 h-24 text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No votes yet</h3>
          <p className="text-gray-500 text-center max-w-md">
            You haven't voted on any media yet. Start exploring and vote on movies and TV shows
            you'd like to watch!
          </p>
        </div>
      )}

      {/* Results Grid */}
      {!loading && searchResults && searchResults.results.length > 0 && (
        <div id="results-section">
          <ResultsGrid
            results={searchResults.results}
            onSelectItem={handleSelectItem}
            onUpdateItem={handleUpdateItem}
          />

          {/* Pagination Controls */}
          {searchResults.totalPages && searchResults.totalPages > 1 && (
            <div className="text-center mt-6 md:mt-8 pt-4 md:pt-6 pb-20 md:pb-0 border-t border-gray-700">
              <div className="flex justify-center items-center gap-2 md:gap-3 flex-wrap">
                {/* Previous button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                  className={`inline-flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                    currentPage <= 1
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-linear-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 cursor-pointer shadow-md'
                  } disabled:cursor-not-allowed`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Page numbers */}
                <div className="flex gap-1 md:gap-2 items-center">
                  {currentPage > 3 && (
                    <>
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={loading}
                        className="px-2 md:px-3 py-2 bg-gray-800/60 backdrop-blur-sm text-amber-400 border border-gray-600/50 rounded-lg text-xs md:text-sm hover:bg-gray-700/80 transition-all disabled:cursor-not-allowed cursor-pointer"
                      >
                        1
                      </button>
                      {currentPage > 4 && <span className="text-gray-500 text-xs">...</span>}
                    </>
                  )}

                  {Array.from({ length: Math.min(5, searchResults?.totalPages ?? 1) }, (_, i) => {
                    const pageStart = Math.max(1, currentPage - 2);
                    const pageEnd = Math.min(searchResults?.totalPages ?? 1, pageStart + 4);
                    const adjustedStart = Math.max(1, pageEnd - 4);
                    const pageNum = adjustedStart + i;

                    if (pageNum > pageEnd) return null;

                    const isMobileHidden = Math.abs(pageNum - currentPage) > 1 && currentPage > 1;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loading}
                        className={`${isMobileHidden ? 'hidden sm:block' : ''} px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm transition-all cursor-pointer ${
                          pageNum === currentPage
                            ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white font-semibold border-2 border-amber-500 shadow-md'
                            : 'bg-gray-800/60 backdrop-blur-sm text-amber-400 border border-gray-600/50 hover:bg-gray-700/80'
                        } disabled:cursor-not-allowed`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {currentPage < (searchResults?.totalPages ?? 1) - 2 && (
                    <>
                      {currentPage < (searchResults?.totalPages ?? 1) - 3 && (
                        <span className="text-gray-500 text-xs">...</span>
                      )}
                      <button
                        onClick={() => handlePageChange(searchResults?.totalPages ?? 1)}
                        disabled={loading}
                        className="px-2 md:px-3 py-2 bg-gray-800/60 backdrop-blur-sm text-amber-400 border border-gray-600/50 rounded-lg text-xs md:text-sm hover:bg-gray-700/80 transition-all disabled:cursor-not-allowed cursor-pointer"
                      >
                        {searchResults?.totalPages}
                      </button>
                    </>
                  )}
                </div>

                {/* Next button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= (searchResults?.totalPages ?? 1) || loading}
                  className={`inline-flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                    currentPage >= (searchResults?.totalPages ?? 1)
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-linear-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 cursor-pointer shadow-md'
                  } disabled:cursor-not-allowed`}
                >
                  <span className="hidden sm:inline">Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-3 text-xs md:text-sm text-gray-400">
                Page {currentPage} of {searchResults?.totalPages}
                <span className="hidden sm:inline">
                  {' '}
                  ({searchResults?.totalResults?.toLocaleString()} total votes)
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
