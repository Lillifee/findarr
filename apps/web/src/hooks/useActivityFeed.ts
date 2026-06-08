import type { InteractionsQuery } from '@findarr/shared/interaction';
import type { Media, SearchType, UserInteractionsResponse } from '@findarr/shared/media';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { interactionService } from '../services/api';
import { buildActivitySearchParams, readActivitySearchParams } from '../utils/activitySearchParams';
import { useHistoryRestoreState } from './useHistoryRestoreState';

type ActionFilter = InteractionsQuery['action'];

interface ActivityPageState {
  actionFilter: ActionFilter;
  activityPage: number;
  activityResults: Media[];
  selectedType: SearchType;
  scrollY: number;
  totalPages: number;
}

const attentionStatuses = new Set(['downloading', 'warning']);

const keyOf = (item: Media) => `${item.type}_${item.tmdbId}`;

function mergeUniqueResults(existing: Media[], incoming: Media[]) {
  const seen = new Set(existing.map((item) => keyOf(item)));
  const merged = [...existing];

  for (const item of incoming) {
    if (!seen.has(keyOf(item))) {
      merged.push(item);
      seen.add(keyOf(item));
    }
  }

  return merged;
}

export interface ActivityFeed {
  activityResults: Media[];
  attentionResults: Media[];
  actionFilter: ActionFilter;
  selectedType: SearchType;
  loadingActivity: boolean;
  loadingAttention: boolean;
  loadingMore: boolean;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  reloadActivityWith: (next: { action?: ActionFilter; type?: SearchType }) => void;
  loadMore: () => void;
  updateItem: (updatedItem: Media) => void;
  persistHistoryState: () => void;
}

export function useActivityFeed(): ActivityFeed {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearchParams = readActivitySearchParams(searchParams, { action: 'liked', type: 'both' });
  const { restoredState, persistState } = useHistoryRestoreState<ActivityPageState>();
  const urlActionFilter = urlSearchParams.action;
  const urlSelectedType = urlSearchParams.type;

  const [activityResults, setActivityResults] = useState<Media[]>([]);
  const [attentionResults, setAttentionResults] = useState<Media[]>([]);
  const [actionFilter, setActionFilter] = useState<ActionFilter>(urlActionFilter);
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
      action?: ActionFilter;
      append: boolean;
      page: number;
      type?: SearchType;
    }) => {
      const requestId = (activityRequestIdRef.current += 1);

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

        setActivityResults((prev) => mergeUniqueResults(prev, response.results));
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
    [actionFilter, selectedType],
  );

  const loadAttention = useCallback(
    async (type: SearchType = selectedType) => {
      const requestId = (attentionRequestIdRef.current += 1);

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
    [selectedType],
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
    (state: Pick<ActivityPageState, 'actionFilter' | 'selectedType'>) =>
      state.actionFilter === urlActionFilter && state.selectedType === urlSelectedType,
    [urlActionFilter, urlSelectedType],
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
      const activityRequestId = (activityRequestIdRef.current += 1);

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

  const reloadActivityWith = useCallback(
    (next: { action?: ActionFilter; type?: SearchType }) => {
      const nextAction = next.action ?? actionFilter;
      const nextType = next.type ?? selectedType;

      setActionFilter(nextAction);
      setSelectedType(nextType);
      setSearchParams(buildActivitySearchParams({ action: nextAction, type: nextType }));
    },
    [actionFilter, selectedType, setSearchParams],
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

    void loadActivity({ action: actionFilter, append: false, page: 1, type: selectedType });
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

  const loadMore = () => {
    void loadActivity({ append: true, page: currentPage + 1 });
  };

  const updateItem = (updatedItem: Media) => {
    setActivityResults((prev) =>
      prev.map((item) => (keyOf(item) === keyOf(updatedItem) ? updatedItem : item)),
    );

    setAttentionResults((prev) => {
      const nextResults = prev.map((item) =>
        keyOf(item) === keyOf(updatedItem) ? updatedItem : item,
      );
      const hasUserInteraction = (updatedItem.state?.interactions?.length ?? 0) > 0;
      const isAttentionStatus = attentionStatuses.has(updatedItem.state?.record?.status ?? '');

      if (!hasUserInteraction || !isAttentionStatus) {
        return nextResults.filter((item) => keyOf(item) !== keyOf(updatedItem));
      }

      return nextResults;
    });
  };

  return {
    activityResults,
    attentionResults,
    actionFilter,
    selectedType,
    loadingActivity,
    loadingAttention,
    loadingMore,
    currentPage,
    totalPages,
    hasMore,
    reloadActivityWith,
    loadMore,
    updateItem,
    persistHistoryState,
  };
}
