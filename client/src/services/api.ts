import { SearchParams, SearchResponse, MovieDetails, TVDetails, SearchType } from '@findarr/shared';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Vite proxy will redirect to backend
});

export const searchService = {
  searchMedia: async (params: SearchParams & { type?: SearchType }): Promise<SearchResponse> => {
    const response = await api.get('/search', { params });
    return response.data;
  },

  getDetails: async (
    id: number,
    type: 'movie' | 'tv',
    language?: string
  ): Promise<MovieDetails | TVDetails> => {
    const response = await api.get(`/${type}/${id}`, {
      params: language ? { language } : undefined,
    });
    return response.data;
  },
};

export const healthService = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};
