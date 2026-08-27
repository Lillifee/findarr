import type { Media } from '@findarr/shared/media';
import { createContext, useContext } from 'react';

export type MediaUpdateListener = (updatedMedia: Media) => void;

export interface MediaUpdateContextValue {
  publish: MediaUpdateListener;
  subscribe: (listener: MediaUpdateListener) => () => void;
}

export const MediaUpdateContext = createContext<MediaUpdateContextValue | null>(null);

export function useMediaUpdates() {
  return useContext(MediaUpdateContext);
}
