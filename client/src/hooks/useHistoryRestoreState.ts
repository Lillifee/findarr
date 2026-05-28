import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface HistoryStateWithUserData {
  [key: string]: unknown;
  usr?: Record<string, unknown>;
}

interface LocationRestoreState<T> {
  restoreState?: T;
}

export function useHistoryRestoreState<T>() {
  const location = useLocation();
  const locationState =
    (location.state as LocationRestoreState<T> | null) ?? null;

  const persistState = useCallback(
    (restoreState: T) => {
      const historyState = (globalThis.history.state ??
        {}) as HistoryStateWithUserData;

      const nextHistoryState = {
        ...historyState,
        usr: {
          ...(historyState.usr ?? undefined),
          restoreState,
        },
      };

      globalThis.history.replaceState(
        nextHistoryState,
        '',
        `${location.pathname}${location.search}`
      );
    },
    [location.pathname, location.search]
  );

  return {
    restoredState: locationState?.restoreState,
    persistState,
  };
}
