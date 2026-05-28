import type { InteractionsQuery, SearchType } from '@findarr/shared';

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

export const readActivitySearchParams = (
  searchParams: URLSearchParams,
  defaults: ActivitySearchParamDefaults = {}
): ActivitySearchParamState => ({
  action:
    (searchParams.get('action') as InteractionsQuery['action'] | null) ??
    defaults.action ??
    'liked',
  type:
    (searchParams.get('type') as SearchType | null) ?? defaults.type ?? 'both',
});

export const buildActivitySearchParams = (next: ActivitySearchParamInput) => {
  const params = new URLSearchParams();

  params.set('action', next.action ?? 'liked');
  params.set('type', next.type ?? 'both');

  return params;
};
