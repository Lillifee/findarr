import type { Media, SearchType } from '@findarr/shared/media';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { interactionService } from '../services/api';
import {
  ALL_ACTIVITY_STATUSES,
  type ActivityAudience,
  type ActivityStatus,
} from '../utils/activityFilters';
import {
  buildActivitySearchParams,
  readActivitySearchParams,
  type ActivityAction,
} from '../utils/activitySearchParams';
import { isSameMedia, mergeUniqueMedia } from '../utils/media';
import { useSession } from './useSession';

type StatusFilter = ActivityStatus;
type AudienceFilter = ActivityAudience;

interface ActivityState {
  results: Media[];
  page: number;
  hasMore: boolean;
}

interface LoadingState {
  activity: boolean;
  more: boolean;
}

const ACTIVITY_PAGE_SIZE = 20;

export interface ActivityFeed {
  activityResults: Media[];
  audience: AudienceFilter;
  selectedType: SearchType;
  statuses: StatusFilter[];
  action: ActivityAction;
  loadingActivity: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  reloadActivityWith: (next: {
    audience?: AudienceFilter;
    statuses?: StatusFilter[];
    type?: SearchType;
    action?: ActivityAction;
  }) => void;
  loadMore: () => void;
  updateItem: (updatedItem: Media) => void;
}

export function useActivityFeed(): ActivityFeed {
  const { user } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    audience,
    statuses,
    action,
    type: selectedType,
  } = useMemo(
    () =>
      readActivitySearchParams(searchParams, {
        audience: 'mine',
        statuses: [],
        type: 'both',
      }),
    [searchParams],
  );

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
      statuses: ActivityStatus[];
      action: ActivityAction;
    }) => {
      activityRequestIdRef.current += 1;
      const requestId = activityRequestIdRef.current;
      const requestParams = {
        page: options.page,
        type: options.type,
        statuses: options.statuses,
        action: options.action,
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
            ? mergeUniqueMedia(prev.results, response.results)
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

  useEffect(() => {
    const statusList = statuses.length > 0 ? statuses : ALL_ACTIVITY_STATUSES;

    void loadActivity({
      append: false,
      page: 1,
      type: selectedType,
      ...(audience === 'mine' && user?.id !== undefined ? { userId: user.id } : {}),
      statuses: [...statusList],
      action,
    });
  }, [audience, loadActivity, user?.id, selectedType, statuses, action]);

  const reloadActivityWith = useCallback(
    (next: {
      audience?: AudienceFilter;
      statuses?: StatusFilter[];
      type?: SearchType;
      action?: ActivityAction;
    }) => {
      const nextAudience = next.audience ?? audience;
      const nextStatuses = next.statuses ?? statuses;
      const nextType = next.type ?? selectedType;
      const nextAction = next.action ?? (nextAudience === 'everyone' ? 'all' : action);

      setSearchParams(
        buildActivitySearchParams({
          audience: nextAudience,
          statuses: nextStatuses,
          type: nextType,
          action: nextAction,
        }),
      );
    },
    [action, audience, selectedType, setSearchParams, statuses],
  );

  const loadMore = () => {
    const statusList = statuses.length > 0 ? statuses : ALL_ACTIVITY_STATUSES;

    void loadActivity({
      append: true,
      page: currentPage + 1,
      type: selectedType,
      ...(audience === 'mine' && user?.id !== undefined ? { userId: user.id } : {}),
      statuses: [...statusList],
      action,
    });
  };

  const updateItem = useCallback((updatedItem: Media) => {
    setActivityState((prev) => ({
      ...prev,
      results: prev.results.map((item) => (isSameMedia(item, updatedItem) ? updatedItem : item)),
    }));
  }, []);

  return {
    activityResults,
    audience,
    selectedType,
    statuses,
    action,
    loadingActivity: loading.activity,
    loadingMore: loading.more,
    hasMore,
    reloadActivityWith,
    loadMore,
    updateItem,
  };
}
