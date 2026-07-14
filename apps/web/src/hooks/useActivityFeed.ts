import type { InteractionsQuery } from '@findarr/shared/interaction';
import type { Media, SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
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

interface ActivityState {
  results: Media[];
  page: number;
  totalPages: number;
}

interface LoadingState {
  activity: boolean;
  attention: boolean;
  more: boolean;
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
  const { action: actionFilter, type: selectedType } = readActivitySearchParams(searchParams, {
    action: 'liked',
    type: 'both',
  });
  const { restoredState, persistState } = useHistoryRestoreState<ActivityPageState>();

  const [activityState, setActivityState] = useState<ActivityState>({
    results: [],
    page: 1,
    totalPages: 0,
  });
  const [attentionResults, setAttentionResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    activity: false,
    attention: false,
    more: false,
  });
  const activityRequestIdRef = useRef(0);
  const attentionRequestIdRef = useRef(0);

  const activityResults = activityState.results;
  const currentPage = activityState.page;
  const { totalPages } = activityState;
  const hasMore = currentPage < totalPages;

  const loadActivity = useCallback(
    async (options: { action: ActionFilter; append: boolean; page: number; type: SearchType }) => {
      const requestId = (activityRequestIdRef.current += 1);

      setLoading((prev) => ({ ...prev, [options.append ? 'more' : 'activity']: true }));

      try {
        const response = await interactionService.listActivity(options);
        const responsePage = response.page;

        if (requestId !== activityRequestIdRef.current) {
          return;
        }

        setActivityState((prev) => ({
          results: options.append
            ? mergeUniqueResults(prev.results, response.results)
            : response.results,
          page: responsePage,
          totalPages: response.totalPages,
        }));
      } catch (error) {
        console.error('Failed to load personal activity:', error);
      } finally {
        if (requestId === activityRequestIdRef.current) {
          setLoading((prev) => ({ ...prev, [options.append ? 'more' : 'activity']: false }));
        }
      }
    },
    [],
  );

  const loadAttention = useCallback(async (type: SearchType) => {
    const requestId = (attentionRequestIdRef.current += 1);

    setLoading((prev) => ({ ...prev, attention: true }));

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
        setLoading((prev) => ({ ...prev, attention: false }));
      }
    }
  }, []);

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

  const matchesCurrentFilters = useCallback(
    (state: Pick<ActivityPageState, 'actionFilter' | 'selectedType'>) =>
      state.actionFilter === actionFilter && state.selectedType === selectedType,
    [actionFilter, selectedType],
  );

  useEffect(() => {
    if (restoredState && matchesCurrentFilters(restoredState)) {
      setActivityState({
        results: restoredState.activityResults,
        page: restoredState.activityPage,
        totalPages: restoredState.totalPages,
      });
      void loadAttention(restoredState.selectedType);
      requestAnimationFrame(() => {
        window.scrollTo({ top: restoredState.scrollY, behavior: 'auto' });
      });
      return;
    }

    void loadActivity({ action: actionFilter, append: false, page: 1, type: selectedType });
    void loadAttention(selectedType);
  }, [
    actionFilter,
    loadActivity,
    loadAttention,
    matchesCurrentFilters,
    restoredState,
    selectedType,
  ]);

  const reloadActivityWith = useCallback(
    (next: { action?: ActionFilter; type?: SearchType }) => {
      const nextAction = next.action ?? actionFilter;
      const nextType = next.type ?? selectedType;

      setSearchParams(buildActivitySearchParams({ action: nextAction, type: nextType }));
    },
    [actionFilter, selectedType, setSearchParams],
  );

  const loadMore = () => {
    void loadActivity({
      action: actionFilter,
      append: true,
      page: currentPage + 1,
      type: selectedType,
    });
  };

  const updateItem = (updatedItem: Media) => {
    setActivityState((prev) => ({
      ...prev,
      results: prev.results.map((item) =>
        keyOf(item) === keyOf(updatedItem) ? updatedItem : item,
      ),
    }));

    setAttentionResults((prev) => {
      const nextResults = prev.map((item) =>
        keyOf(item) === keyOf(updatedItem) ? updatedItem : item,
      );
      const hasUserInteraction = isDefined(updatedItem.state?.interaction);
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
    loadingActivity: loading.activity,
    loadingAttention: loading.attention,
    loadingMore: loading.more,
    currentPage,
    totalPages,
    hasMore,
    reloadActivityWith,
    loadMore,
    updateItem,
    persistHistoryState,
  };
}
