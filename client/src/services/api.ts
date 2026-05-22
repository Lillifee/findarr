import type {
  AvailableMediaQuery,
  AvailableMediaResponse,
  InteractionsQuery,
  SearchQuery,
  SearchResponse,
  UserInteractionsResponse,
  PopularQuery,
  PopularResponse,
  DetailsQuery,
  GenresQuery,
  Genre,
  MediaDetails,
  User,
  Media,
  Login,
  ChangePassword,
  CreateUser,
  ArrSettings,
  ArrQualityProfile,
  ArrRootFolder,
  JellyfinSettings,
  AppBootstrapStatus,
  SetupInitialPassword,
  TmdbSettings,
  SchedulerState,
  SwipeNextResponse,
  ArrLinkQuery,
  JellyfinLinkQuery,
  UserSettings,
  UserSettingsQuery,
  MediaType,
} from '@findarr/shared';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Vite proxy will redirect to backend
  withCredentials: true, // Include session cookie
  paramsSerializer: {
    indexes: null, // Use ?region_groups=western&region_groups=asian instead of region_groups[0]=western
  },
});

export const searchService = {
  searchMedia: async (params: SearchQuery): Promise<SearchResponse> => {
    const response = await api.get('/search', { params });
    return response.data;
  },

  getPopularMedia: async (params: PopularQuery): Promise<PopularResponse> => {
    const response = await api.get('/popular', { params });
    return response.data;
  },

  getMediaDetails: async (params: DetailsQuery): Promise<MediaDetails> => {
    const response = await api.get('/details', { params });
    return response.data;
  },

  listGenres: async (params: GenresQuery): Promise<{ genres: Genre[] }> => {
    const response = await api.get('/genres', { params });
    return response.data;
  },

  getNextUnvotedMedia: async (params: PopularQuery = {}): Promise<SwipeNextResponse> => {
    const response = await api.get('/next', { params });
    return response.data;
  },

  getAvailableMedia: async (params: AvailableMediaQuery = {}): Promise<AvailableMediaResponse> => {
    const response = await api.get('/available', { params });
    return response.data;
  },
};

export const healthService = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

// Authentication service
export const authService = {
  login: async (credentials: Login): Promise<User> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  me: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  bootstrap: async (): Promise<AppBootstrapStatus> => {
    const response = await api.get('/auth/bootstrap');
    return response.data;
  },

  changePassword: async (payload: ChangePassword): Promise<void> => {
    await api.put('/auth/password', payload);
  },

  setupInitialPassword: async (payload: SetupInitialPassword): Promise<void> => {
    await api.put('/auth/password/setup', payload);
  },
};

// Admin user management service
export const adminUserService = {
  listUsers: async (): Promise<User[]> => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  createUser: async (userData: CreateUser): Promise<User> => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },

  deleteUser: async (userId: number): Promise<void> => {
    await api.delete(`/admin/users/${userId}`);
  },
};

// User interaction service
export const interactionService = {
  // Toggle like/dislike on media (automatically creates media record if needed)
  // For TV shows, seasons controls which seasons to request (omit for all seasons)
  // Returns enriched media with updated state
  toggleInteraction: async (
    tmdbId: number,
    mediaType: MediaType,
    action: 'liked' | 'disliked',
    seasons?: number[]
  ): Promise<Media | undefined> => {
    const response = await api.post('/interactions', {
      tmdbId,
      mediaType,
      action,
      seasons,
    });
    return response.data;
  },

  listActivity: async (
    params: Partial<InteractionsQuery> = {}
  ): Promise<UserInteractionsResponse> => {
    const response = await api.get('/interactions', { params });
    return response.data;
  },

  listAttention: async (
    params: Partial<InteractionsQuery> = {}
  ): Promise<UserInteractionsResponse> => {
    const response = await api.get('/interactions/attention', { params });
    return response.data;
  },
};

export const userSettingsService = {
  get: async (): Promise<UserSettings> => {
    const response = await api.get('/settings');
    return response.data;
  },

  update: async (updates: UserSettingsQuery): Promise<UserSettings> => {
    const response = await api.put('/settings', updates);
    return response.data;
  },
};

