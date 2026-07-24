import type { Media, MediaStatus, SearchType } from '@findarr/shared/media';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { interactionService } from '../services/api';
import {
  activityStatusGroups,
  type ActivityAudience,
  type ActivityStatusGroup,
} from '../utils/activityFilters';
import { buildActivitySearchParams, readActivitySearchParams } from '../utils/activitySearchParams';
import { useHistoryRestoreState } from './useHistoryRestoreState';
import { useSession } from './useSession';

type StatusGroupFilter = ActivityStatusGroup;
type AudienceFilter = ActivityAudience;

interface ActivityPageState {
  audience: AudienceFilter;
  activityPage: number;
  activityResults: Media[];
  selectedType: SearchType;
  statusGroups: StatusGroupFilter[];
  scrollY: number;
  hasMore: boolean;
}

interface ActivityState {
  results: Media[];
  page: number;
  hasMore: boolean;
}

interface LoadingState {
  activity: boolean;
  more: boolean;
}

const keyOf = (item: Media) => `${item.type}_${item.tmdbId}`;

const ACTIVITY_PAGE_SIZE = 20;

const ALL_ACTIVITY_STATUSES: MediaStatus[] = [
  'voting',
  'requested',
  'downloading',
  'downloaded',
  'available',
  'warning',
];

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
  audience: AudienceFilter;
  selectedType: SearchType;
  statusGroups: StatusGroupFilter[];
  loadingActivity: boolean;
  loadingMore: boolean;
  currentPage: number;
  hasMore: boolean;
  reloadActivityWith: (next: {
    audience?: AudienceFilter;
    statusGroups?: StatusGroupFilter[];
    type?: SearchType;
  }) => void;
  loadMore: () => void;
  updateItem: (updatedItem: Media) => void;
  persistHistoryState: () => void;
}

export function useActivityFeed(): ActivityFeed {
  const { user } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    audience,
    statusGroups,
    type: selectedType,
  } = useMemo(
    () =>
      readActivitySearchParams(searchParams, {
        audience: 'mine',
        statusGroups: [],
        type: 'both',
      }),
    [searchParams],
  );
  const { restoredState, persistState } = useHistoryRestoreState<ActivityPageState>();

  const [activityState, setActivityState] = useState<ActivityState>({
    results: [],
    page: 1,
    hasMore: false,
  });
  const [loading, setLoading] = useState<LoadingState>({
    activity: false,
    more: false,
  });
  const activityRequestIdRef = useRef(0);

  const activityResults = activityState.results;
  const currentPage = activityState.page;
  const { hasMore } = activityState;

  const loadActivity = useCallback(
    async (options: {
      append: boolean;
      page: number;
      type: SearchType;
      userId?: number;
      statuses: MediaStatus[];
    }) => {
      const requestId = (activityRequestIdRef.current += 1);
      const requestParams = {
        page: options.page,
        type: options.type,
        statuses: options.statuses,
        ...(options.userId === undefined ? {} : { userId: options.userId }),
      };

      setLoading((prev) => ({ ...prev, [options.append ? 'more' : 'activity']: true }));

      try {
        const response = await interactionService.listActivity(requestParams);
        const responsePage = response.page;

        if (requestId !== activityRequestIdRef.current) {
          return;
        }

        setActivityState((prev) => ({
          results: options.append
            ? mergeUniqueResults(prev.results, response.results)
            : response.results,
          page: responsePage,
          hasMore: response.results.length === ACTIVITY_PAGE_SIZE,
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

  const persistHistoryState = useCallback(() => {
    if (activityResults.length === 0) {
      return;
    }

    persistState({
      audience,
      activityPage: currentPage,
      activityResults,
      selectedType,
      statusGroups,
      hasMore,
      scrollY: window.scrollY,
    });
  }, [activityResults, audience, currentPage, hasMore, persistState, selectedType, statusGroups]);

  const matchesCurrentFilters = useCallback(
    (state: Pick<ActivityPageState, 'audience' | 'selectedType' | 'statusGroups'>) =>
      state.audience === audience &&
      state.selectedType === selectedType &&
      state.statusGroups.length === statusGroups.length &&
      state.statusGroups.every((group, index) => group === statusGroups[index]),
    [audience, selectedType, statusGroups],
  );

  useEffect(() => {
    if (restoredState && matchesCurrentFilters(restoredState)) {
      setActivityState({
        results: restoredState.activityResults,
        page: restoredState.activityPage,
        hasMore: restoredState.hasMore,
      });
      requestAnimationFrame(() => {
        window.scrollTo({ top: restoredState.scrollY, behavior: 'auto' });
      });
      return;
    }

    const statusList =
      statusGroups.length > 0
        ? statusGroups.flatMap((group) => activityStatusGroups[group])
        : ALL_ACTIVITY_STATUSES;

    void loadActivity({
      append: false,
      page: 1,
      type: selectedType,
      ...(audience === 'mine' && user?.id !== undefined ? { userId: user.id } : {}),
      statuses: [...statusList],
    });
  }, [
    audience,
    loadActivity,
    matchesCurrentFilters,
    restoredState,
    user?.id,
    selectedType,
    statusGroups,
  ]);

  const reloadActivityWith = useCallback(
    (next: {
      audience?: AudienceFilter;
      statusGroups?: StatusGroupFilter[];
      type?: SearchType;
    }) => {
      const nextAudience = next.audience ?? audience;
      const nextStatusGroups = next.statusGroups ?? statusGroups;
      const nextType = next.type ?? selectedType;

      setSearchParams(
        buildActivitySearchParams({
          audience: nextAudience,
          statusGroups: nextStatusGroups,
          type: nextType,
        }),
      );
    },
    [audience, selectedType, setSearchParams, statusGroups],
  );

  const loadMore = () => {
    const statusList =
      statusGroups.length > 0
        ? statusGroups.flatMap((group) => activityStatusGroups[group])
        : ALL_ACTIVITY_STATUSES;

    void loadActivity({
      append: true,
      page: currentPage + 1,
      type: selectedType,
      ...(audience === 'mine' && user?.id !== undefined ? { userId: user.id } : {}),
      statuses: [...statusList],
    });
  };

  const updateItem = (updatedItem: Media) => {
    setActivityState((prev) => ({
      ...prev,
      results: prev.results.map((item) =>
        keyOf(item) === keyOf(updatedItem) ? updatedItem : item,
      ),
    }));
  };

  return {
    activityResults,
    audience,
    selectedType,
    statusGroups,
    loadingActivity: loading.activity,
    loadingMore: loading.more,
    currentPage,
    hasMore,
    reloadActivityWith,
    loadMore,
    updateItem,
    persistHistoryState,
  };
}
