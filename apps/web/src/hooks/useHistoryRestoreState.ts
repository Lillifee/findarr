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

  // react-router types location.state as `any` and T cannot be validated at
  // runtime, so accept the unchecked shape here.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const locationState = (location.state as LocationRestoreState<T> | null) ?? null;

  const persistState = useCallback(
    (restoreState: T) => {
      // globalThis.history.state is typed `any` by the DOM lib.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const historyState = (globalThis.history.state ?? {}) as HistoryStateWithUserData;

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
        `${location.pathname}${location.search}`,
      );
    },
    [location.pathname, location.search],
  );

  return {
    restoredState: locationState?.restoreState,
    persistState,
  };
}
