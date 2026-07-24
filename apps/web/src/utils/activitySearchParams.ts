import type { SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import type { ActivityAudience, ActivityStatusGroup } from './activityFilters';

interface ActivitySearchParamDefaults {
  audience?: ActivityAudience;
  statusGroups?: ActivityStatusGroup[];
  type?: SearchType;
}

interface ActivitySearchParamState {
  audience: ActivityAudience;
  statusGroups: ActivityStatusGroup[];
  type: SearchType;
}

interface ActivitySearchParamInput {
  audience?: ActivityAudience;
  statusGroups?: ActivityStatusGroup[];
  type?: SearchType;
}

const isAudience = (value: string): value is ActivityAudience =>
  value === 'mine' || value === 'everyone';

const isStatusGroup = (value: string): value is ActivityStatusGroup =>
  value === 'voting' ||
  value === 'requested' ||
  value === 'available' ||
  value === 'downloading' ||
  value === 'warning';

const isSearchType = (value: string): value is SearchType =>
  value === 'movie' || value === 'tv' || value === 'both';

export const readActivitySearchParams = (
  searchParams: URLSearchParams,
  defaults: ActivitySearchParamDefaults = {},
): ActivitySearchParamState => {
  const audience = searchParams.get('audience');
  const statusGroups = searchParams.getAll('statusGroup');
  const type = searchParams.get('type');
  const parsedStatusGroups = statusGroups.filter((value): value is ActivityStatusGroup =>
    isStatusGroup(value),
  );

  return {
    audience:
      isDefined(audience) && isAudience(audience) ? audience : (defaults.audience ?? 'mine'),
    statusGroups:
      parsedStatusGroups.length > 0 ? parsedStatusGroups : (defaults.statusGroups ?? []),
    type: isDefined(type) && isSearchType(type) ? type : (defaults.type ?? 'both'),
  };
};

export const buildActivitySearchParams = (next: ActivitySearchParamInput) => {
  const params = new URLSearchParams();

  params.set('audience', next.audience ?? 'mine');
  for (const statusGroup of next.statusGroups ?? []) {
    params.append('statusGroup', statusGroup);
  }
  params.set('type', next.type ?? 'both');

  return params;
};
