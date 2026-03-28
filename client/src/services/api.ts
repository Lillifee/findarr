import type {
  SearchQuery,
  SearchResponse,
  DiscoverQuery,
  DiscoverResponse,
  PopularQuery,
  DetailsQuery,
  GenresQuery,
  Genre,
  MediaDetails,
  User,
  Media,
  Login,
  CreateUser,
  RadarrSettings,
  SonarrSettings,
  ArrQualityProfile,
  ArrRootFolder,
  ArrTestResult,
  JellyfinSettings,
  JellyfinTestResult,
  SchedulerState,
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

  popularMedia: async (params: PopularQuery): Promise<DiscoverResponse> => {
    const response = await api.get('/popular', { params });
    return response.data;
  },

  discoverMedia: async (params: DiscoverQuery = {}): Promise<DiscoverResponse> => {
    const response = await api.get('/discover', { params });
    return response.data;
  },

  detailsMedia: async (params: DetailsQuery): Promise<MediaDetails> => {
    const response = await api.get('/details', { params });
    return response.data;
  },

  getGenres: async (params: GenresQuery): Promise<{ genres: Genre[] }> => {
    const response = await api.get('/genres', { params });
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
  // Returns enriched media with updated state
  toggleInteraction: async (
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    action: 'liked' | 'disliked'
  ): Promise<Media | undefined> => {
    const response = await api.post('/interactions', { tmdbId, mediaType, action });
    return response.data;
  },

  // Get user's voted media (both likes and dislikes)
  listLiked: async (): Promise<Media[]> => {
    const response = await api.get('/interactions');
    return response.data;
  },

  // Get requested media (with optional status filter)
  getRequested: async (statuses?: string[]): Promise<Media[]> => {
    const params = statuses ? { status: statuses.join(',') } : {};
    const response = await api.get('/interactions/requested', { params });
    return response.data;
  },
};

export const adminArrService = {
  radarr: {
    getSettings: async (): Promise<RadarrSettings> => {
      const response = await api.get('/admin/radarr/settings');
      return response.data;
    },
    saveSettings: async (
      settings: Partial<RadarrSettings & { radarrApiKey?: string }>
    ): Promise<RadarrSettings> => {
      const response = await api.put('/admin/radarr/settings', settings);
      return response.data;
    },
    getProfiles: async (): Promise<ArrQualityProfile[]> => {
      const response = await api.get('/admin/radarr/quality-profiles');
      return response.data;
    },
    getRootFolders: async (): Promise<ArrRootFolder[]> => {
      const response = await api.get('/admin/radarr/root-folders');
      return response.data;
    },
    test: async (): Promise<ArrTestResult> => {
      const response = await api.post('/admin/radarr/test');
      return response.data;
    },
  },
  sonarr: {
    getSettings: async (): Promise<SonarrSettings> => {
      const response = await api.get('/admin/sonarr/settings');
      return response.data;
    },
    saveSettings: async (
      settings: Partial<SonarrSettings & { sonarrApiKey?: string }>
    ): Promise<SonarrSettings> => {
      const response = await api.put('/admin/sonarr/settings', settings);
      return response.data;
    },
    getProfiles: async (): Promise<ArrQualityProfile[]> => {
      const response = await api.get('/admin/sonarr/quality-profiles');
      return response.data;
    },
    getRootFolders: async (): Promise<ArrRootFolder[]> => {
      const response = await api.get('/admin/sonarr/root-folders');
      return response.data;
    },
    test: async (): Promise<ArrTestResult> => {
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
  test: async (): Promise<JellyfinTestResult> => {
    const response = await api.post('/admin/jellyfin/test');
    return response.data;
  },
};

// Admin interaction management service
export const adminInteractionService = {
  // Get all media with any interactions (pending, requested, or available)
  listAll: async (): Promise<Media[]> => {
    const response = await api.get('/admin/interactions');
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
  trigger: async (name: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/admin/schedulers/${name}/trigger`);
    return response.data;
  },
  // Start/enable a scheduler
  start: async (name: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/admin/schedulers/${name}/start`);
    return response.data;
  },
  // Stop/disable a scheduler
  stop: async (name: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/admin/schedulers/${name}/stop`);
    return response.data;
  },
};
