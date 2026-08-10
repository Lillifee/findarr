import type { SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import type { ActivityAudience, ActivityStatus } from './activityFilters';

export type ActivityAction = 'all' | 'liked' | 'disliked';

interface ActivitySearchParamState {
  audience: ActivityAudience;
  statuses: ActivityStatus[];
  type: SearchType;
  action: ActivityAction;
}

type ActivitySearchParamDefaults = Partial<ActivitySearchParamState>;
type ActivitySearchParamInput = Partial<ActivitySearchParamState>;

const isAudience = (value: string): value is ActivityAudience =>
  value === 'mine' || value === 'everyone';

const isActivityStatus = (value: string): value is ActivityStatus =>
  value === 'none' ||
  value === 'voting' ||
  value === 'requested' ||
  value === 'downloading' ||
  value === 'downloaded' ||
  value === 'available' ||
  value === 'warning';

const isSearchType = (value: string): value is SearchType =>
  value === 'movie' || value === 'tv' || value === 'both';

const isActivityAction = (value: string): value is ActivityAction =>
  value === 'all' || value === 'liked' || value === 'disliked';

export const readActivitySearchParams = (
  searchParams: URLSearchParams,
  defaults: ActivitySearchParamDefaults = {},
): ActivitySearchParamState => {
  const audience = searchParams.get('audience');
  const status = searchParams.getAll('status');
  const type = searchParams.get('type');
  const action = searchParams.get('action');

  const parsedStatus = status.filter((value) => isActivityStatus(value));

  return {
    type: isDefined(type) && isSearchType(type) ? type : (defaults.type ?? 'both'),
    audience:
      isDefined(audience) && isAudience(audience) ? audience : (defaults.audience ?? 'mine'),
    statuses: parsedStatus.length > 0 ? parsedStatus : (defaults.statuses ?? []),
    action: isDefined(action) && isActivityAction(action) ? action : (defaults.action ?? 'all'),
  };
};

export const buildActivitySearchParams = (next: ActivitySearchParamInput) => {
  const params = new URLSearchParams();

  params.set('audience', next.audience ?? 'mine');
  for (const status of next.statuses ?? []) {
    params.append('status', status);
  }
  params.set('type', next.type ?? 'both');
  params.set('action', next.action ?? 'all');

  return params;
};
