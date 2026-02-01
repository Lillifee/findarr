import {
  SearchQuery,
  SearchResponse,
  DiscoverQuery,
  DetailsQuery,
  VideosResponse,
  VideosQuery,
  GenresResponse,
  GenresQuery,
  DiscoverResponse,
  DetailsResponse,
} from '@findarr/shared';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Vite proxy will redirect to backend
});

export const searchService = {
  searchMedia: async (params: SearchQuery): Promise<SearchResponse> => {
    const response = await api.get('/search', { params });
    return response.data;
  },

  discoverMedia: async (params: DiscoverQuery = {}): Promise<DiscoverResponse> => {
    const response = await api.get('/discover', {
      params,
      paramsSerializer: {
        indexes: null, // Use a=1&a=2 instead of a[0]=1&a[1]=2 for arrays
      },
    });
    return response.data;
  },

  detailsMedia: async (params: DetailsQuery): Promise<DetailsResponse> => {
    const response = await api.get('/details', { params });
    return response.data;
  },

  getVideos: async (params: VideosQuery): Promise<VideosResponse> => {
    const response = await api.get(`/videos`, { params });
    return response.data;
  },

  getGenres: async (params: GenresQuery): Promise<GenresResponse> => {
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
