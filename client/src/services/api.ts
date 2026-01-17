import { SearchParams, SearchResponse, MovieDetails, TVDetails } from '@findarr/shared';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Vite proxy will redirect to backend
});

export const searchService = {
  searchMovies: async (params: SearchParams): Promise<SearchResponse> => {
    const response = await api.get('/search/movie', { params });
    return response.data;
  },

  searchTV: async (params: SearchParams): Promise<SearchResponse> => {
    const response = await api.get('/search/tv', { params });
    return response.data;
  },

  getMovieDetails: async (id: number, language?: string): Promise<MovieDetails> => {
    const response = await api.get(`/movie/${id}`, {
      params: language ? { language } : undefined,
    });
    return response.data;
  },

  getTVDetails: async (id: number, language?: string): Promise<TVDetails> => {
    const response = await api.get(`/tv/${id}`, {
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
