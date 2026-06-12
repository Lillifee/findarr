import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface RestoreLocationState<T> {
  restoreState?: T;
}

type RouterHistoryState = Record<string, unknown> & {
  usr?: Record<string, unknown>;
};

export function useHistoryRestoreState<T>() {
  const location = useLocation();

  // react-router types location.state as `any` and T cannot be validated at
  // runtime, so accept the unchecked shape here.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const restoredState = (location.state as RestoreLocationState<T> | null)?.restoreState;

  const persistState = useCallback(
    (restoreState: T) => {
      // globalThis.history.state is typed `any` by the DOM lib.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const currentState = (globalThis.history.state ?? {}) as RouterHistoryState;

      globalThis.history.replaceState(
        {
          ...currentState,
          usr: {
            ...currentState.usr,
            restoreState,
          },
        },
        '',
        `${location.pathname}${location.search}`,
      );
    },
    [location.pathname, location.search],
  );

  return {
    restoredState,
    persistState,
  };
}
