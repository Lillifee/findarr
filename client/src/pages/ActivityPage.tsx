import type {
  InteractionsQuery,
  Media,
  SearchType,
  UserInteractionsResponse,
} from '@findarr/shared';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiltersToolbar } from '../components/FiltersToolbar';
import { ResultsGrid } from '../components/ResultsGrid';
import { Button } from '../components/ui/Button';
import { OptionButton } from '../components/ui/OptionButton';
import { useHistoryRestoreState } from '../hooks/useHistoryRestoreState';
import { interactionService } from '../services/api';
import { buildActivitySearchParams, readActivitySearchParams } from '../utils/activitySearchParams';

interface RequestsPageState {
  actionFilter: InteractionsQuery['action'];
  activityPage: number;
  activityResults: Media[];
  selectedType: SearchType;
  scrollY: number;
  totalPages: number;
}

function keyOf(item: Media) {
  return `${item.type}_${item.tmdbId}`;
}

function mergeUniqueResults(existing: Media[], incoming: Media[]) {
  const seen = new Set(existing.map(item => keyOf(item)));
  const merged = [...existing];

  for (const item of incoming) {
    if (!seen.has(keyOf(item))) {
      merged.push(item);
      seen.add(keyOf(item));
    }
  }

  return merged;
}

export function ActivityPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const attentionStatuses = new Set(['downloading', 'warning']);
  const urlSearchParams = readActivitySearchParams(searchParams, {
    action: 'liked',
    type: 'both',
  });
  const { restoredState, persistState } = useHistoryRestoreState<RequestsPageState>();
  const urlActionFilter = urlSearchParams.action;
  const urlSelectedType = urlSearchParams.type;

  const [activityResults, setActivityResults] = useState<Media[]>([]);
  const [attentionResults, setAttentionResults] = useState<Media[]>([]);
  const [actionFilter, setActionFilter] = useState<InteractionsQuery['action']>(urlActionFilter);
  const [selectedType, setSelectedType] = useState<SearchType>(urlSelectedType);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingAttention, setLoadingAttention] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const skipNextReloadRef = useRef(false);
  const skipNextAttentionReloadRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const activityRequestIdRef = useRef(0);
  const attentionRequestIdRef = useRef(0);

  useEffect(() => {
    if (urlActionFilter !== actionFilter) {
      setActionFilter(urlActionFilter);
    }

    if (urlSelectedType !== selectedType) {
      setSelectedType(urlSelectedType);
    }
  }, [actionFilter, selectedType, urlActionFilter, urlSelectedType]);

  const loadActivity = useCallback(
    async ({
      action = actionFilter,
      append,
      page,
      type = selectedType,
    }: {
      action?: InteractionsQuery['action'];
      append: boolean;
      page: number;
      type?: SearchType;
    }) => {
      const requestId = ++activityRequestIdRef.current;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingActivity(true);
      }

      try {
        const response: UserInteractionsResponse = await interactionService.listActivity({
          action,
          page,
          type,
        });
        const responsePage = response.page;

        if (requestId !== activityRequestIdRef.current) {
          return;
        }

        setCurrentPage(responsePage);
        setTotalPages(response.totalPages);
        setHasMore(responsePage < response.totalPages);

        if (!append) {
          setActivityResults(response.results);
          return;
        }

        setActivityResults(prev => mergeUniqueResults(prev, response.results));
      } catch (error) {
        console.error('Failed to load personal activity:', error);
      } finally {
        if (requestId === activityRequestIdRef.current) {
          if (append) {
            setLoadingMore(false);
          } else {
            setLoadingActivity(false);
          }
        }
      }
    },
    [actionFilter, selectedType]
  );

  const loadAttention = useCallback(
    async (type: SearchType = selectedType) => {
      const requestId = ++attentionRequestIdRef.current;

      setLoadingAttention(true);

      try {
        const response = await interactionService.listAttention({ type });

        if (requestId !== attentionRequestIdRef.current) {
          return;
        }

        setAttentionResults(response.results);
      } catch (error) {
        console.error('Failed to load activity attention items:', error);
      } finally {
        if (requestId === attentionRequestIdRef.current) {
          setLoadingAttention(false);
        }
      }
    },
    [selectedType]
  );

  const persistHistoryState = useCallback(() => {
    if (activityResults.length === 0) {
      return;
    }

    persistState({
      actionFilter,
      activityPage: currentPage,
      activityResults,
      selectedType,
      totalPages,
      scrollY: window.scrollY,
    });
  }, [actionFilter, activityResults, currentPage, persistState, selectedType, totalPages]);

  const matchesUrlFilters = useCallback(
    (state: Pick<RequestsPageState, 'actionFilter' | 'selectedType'>) =>
      state.actionFilter === urlActionFilter && state.selectedType === urlSelectedType,
    [urlActionFilter, urlSelectedType]
  );

  useEffect(() => {
    if (restoredState && matchesUrlFilters(restoredState)) {
      skipNextReloadRef.current = true;
      skipNextAttentionReloadRef.current = true;
      setActionFilter(restoredState.actionFilter);
      setActivityResults(restoredState.activityResults);
      setCurrentPage(restoredState.activityPage);
      setSelectedType(restoredState.selectedType);
      setTotalPages(restoredState.totalPages);
      setHasMore(restoredState.activityPage < restoredState.totalPages);
      void loadAttention(restoredState.selectedType);
      requestAnimationFrame(() => {
        window.scrollTo({ top: restoredState.scrollY, behavior: 'auto' });
      });
      hasInitializedRef.current = true;
      return;
    }

    const loadInitialPage = async () => {
      const activityRequestId = ++activityRequestIdRef.current;

      setLoadingActivity(true);

      try {
        const activityResponse = await interactionService.listActivity({
          action: urlActionFilter,
          page: 1,
          type: urlSelectedType,
        });

        if (activityRequestId === activityRequestIdRef.current) {
          setActivityResults(activityResponse.results);
          setCurrentPage(activityResponse.page);
          setTotalPages(activityResponse.totalPages);
          setHasMore(activityResponse.page < activityResponse.totalPages);
        }
      } catch (error) {
        console.error('Failed to load initial requests page state:', error);
      } finally {
        if (activityRequestId === activityRequestIdRef.current) {
          setLoadingActivity(false);
        }
      }
    };

    skipNextReloadRef.current = true;
    skipNextAttentionReloadRef.current = true;
    void loadInitialPage();
    void loadAttention(urlSelectedType);
    hasInitializedRef.current = true;
  }, [loadAttention, matchesUrlFilters, restoredState, urlActionFilter, urlSelectedType]);

  const handleSelectItem = (item: Media) => {
    persistHistoryState();
    void navigate(`/${item.type}/${item.tmdbId}`);
  };

  const handleUpdateItem = (updatedItem: Media) => {
    setActivityResults(prev =>
      prev.map(item => (keyOf(item) === keyOf(updatedItem) ? updatedItem : item))
    );

    setAttentionResults(prev => {
      const nextResults = prev.map(item =>
        keyOf(item) === keyOf(updatedItem) ? updatedItem : item
      );
      const hasUserInteraction = (updatedItem.state?.interactions?.length ?? 0) > 0;
      const isAttentionStatus = attentionStatuses.has(updatedItem.state?.record?.status ?? '');

      if (!hasUserInteraction || !isAttentionStatus) {
        return nextResults.filter(item => keyOf(item) !== keyOf(updatedItem));
      }

      return nextResults;
    });
  };

  const reloadActivityWith = useCallback(
    (next: { action?: InteractionsQuery['action']; type?: SearchType }) => {
      const nextAction = next.action ?? actionFilter;
      const nextType = next.type ?? selectedType;

      setActionFilter(nextAction);
      setSelectedType(nextType);
      setSearchParams(
        buildActivitySearchParams({
          action: nextAction,
          type: nextType,
        })
      );
    },
    [actionFilter, selectedType, setSearchParams]
  );

  useEffect(() => {
    if (!hasInitializedRef.current) {
      return;
    }

    if (skipNextReloadRef.current) {
      skipNextReloadRef.current = false;
      return;
    }

    setCurrentPage(1);
    setHasMore(false);

    void loadActivity({
      action: actionFilter,
      append: false,
      page: 1,
      type: selectedType,
    });
  }, [actionFilter, loadActivity, selectedType]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      return;
    }

    if (skipNextAttentionReloadRef.current) {
      skipNextAttentionReloadRef.current = false;
      return;
    }

    void loadAttention(selectedType);
  }, [loadAttention, selectedType]);

  return (
    <>
      <FiltersToolbar
        selectedType={selectedType}
        onTypeChange={type => reloadActivityWith({ type })}
        selectedGenres={[]}
        onGenresChange={() => undefined}
        showFiltersButton
        showGenreFilter={false}
        filterDescription="Adjust your activity filters."
        extraFiltersContent={
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/70 p-4">
            <div className="mb-2.5">
              <h4 className="text-sm font-semibold text-white">Voting status</h4>
            </div>
            <div className="grid gap-2.5 md:grid-cols-3">
              <OptionButton
                selected={actionFilter === 'all'}
                onClick={() => reloadActivityWith({ action: 'all' })}
                title="All activity"
                description="Show everything you have voted on."
                icon={
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                      actionFilter === 'all'
                        ? 'border-gray-500 bg-gray-200/90 text-gray-900'
                        : 'border-gray-600/70 bg-transparent text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                }
              />
              <OptionButton
                selected={actionFilter === 'liked'}
                onClick={() => reloadActivityWith({ action: 'liked' })}
                title="Upvotes"
                description="Focus on titles you liked."
                icon={
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                      actionFilter === 'liked'
                        ? 'border-gray-500 bg-gray-200/90 text-gray-900'
                        : 'border-gray-600/70 bg-transparent text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                }
              />
              <OptionButton
                selected={actionFilter === 'disliked'}
                onClick={() => reloadActivityWith({ action: 'disliked' })}
                title="Downvotes"
                description="Focus on titles you disliked."
                icon={
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                      actionFilter === 'disliked'
                        ? 'border-gray-500 bg-gray-200/90 text-gray-900'
                        : 'border-gray-600/70 bg-transparent text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                }
              />
            </div>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-4 pb-20 md:px-8 md:py-8 md:pb-20">
        {(loadingAttention || attentionResults.length > 0) && (
          <section className="mb-10 rounded-3xl border border-amber-500/20 bg-linear-to-br from-amber-500/10 via-gray-900/70 to-orange-500/10 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/80">
                  Queue
                </p>
              </div>

              {!loadingAttention && attentionResults.length > 0 && (
                <div className="text-xs text-amber-100/80 md:text-sm">
                  {attentionResults.length.toLocaleString()} item
                  {attentionResults.length === 1 ? '' : 's'}
                </div>
              )}
            </div>

            {loadingAttention && attentionResults.length === 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm text-gray-300">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300/40 border-t-amber-300" />
                <span>Loading attention items...</span>
              </div>
            )}

            {!loadingAttention && attentionResults.length > 0 && (
              <ResultsGrid
                results={attentionResults}
                onSelectItem={handleSelectItem}
                onUpdateItem={handleUpdateItem}
              />
            )}
          </section>
        )}

        <section id="results-section">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-white md:text-3xl">Your Activity</h2>
              </div>

              <div className="text-xs text-gray-400 md:text-sm">
                {activityResults.length.toLocaleString()}
                {currentPage < totalPages ? '+' : ''} items loaded
              </div>
            </div>
          </div>

          {loadingActivity && activityResults.length === 0 && (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading your activity...</p>
              </div>
            </div>
          )}

          {!loadingActivity && activityResults.length === 0 && (
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
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No activity yet</h3>
              <p className="text-gray-500 text-center max-w-md">
                You have not voted on any media yet. Start exploring and your personal request
                activity will show up here.
              </p>
            </div>
          )}

          {!loadingActivity && activityResults.length > 0 && (
            <ResultsGrid
              results={activityResults}
              onSelectItem={handleSelectItem}
              onUpdateItem={handleUpdateItem}
            />
          )}

          {hasMore && (
            <div className="pt-6 md:pb-0 md:pt-8">
              <div className="text-center pt-4 md:pt-6 md:pb-0 border-t border-gray-700">
                <Button
                  onClick={() => {
                    void loadActivity({ append: true, page: currentPage + 1 });
                  }}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
