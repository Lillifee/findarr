import {
  SearchQuery,
  SearchResponse,
  MovieDetails,
  TVDetails,
  DiscoverQuery,
  DetailsQuery,
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

  discoverMedia: async (params: DiscoverQuery = {}): Promise<SearchResponse> => {
    const response = await api.get('/discover', { params });
    return response.data;
  },

  detailsMedia: async (params: DetailsQuery): Promise<MovieDetails | TVDetails> => {
    const response = await api.get('/details', { params });
    return response.data;
  },
};

export const healthService = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};
