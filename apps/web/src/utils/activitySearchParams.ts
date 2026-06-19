import type { InteractionsQuery } from '@findarr/shared/interaction';
import type { SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

interface ActivitySearchParamDefaults {
  action?: InteractionsQuery['action'];
  type?: SearchType;
}

interface ActivitySearchParamState {
  action: InteractionsQuery['action'];
  type: SearchType;
}

interface ActivitySearchParamInput {
  action?: InteractionsQuery['action'];
  type?: SearchType;
}

const isAction = (value: string): value is NonNullable<InteractionsQuery['action']> =>
  value === 'all' || value === 'liked' || value === 'disliked';

const isSearchType = (value: string): value is SearchType =>
  value === 'movie' || value === 'tv' || value === 'both';

export const readActivitySearchParams = (
  searchParams: URLSearchParams,
  defaults: ActivitySearchParamDefaults = {},
): ActivitySearchParamState => {
  const action = searchParams.get('action');
  const type = searchParams.get('type');

  return {
    action: isDefined(action) && isAction(action) ? action : (defaults.action ?? 'liked'),
    type: isDefined(type) && isSearchType(type) ? type : (defaults.type ?? 'both'),
  };
};

export const buildActivitySearchParams = (next: ActivitySearchParamInput) => {
  const params = new URLSearchParams();

  params.set('action', next.action ?? 'liked');
  params.set('type', next.type ?? 'both');

  return params;
};
