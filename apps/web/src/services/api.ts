import type {
  Login,
  ChangePassword,
  CreateUser,
  AppBootstrapStatus,
  SetupOwner,
  User,
} from '@findarr/shared/auth';
import type { SearchQuery, PopularQuery, DetailsQuery, GenresQuery } from '@findarr/shared/catalog';
import type { AvailableMediaQuery, InteractionsQuery } from '@findarr/shared/interaction';
import type { LogLevel, LogLevelResponse, LogsResponse } from '@findarr/shared/logs';
import type {
  AvailableMediaResponse,
  SearchResponse,
  UserInteractionsResponse,
  PopularResponse,
  Genre,
  MediaDetails,
  SwipeNextResponse,
  MediaType,
} from '@findarr/shared/media';
import type { SchedulerInfo } from '@findarr/shared/scheduler';
import type {
  ArrSettings,
  ArrQualityProfile,
  ArrRootFolder,
  LibSettings,
  TmdbSettings,
  UserSettings,
  UserSettingsQuery,
} from '@findarr/shared/settings';
import type { VersionInfo } from '@findarr/shared/version';
import { create } from 'axios';

export const api = create({
  baseURL: '/api',
  withCredentials: true,
  paramsSerializer: {
    // Use ?region_groups=western&region_groups=asian instead of region_groups[0]=western
    indexes: null,
  },
});

export const searchService = {
  searchMedia: async (params: SearchQuery): Promise<SearchResponse> => {
    const response = await api.get<SearchResponse>('/search', { params });
    return response.data;
  },

  getPopularMedia: async (params: PopularQuery): Promise<PopularResponse> => {
    const response = await api.get<PopularResponse>('/popular', { params });
    return response.data;
  },

  getMediaDetails: async (params: DetailsQuery): Promise<MediaDetails> => {
    const response = await api.get<MediaDetails>('/details', { params });
    return response.data;
  },

  listGenres: async (params: GenresQuery): Promise<Genre[]> => {
    const response = await api.get<Genre[]>('/genres', { params });
    return response.data;
  },

  getNextUnvotedMedia: async (params: PopularQuery = {}): Promise<SwipeNextResponse> => {
    const response = await api.get<SwipeNextResponse>('/next', { params });
    return response.data;
  },

  getAvailableMedia: async (params: AvailableMediaQuery = {}): Promise<AvailableMediaResponse> => {
    const response = await api.get<AvailableMediaResponse>('/available', { params });
    return response.data;
  },
};

export const healthService = {
  check: async (): Promise<boolean> => {
    const response = await api.get<boolean>('/health');
    return response.data;
  },
};

// Authentication service
export const authService = {
  login: async (credentials: Login): Promise<User> => {
    const response = await api.post<User>('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  me: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  bootstrap: async (): Promise<AppBootstrapStatus> => {
    const response = await api.get<AppBootstrapStatus>('/auth/bootstrap');
    return response.data;
  },

  changePassword: async (payload: ChangePassword): Promise<void> => {
    await api.put('/auth/password', payload);
  },

  setupOwner: async (payload: SetupOwner): Promise<User> => {
    const response = await api.post<User>('/auth/setup-owner', payload);
    return response.data;
  },
};

// Admin user management service
export const adminUserService = {
  listUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/admin/users');
    return response.data;
  },

  createUser: async (userData: CreateUser): Promise<User> => {
    const response = await api.post<User>('/admin/users', userData);
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
    seasons?: number[],
  ): Promise<MediaDetails> => {
    const response = await api.post<MediaDetails>('/interactions', {
      tmdbId,
      mediaType,
      action,
      seasons,
    });
    return response.data;
  },

  listActivity: async (
    params: Partial<InteractionsQuery> = {},
  ): Promise<UserInteractionsResponse> => {
    const response = await api.get<UserInteractionsResponse>('/interactions', { params });
    return response.data;
  },
};

export const userSettingsService = {
  get: async (): Promise<UserSettings> => {
    const response = await api.get<UserSettings>('/settings');
    return response.data;
  },

  update: async (updates: UserSettingsQuery): Promise<UserSettings> => {
    const response = await api.put<UserSettings>('/settings', updates);
    return response.data;
  },
};

export function createArrServiceApi(service: 'radarr' | 'sonarr') {
  return {
    getSettings: async (): Promise<ArrSettings> => {
      const response = await api.get<ArrSettings>(`/admin/${service}/settings`);
      return response.data;
    },
    saveSettings: async (
      settings: Partial<ArrSettings & { apiKey?: string }>,
    ): Promise<ArrSettings> => {
      const response = await api.put<ArrSettings>(`/admin/${service}/settings`, settings);
      return response.data;
    },
    listQualityProfiles: async (): Promise<ArrQualityProfile[]> => {
      const response = await api.get<ArrQualityProfile[]>(`/admin/${service}/quality-profiles`);
      return response.data;
    },
    listRootFolders: async (): Promise<ArrRootFolder[]> => {
      const response = await api.get<ArrRootFolder[]>(`/admin/${service}/root-folders`);
      return response.data;
    },
    test: async (): Promise<boolean> => {
      const response = await api.post<boolean>(`/admin/${service}/test`);
      return response.data;
    },
  };
}

export function createLibServiceApi(service: 'jellyfin' | 'plex') {
  return {
    getSettings: async (): Promise<LibSettings> => {
      const response = await api.get<LibSettings>(`/admin/${service}/settings`);
      return response.data;
    },
    saveSettings: async (settings: {
      url?: string;
      apiKey?: string;
      enabled?: boolean;
    }): Promise<LibSettings> => {
      const response = await api.put<LibSettings>(`/admin/${service}/settings`, settings);
      return response.data;
    },
    test: async (): Promise<boolean> => {
      const response = await api.post<boolean>(`/admin/${service}/test`);
      return response.data;
    },
  };
}

export const adminTmdbService = {
  getSettings: async (): Promise<TmdbSettings> => {
    const response = await api.get<TmdbSettings>('/admin/tmdb/settings');
    return response.data;
  },
  saveSettings: async (settings: { tmdbAccessToken?: string }): Promise<TmdbSettings> => {
    const response = await api.put<TmdbSettings>('/admin/tmdb/settings', settings);
    return response.data;
  },
  test: async (): Promise<boolean> => {
    const response = await api.post<boolean>('/admin/tmdb/test');
    return response.data;
  },
};

// Scheduler service
export const schedulerService = {
  // Get all scheduler states
  listAll: async (): Promise<SchedulerInfo[]> => {
    const response = await api.get<SchedulerInfo[]>('/schedulers');
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

// Admin logs service
export const adminLogsService = {
  // Get recent application logs
  getLogs: async (): Promise<LogsResponse> => {
    const response = await api.get<LogsResponse>('/admin/logs');
    return response.data;
  },
  // Get the current runtime log level
  getLevel: async (): Promise<LogLevel> => {
    const response = await api.get<LogLevelResponse>('/admin/logs/level');
    return response.data.level;
  },
  // Set the runtime log level (not persisted across restarts)
  setLevel: async (level: LogLevel): Promise<LogLevel> => {
    const response = await api.put<LogLevelResponse>('/admin/logs/level', { level });
    return response.data.level;
  },
};

// Admin version service
export const adminVersionService = {
  // Current app version vs. the latest GitHub release
  get: async (): Promise<VersionInfo> => {
    const response = await api.get<VersionInfo>('/admin/version');
    return response.data;
  },
};
