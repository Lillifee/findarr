import axios from 'axios';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTMDBClient } from './client.js';

vi.mock('axios');

describe('TMDBClient', () => {
  const mockGet = vi.fn();

  beforeEach(() => {
    mockGet.mockReset();
    (axios.create as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: mockGet,
    });
  });

  it('search calls correct endpoint', async () => {
    mockGet.mockResolvedValue({
      data: { page: 1, results: [], total_pages: 1, total_results: 0 },
    });

    const client = createTMDBClient('token');
    await client.search('movie', { query: 'test' });

    expect(mockGet).toHaveBeenCalledWith('/search/movie', {
      params: { query: 'test' },
    });
  });

  it('discover calls correct endpoint', async () => {
    mockGet.mockResolvedValue({
      data: { page: 1, results: [], total_pages: 1, total_results: 0 },
    });

    const client = createTMDBClient('token');
    await client.discover('tv', { page: 2 });

    expect(mockGet).toHaveBeenCalledWith('/discover/tv', {
      params: { page: 2 },
    });
  });

  it('getTrending calls correct endpoint', async () => {
    mockGet.mockResolvedValue({
      data: { page: 1, results: [], total_pages: 1, total_results: 0 },
    });

    const client = createTMDBClient('token');
    await client.getTrending('movie', { time_window: 'day', page: 2 });

    expect(mockGet).toHaveBeenCalledWith('/trending/movie/day', {
      params: { page: 2, language: undefined },
    });
  });

  it('getGenres calls correct endpoint', async () => {
    mockGet.mockResolvedValue({ data: { genres: [] } });

    const client = createTMDBClient('token');
    await client.getGenres('movie');

    expect(mockGet).toHaveBeenCalledWith('/genre/movie/list', {
      params: undefined,
    });
  });

  it('getDetails parses tv details', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 2,
        name: 'Show',
        first_air_date: null,
        original_name: 'Show',
        overview: null,
        poster_path: null,
        backdrop_path: null,
        vote_average: 7,
        vote_count: 10,
        popularity: 5,
        original_language: 'en',
        origin_country: ['US'],
        genres: [],
        episode_run_time: [],
        number_of_episodes: 1,
        number_of_seasons: 1,
        status: 'Ended',
        type: 'Scripted',
      },
    });

    const client = createTMDBClient('token');
    const result = await client.getDetails('tv', { id: 2 });

    expect(result.type).toBe('tv');
  });

  it('getDetails parses movie details', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 3,
        title: 'Movie',
        release_date: null,
        original_title: 'Movie',
        overview: null,
        poster_path: null,
        backdrop_path: null,
        vote_average: 7,
        vote_count: 10,
        popularity: 5,
        original_language: 'en',
        origin_country: ['US'],
        genres: [],
        status: 'Released',
        budget: 123,
        revenue: 456,
      },
    });

    const client = createTMDBClient('token');
    const result = await client.getDetails('movie', { id: 3 });

    expect(result.type).toBe('movie');
  });
});