export const adminArrService = {
  radarr: {
    getSettings: async (): Promise<ArrSettings> => {
      const response = await api.get('/admin/radarr/settings');
      return response.data;
    },
    saveSettings: async (
      settings: Partial<ArrSettings & { apiKey?: string }>
    ): Promise<ArrSettings> => {
      const response = await api.put('/admin/radarr/settings', settings);
      return response.data;
    },
    listQualityProfiles: async (): Promise<ArrQualityProfile[]> => {
      const response = await api.get('/admin/radarr/quality-profiles');
      return response.data;
    },
    listRootFolders: async (): Promise<ArrRootFolder[]> => {
      const response = await api.get('/admin/radarr/root-folders');
      return response.data;
    },
    test: async (): Promise<boolean> => {
      const response = await api.post('/admin/radarr/test');
      return response.data;
    },
  },
  sonarr: {
    getSettings: async (): Promise<ArrSettings> => {
      const response = await api.get('/admin/sonarr/settings');
      return response.data;
    },
    saveSettings: async (
      settings: Partial<ArrSettings & { apiKey?: string }>
    ): Promise<ArrSettings> => {
      const response = await api.put('/admin/sonarr/settings', settings);
      return response.data;
    },
    listQualityProfiles: async (): Promise<ArrQualityProfile[]> => {
      const response = await api.get('/admin/sonarr/quality-profiles');
      return response.data;
    },
    listRootFolders: async (): Promise<ArrRootFolder[]> => {
      const response = await api.get('/admin/sonarr/root-folders');
      return response.data;
    },
    test: async (): Promise<boolean> => {
      const response = await api.post('/admin/sonarr/test');
      return response.data;
    },
  },
};

export const adminJellyfinService = {
  getSettings: async (): Promise<JellyfinSettings> => {
    const response = await api.get('/admin/jellyfin/settings');
    return response.data;
  },
  saveSettings: async (settings: {
    jellyfinUrl?: string;
    jellyfinApiKey?: string;
  }): Promise<JellyfinSettings> => {
    const response = await api.put('/admin/jellyfin/settings', settings);
    return response.data;
  },
  test: async (): Promise<boolean> => {
    const response = await api.post('/admin/jellyfin/test');
    return response.data;
  },
};

export const adminTmdbService = {
  getSettings: async (): Promise<TmdbSettings> => {
    const response = await api.get('/admin/tmdb/settings');
    return response.data;
  },
  saveSettings: async (settings: { tmdbAccessToken?: string }): Promise<TmdbSettings> => {
    const response = await api.put('/admin/tmdb/settings', settings);
    return response.data;
  },
  test: async (): Promise<boolean> => {
    const response = await api.post('/admin/tmdb/test');
    return response.data;
  },
};

// Scheduler service
export const schedulerService = {
  // Get all scheduler states
  listAll: async (): Promise<SchedulerState[]> => {
    const response = await api.get('/schedulers');
    return response.data;
  },
  // Get specific scheduler state
  get: async (name: string): Promise<SchedulerState> => {
    const response = await api.get(`/schedulers/${name}`);
    return response.data;
  },
};

// Admin scheduler management service
export const adminSchedulerService = {
  // Manually trigger a scheduler
  trigger: async (name: string): Promise<void> => {
    await api.post(`/admin/schedulers/${name}/trigger`);
  },
  // Start/enable a scheduler
  start: async (name: string): Promise<void> => {
    await api.post(`/admin/schedulers/${name}/start`);
  },
  // Stop/disable a scheduler
  stop: async (name: string): Promise<void> => {
    await api.post(`/admin/schedulers/${name}/stop`);
  },
};

// Link resolution service
// Provides URLs for media links in Radarr/Sonarr and Jellyfin
export const linkService = {
  /**
   * Get Radarr link for a movie
   * @param query - { mediaId: number }
   * @returns URL to Radarr movie page (browser will handle redirect)
   */
  radarr: (query: ArrLinkQuery): string => `/api/radarr-link?mediaId=${query.mediaId}`,

  /**
   * Get Sonarr link for a TV show
   * @param query - { mediaId: number }
   * @returns URL to Sonarr series page (browser will handle redirect)
   */
  sonarr: (query: ArrLinkQuery): string => `/api/sonarr-link?mediaId=${query.mediaId}`,

  /**
   * Get Jellyfin link for media
   * @param query - { mediaId: number }
   * @returns URL to Jellyfin item page (browser will handle redirect)
   */
  jellyfin: (query: JellyfinLinkQuery): string => `/api/jellyfin-link?mediaId=${query.mediaId}`,
};
