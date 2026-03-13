import type { RegionGroupId, GenreKey } from '@findarr/shared';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { DiscoverResponse, SearchType, Media } from '../../../shared/dist/types';
import { GenreChips } from '../components/GenreChips';
import { MediaTypeChips } from '../components/MediaTypeChips';
import { RegionChips } from '../components/RegionChips';
import { ResultsGrid } from '../components/ResultsGrid';
import { searchService } from '../services/api';

export function PopularPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchResults, setSearchResults] = useState<DiscoverResponse | null>(null);
  const [currentSearchType, setCurrentSearchType] = useState<SearchType>(
    (searchParams.get('type') as SearchType) || 'both'
  );
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<string>('de-DE');
  const [selectedRegions, setSelectedRegions] = useState<RegionGroupId[]>(['western']);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(
    Number.parseInt(searchParams.get('page') || '1', 10)
  );
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>([]);

  // Sync state with URL params when they change (e.g., browser back/forward)
  useEffect(() => {
    const urlType = (searchParams.get('type') as SearchType) || 'both';
    const urlPage = Number.parseInt(searchParams.get('page') || '1', 10);

    if (urlType !== currentSearchType) {
      setCurrentSearchType(urlType);
    }
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load popular content on initial render or when filters change
  useEffect(() => {
    const loadPopularContent = async () => {
      setLoading(true);

      try {
        const results = await searchService.popularMedia({
          type: currentSearchType,
          page: currentPage,
          language,
          regionGroups: selectedRegions,
          withGenres: selectedGenres,
        });

        setSearchResults(results);
      } catch (error) {
        console.error('Failed to load popular content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPopularContent();
  }, [currentSearchType, language, selectedRegions, currentPage, selectedGenres]);

  const handleRegionsChange = (regions: RegionGroupId[]) => {
    setSelectedRegions(regions);
    setCurrentPage(1);
    setSearchParams({ type: currentSearchType, page: '1' });
    setSearchResults(null);
  };

  const handleTypeChange = (type: SearchType) => {
    setCurrentSearchType(type);
    setCurrentPage(1);
    setSearchParams({ type, page: '1' });
    setSearchResults(null);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
    setCurrentPage(1);
    setSearchParams({ type: currentSearchType, page: '1' });
    setSearchResults(null);
  };

  const handleGenreChange = (genres: GenreKey[]) => {
    setSelectedGenres(genres);
    setCurrentPage(1);
    setSearchParams({ type: currentSearchType, page: '1' });
    setSearchResults(null);
  };

  const handlePageChange = async (newPage: number) => {
    setCurrentPage(newPage);
    setSearchParams({ type: currentSearchType, page: newPage.toString() });

    setTimeout(() => {
      const resultsSection = document.querySelector('#results-section');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleSelectItem = (item: Media) => {
    navigate(`/${item.type}/${item.tmdbId}`);
  };

  return (
    <>
      {/* Sticky Media Type & Filter Toggle Row - Full Width */}
      <div className="sticky top-0 z-30 bg-gray-800/90 backdrop-blur-md border-b border-gray-700/50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <MediaTypeChips
              selectedType={currentSearchType}
              onChange={handleTypeChange}
              disabled={loading}
            />

            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700/80 transition-all cursor-pointer whitespace-nowrap shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              <span>Filters</span>
              {!filtersExpanded && (
                <span className="hidden md:inline text-xs font-normal text-gray-400">
                  (
                  {selectedGenres.length > 0 &&
                    `${selectedGenres.length} genre${selectedGenres.length === 1 ? '' : 's'}`}
                  {selectedGenres.length > 0 && selectedRegions.length > 0 && ', '}
                  {selectedRegions.length > 0 &&
                    `${selectedRegions.length} region${selectedRegions.length === 1 ? '' : 's'}`}
                  {selectedGenres.length === 0 && selectedRegions.length === 0 && 'None'})
                </span>
              )}
              <span
                className="text-sm transition-transform duration-200"
                style={{
                  transform: filtersExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ▼
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Additional Filters - Overlay */}
      {filtersExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
            onClick={() => setFiltersExpanded(false)}
          />

          {/* Filter Panel */}
          <div className="fixed top-16 left-0 right-0 md:left-64 md:right-0 z-50 mx-4 md:mx-8 max-w-7xl md:ml-auto md:mr-auto animate-in slide-in-from-top-4 duration-200">
            <div className="bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden">
              {/* Close Button */}
              <div className="flex justify-end p-2 border-b border-gray-700/50">
                <button
                  onClick={() => setFiltersExpanded(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-md transition-all cursor-pointer"
                >
                  <span>Close</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-3 md:p-4">
                <div className="flex flex-col gap-4">
                  {/* Genres */}
                  <GenreChips
                    selectedGenres={selectedGenres}
                    onGenreChange={handleGenreChange}
                    disabled={loading}
                  />

                  <div className="flex flex-col gap-2 w-full">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                        />
                      </svg>
                      <span>Language</span>
                    </label>
                    <select
                      value={language}
                      onChange={handleLanguageChange}
                      disabled={loading}
                      className="w-full px-3 py-3 text-base border-2 border-gray-600 rounded-lg bg-gray-800/60 backdrop-blur-sm text-white hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

                  {/* Regions */}
                  <RegionChips
                    selectedRegions={selectedRegions}
                    onRegionsChange={handleRegionsChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8">
        {searchResults && (
          <div id="results-section">
            <div className="flex justify-between items-center gap-3 mb-6">
              <h2 className="text-xl md:text-3xl font-bold text-white">Trending & Popular</h2>
              {searchResults && searchResults.totalResults && (
                <span className="text-gray-400 text-xs md:text-sm">
                  {searchResults.totalResults.toLocaleString()} results
                </span>
              )}
            </div>

            <ResultsGrid results={searchResults.results} onSelectItem={handleSelectItem} />

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
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 cursor-pointer shadow-md'
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
                              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold border-2 border-amber-500 shadow-md'
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
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 cursor-pointer shadow-md'
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
                    ({searchResults?.totalResults?.toLocaleString()} total results)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {!searchResults && !loading && (
          <div className="text-center p-8 md:p-16 text-gray-500">
            <div className="flex flex-col items-center gap-4">
              <svg
                className="w-12 h-12 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                />
              </svg>
              <p className="text-base md:text-lg">Loading content...</p>
            </div>
          </div>
        )}
      </div>

      {/* Additional Filters - Overlay */}
      {filtersExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
            onClick={() => setFiltersExpanded(false)}
          />

          {/* Filter Panel */}
          <div className="fixed top-16 left-0 right-0 md:left-64 md:right-0 z-50 mx-4 md:mx-8 max-w-7xl md:ml-auto md:mr-auto animate-in slide-in-from-top-4 duration-200">
            <div className="bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden">
              {/* Close Button */}
              <div className="flex justify-end p-2 border-b border-gray-700/50">
                <button
                  onClick={() => setFiltersExpanded(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-md transition-all cursor-pointer"
                >
                  <span>Close</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-3 md:p-4">
                <div className="flex flex-col gap-4">
                  {/* Genres */}
                  <GenreChips
                    selectedGenres={selectedGenres}
                    onGenreChange={handleGenreChange}
                    disabled={loading}
                  />

                  <div className="flex flex-col gap-2 w-full">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                        />
                      </svg>
                      <span>Language</span>
                    </label>
                    <select
                      value={language}
                      onChange={handleLanguageChange}
                      disabled={loading}
                      className="w-full px-3 py-3 text-base border-2 border-gray-600 rounded-lg bg-gray-800/60 backdrop-blur-sm text-white hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

                  {/* Regions */}
                  <RegionChips
                    selectedRegions={selectedRegions}
                    onRegionsChange={handleRegionsChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
