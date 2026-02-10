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
} from '@findarr/shared';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Vite proxy will redirect to backend
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
