import type { SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import type { ActivityAudience, ActivityStatus } from './activityFilters';

interface ActivitySearchParamDefaults {
  audience?: ActivityAudience;
  statuses?: ActivityStatus[];
  type?: SearchType;
}

interface ActivitySearchParamState {
  audience: ActivityAudience;
  statuses: ActivityStatus[];
  type: SearchType;
}

interface ActivitySearchParamInput {
  audience?: ActivityAudience;
  statuses?: ActivityStatus[];
  type?: SearchType;
}

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

export const readActivitySearchParams = (
  searchParams: URLSearchParams,
  defaults: ActivitySearchParamDefaults = {},
): ActivitySearchParamState => {
  const audience = searchParams.get('audience');
  const status = searchParams.getAll('status');
  const type = searchParams.get('type');

  const parsedStatus = status.filter((value) => isActivityStatus(value));

  return {
    type: isDefined(type) && isSearchType(type) ? type : (defaults.type ?? 'both'),
    audience:
      isDefined(audience) && isAudience(audience) ? audience : (defaults.audience ?? 'mine'),
    statuses: parsedStatus.length > 0 ? parsedStatus : (defaults.statuses ?? []),
  };
};

export const buildActivitySearchParams = (next: ActivitySearchParamInput) => {
  const params = new URLSearchParams();

  params.set('audience', next.audience ?? 'mine');
  for (const status of next.statuses ?? []) {
    params.append('status', status);
  }
  params.set('type', next.type ?? 'both');

  return params;
};
