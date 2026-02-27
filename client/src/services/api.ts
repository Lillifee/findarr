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
  RequestStatus,
  Media,
  Login,
  CreateUser,
  CreateMediaRequest,
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

// Admin request management service
export const adminRequestService = {
  listAllRequests: async (): Promise<Media[]> => {
    const response = await api.get('/admin/requests');
    return response.data;
  },

  updateRequestStatus: async (requestId: number, status: RequestStatus): Promise<void> => {
    await api.patch(`/admin/requests/${requestId}`, { status });
  },
};

// User request service
export const requestService = {
  createRequest: async (request: CreateMediaRequest): Promise<Media> => {
    const response = await api.post('/requests', request);
    return response.data;
  },

  getUserRequests: async (): Promise<Media[]> => {
    const response = await api.get('/requests');
    return response.data;
  },
};

// User interaction service (likes, dislikes)
export const interactionService = {
  dislikeMedia: async (tmdbId: number, mediaType: 'movie' | 'tv'): Promise<void> => {
    await api.post('/interactions/dislike', { tmdbId, mediaType });
  },

  undislikeMedia: async (tmdbId: number, mediaType: 'movie' | 'tv'): Promise<void> => {
    await api.delete(`/interactions/dislike/${tmdbId}/${mediaType}`);
  },

  likeMedia: async (tmdbId: number, mediaType: 'movie' | 'tv'): Promise<void> => {
    await api.post('/interactions/like', { tmdbId, mediaType });
  },

  unlikeMedia: async (tmdbId: number, mediaType: 'movie' | 'tv'): Promise<void> => {
    await api.delete(`/interactions/like/${tmdbId}/${mediaType}`);
  },

  getMyInteractions: async () => {
    const response = await api.get('/interactions/my');
    return response.data;
  },
};
