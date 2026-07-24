import type { SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import type { ActivityAudience, ActivityStatusGroup } from './activityFilters';

interface ActivitySearchParamDefaults {
  audience?: ActivityAudience;
  statusGroup?: ActivityStatusGroup;
  type?: SearchType;
}

interface ActivitySearchParamState {
  audience: ActivityAudience;
  statusGroup: ActivityStatusGroup;
  type: SearchType;
}

interface ActivitySearchParamInput {
  audience?: ActivityAudience;
  statusGroup?: ActivityStatusGroup;
  type?: SearchType;
}

const isAudience = (value: string): value is ActivityAudience =>
  value === 'mine' || value === 'everyone';

const isStatusGroup = (value: string): value is ActivityStatusGroup =>
  value === 'all' ||
  value === 'voting' ||
  value === 'requested' ||
  value === 'available' ||
  value === 'attention';

const isSearchType = (value: string): value is SearchType =>
  value === 'movie' || value === 'tv' || value === 'both';

export const readActivitySearchParams = (
  searchParams: URLSearchParams,
  defaults: ActivitySearchParamDefaults = {},
): ActivitySearchParamState => {
  const audience = searchParams.get('audience');
  const statusGroup = searchParams.get('statusGroup');
  const type = searchParams.get('type');

  return {
    audience:
      isDefined(audience) && isAudience(audience) ? audience : (defaults.audience ?? 'mine'),
    statusGroup:
      isDefined(statusGroup) && isStatusGroup(statusGroup)
        ? statusGroup
        : (defaults.statusGroup ?? 'all'),
    type: isDefined(type) && isSearchType(type) ? type : (defaults.type ?? 'both'),
  };
};

export const buildActivitySearchParams = (next: ActivitySearchParamInput) => {
  const params = new URLSearchParams();

  params.set('audience', next.audience ?? 'mine');
  params.set('statusGroup', next.statusGroup ?? 'all');
  params.set('type', next.type ?? 'both');

  return params;
};
