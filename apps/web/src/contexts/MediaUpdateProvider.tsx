import { type ReactNode, useCallback, useMemo, useRef } from 'react';

import {
  MediaUpdateContext,
  type MediaUpdateContextValue,
  type MediaUpdateListener,
} from './MediaUpdateContext';

export function MediaUpdateProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef(new Set<MediaUpdateListener>());

  const publish = useCallback<MediaUpdateListener>((updatedMedia) => {
    for (const listener of listenersRef.current) {
      listener(updatedMedia);
    }
  }, []);

  const subscribe = useCallback((listener: MediaUpdateListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo<MediaUpdateContextValue>(
    () => ({ publish, subscribe }),
    [publish, subscribe],
  );

  return <MediaUpdateContext.Provider value={value}>{children}</MediaUpdateContext.Provider>;
}
