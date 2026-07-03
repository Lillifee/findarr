import type { MediaType } from '@findarr/shared/media';
import type { LibSettings } from '@findarr/shared/settings';

// ============================================================================
// Shared type for items returned by any streaming library (Jellyfin / Plex)
// ============================================================================

export interface LibMedia {
  tmdbId: number;
  type: MediaType;
  libId: string;
  libUrl: string;
  libAddedAt?: number;
  availableSeasons?: number[];
}

// ============================================================================
// Full settings shape (includes the raw credential for internal use)
// ============================================================================

export interface LibSettingsFull extends LibSettings {
  apiKey: string | null;
}

// ============================================================================
// LibClient — the interface every library client must satisfy.
// ============================================================================

export interface LibClient {
  testConnection: () => Promise<boolean>;
  listLibraryItems: (baseUrl: string) => Promise<LibMedia[]>;
}
