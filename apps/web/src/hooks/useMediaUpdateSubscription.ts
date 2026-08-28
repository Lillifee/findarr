import { useEffect } from 'react';

import { type MediaUpdateListener, useMediaUpdates } from '../contexts/MediaUpdateContext';

export function useMediaUpdateSubscription(listener: MediaUpdateListener): void {
  const mediaUpdates = useMediaUpdates();

  useEffect(() => mediaUpdates?.subscribe(listener), [listener, mediaUpdates]);
}
