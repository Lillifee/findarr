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
  CreateMediaInteraction,
  ArrSettings,
  ArrQualityProfile,
  ArrRootFolder,
  ArrTestResult,
  JellyfinSettings,
  JellyfinTestResult,
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
  toggleInteraction: async (
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    action: 'liked' | 'disliked'
  ): Promise<Media> => {
    const response = await api.post('/interactions', { tmdbId, mediaType, action });
    return response.data;
  },

  // Get user's voted media (both likes and dislikes)
  listLiked: async (): Promise<Media[]> => {
    const response = await api.get('/interactions');
    return response.data;
  },

  // Legacy support - kept for backwards compatibility
  create: async (interaction: CreateMediaInteraction): Promise<Media> => {
    const response = await api.post('/interactions', interaction);
    return response.data;
  },

  list: async (): Promise<Media[]> => {
    const response = await api.get('/interactions');
    return response.data;
  },
};

function makeArrService(prefix: 'radarr' | 'sonarr') {
  return {
    getSettings: async (): Promise<ArrSettings> => {
      const response = await api.get(`/admin/${prefix}/settings`);
      return response.data;
    },
    saveSettings: async (settings: {
      url?: string;
      apiKey?: string;
      qualityProfileId?: number;
      rootFolderPath?: string;
    }): Promise<ArrSettings> => {
      const response = await api.put(`/admin/${prefix}/settings`, settings);
      return response.data;
    },
    getProfiles: async (): Promise<ArrQualityProfile[]> => {
      const response = await api.get(`/admin/${prefix}/quality-profiles`);
      return response.data;
    },
    getRootFolders: async (): Promise<ArrRootFolder[]> => {
      const response = await api.get(`/admin/${prefix}/root-folders`);
      return response.data;
    },
    test: async (): Promise<ArrTestResult> => {
      const response = await api.post(`/admin/${prefix}/test`);
      return response.data;
    },
  };
}

export const adminArrService = {
  radarr: makeArrService('radarr'),
  sonarr: makeArrService('sonarr'),
};

export const adminJellyfinService = {
  getSettings: async (): Promise<JellyfinSettings> => {
    const response = await api.get('/admin/jellyfin/settings');
    return response.data;
  },
  saveSettings: async (settings: { url?: string; apiKey?: string }): Promise<JellyfinSettings> => {
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
