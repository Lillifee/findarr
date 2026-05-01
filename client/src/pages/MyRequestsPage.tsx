import type { Media, UserInteractionsResponse } from '@findarr/shared';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResultsGrid } from '../components/ResultsGrid';
import { useHistoryRestoreState } from '../hooks/useHistoryRestoreState';
import { interactionService } from '../services/api';

interface RequestsPageState {
  currentPage: number;
  results: Media[];
  scrollY: number;
  totalPages: number;
}

export function MyRequestsPage() {
  const navigate = useNavigate();
  const { restoredState, persistState } = useHistoryRestoreState<RequestsPageState>();

  const [searchResults, setSearchResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const loadVotes = useCallback(async ({ page, append }: { page: number; append: boolean }) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response: UserInteractionsResponse = await interactionService.listLiked(page);
      const responsePage = response.page;

      setCurrentPage(responsePage);
      setTotalPages(response.totalPages);
      setHasMore(responsePage < response.totalPages);

      if (!append) {
        setSearchResults(response.results);
        return;
      }

      setSearchResults(prev => {
        const keyOf = (item: Media) => `${item.type}_${item.tmdbId}`;
        const seen = new Set(prev.map(item => keyOf(item)));
        const merged = [...prev];

        for (const item of response.results) {
          if (!seen.has(keyOf(item))) {
            merged.push(item);
            seen.add(keyOf(item));
          }
        }

        return merged;
      });
    } catch (error) {
      console.error('Failed to load voted media:', error);
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const persistHistoryState = useCallback(() => {
    if (searchResults.length === 0) {
      return;
    }

    persistState({
      results: searchResults,
      currentPage,
      totalPages,
      scrollY: window.scrollY,
    });
  }, [currentPage, persistState, searchResults, totalPages]);

  useEffect(() => {
    if (restoredState) {
      setSearchResults(restoredState.results);
      setCurrentPage(restoredState.currentPage);
      setTotalPages(restoredState.totalPages);
      setHasMore(restoredState.currentPage < restoredState.totalPages);
      requestAnimationFrame(() => {
        window.scrollTo({ top: restoredState.scrollY, behavior: 'auto' });
      });
      return;
    }

    void loadVotes({ page: 1, append: false });
  }, [loadVotes, restoredState]);

  const handleSelectItem = (item: Media) => {
    persistHistoryState();
    void navigate(`/${item.type}/${item.tmdbId}`);
  };

  const handleUpdateItem = (updatedItem: Media) => {
    setSearchResults(prev =>
      prev.map(item =>
        item.tmdbId === updatedItem.tmdbId && item.type === updatedItem.type ? updatedItem : item
      )
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-amber-400 mb-2">My Votes</h1>
        <p className="text-sm md:text-base text-gray-400">Movies and TV shows you've voted on</p>
      </div>

      {/* Loading State */}
      {loading && searchResults.length === 0 && (
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading your votes...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && searchResults.length === 0 && (
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
      {!loading && searchResults.length > 0 && (
        <div id="results-section">
          <ResultsGrid
            results={searchResults}
            onSelectItem={handleSelectItem}
            onUpdateItem={handleUpdateItem}
          />

          {hasMore && (
            <div className="text-center mt-6 md:mt-8 pt-4 md:pt-6 pb-20 md:pb-0 border-t border-gray-700">
              <div className="flex justify-center items-center gap-2 md:gap-3 flex-wrap">
                <button
                  onClick={() => {
                    void loadVotes({ page: currentPage + 1, append: true });
                  }}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all bg-linear-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 cursor-pointer shadow-md disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <span>{loadingMore ? 'Loading...' : 'Load more'}</span>
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
                {searchResults.length.toLocaleString()}
                {currentPage < totalPages ? '+' : ''} votes loaded
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
