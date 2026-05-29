/**
 * Script to capture real TMDB API responses and save them as fixtures for integration tests
 *
 * Usage:
 *   tsx server/scripts/capture-tmdb-fixtures.ts
 *
 * This should be run once to populate the fixtures directory with real API data.
 * Fixtures can be refreshed quarterly or when TMDB API changes are detected.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirName = dirname(currentFilePath);
dotenv.config({ path: join(currentDirName, '../.env') });

const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Create axios client
const client = axios.create({
  baseURL: TMDB_BASE_URL,
  headers: {
    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

if (!TMDB_ACCESS_TOKEN) {
  console.error('❌ TMDB_ACCESS_TOKEN environment variable is required');
  process.exit(1);
}

const fixturesDir = join(currentDirName, '../fixtures/tmdb');

// Ensure fixtures directory exists
mkdirSync(fixturesDir, { recursive: true });

/**
 * Save JSON data to a fixture file
 */
function saveFixture(filename: string, data: unknown): void {
  const filePath = join(fixturesDir, filename);
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Saved ${filename}`);
}

/**
 * Capture all TMDB fixtures
 */
async function captureFixtures(): Promise<void> {
  console.log('🎬 Capturing TMDB API responses as fixtures...\n');

  try {
    // 1. Popular movies (diverse popularity/vote ranges)
    console.log('📺 Fetching popular movies...');
    const popularMovies = await client.get('/discover/movie', {
      params: {
        sort_by: 'popularity.desc',
        page: 1,
        'vote_count.gte': 100,
      },
    });
    saveFixture('popular-movies.json', popularMovies.data);

    // 2. Popular TV shows
    console.log('📺 Fetching popular TV shows...');
    const popularTV = await client.get('/discover/tv', {
      params: {
        sort_by: 'popularity.desc',
        page: 1,
        'vote_count.gte': 100,
      },
    });
    saveFixture('popular-tv.json', popularTV.data);

    // 3. Trending daily
    console.log('🔥 Fetching trending (daily)...');
    const trendingDaily = await client.get('/trending/movie/day', { params: { page: 1 } });
    saveFixture('trending-daily.json', trendingDaily.data);

    // 4. Trending weekly
    console.log('🔥 Fetching trending (weekly)...');
    const trendingWeekly = await client.get('/trending/movie/week', { params: { page: 1 } });
    saveFixture('trending-weekly.json', trendingWeekly.data);

    // 5. Movie details with diverse characteristics
    console.log('🎬 Fetching movie details...');
    const movieIds = [
      550, // Fight Club (popular, high votes, keywords)
      13, // Forrest Gump (classic, high rating)
      603, // The Matrix (sci-fi, action, popular)
      27_205, // Inception (recent blockbuster)
      157_336, // Interstellar (sci-fi, high rating)
      299_536, // Avengers: Infinity War (superhero, highest grossing)
      155, // The Dark Knight (superhero, critically acclaimed)
      122, // The Lord of the Rings: Return of the King (fantasy, epic)
    ];

    for (const id of movieIds) {
      const details = await client.get(`/movie/${id}`, {
        params: { append_to_response: 'credits,keywords,external_ids' },
      });
      saveFixture(`movie-${id}.json`, details.data);
      // Rate limit: wait 250ms between requests
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    // 6. TV show details with diverse characteristics
    console.log('📺 Fetching TV show details...');
    const tvIds = [
      1396, // Breaking Bad (critically acclaimed)
      1399, // Game of Thrones (popular fantasy)
      46_952, // The Witcher (fantasy, recent)
      60_735, // The Flash (superhero)
      94_605, // Arcane (animation, high rating)
      2316, // The Office (comedy, long-running)
      1668, // Friends (classic sitcom)
      85_271, // WandaVision (superhero, limited series)
    ];

    for (const id of tvIds) {
      const details = await client.get(`/tv/${id}`, {
        params: { append_to_response: 'credits,keywords,external_ids' },
      });
      saveFixture(`tv-${id}.json`, details.data);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    // 7. Search results (mixed quality/popularity)
    console.log('🔍 Fetching search results...');
    const searchBatman = await client.get('/search/movie', {
      params: { query: 'batman', page: 1 },
    });
    saveFixture('search-batman.json', searchBatman.data);

    await new Promise((resolve) => setTimeout(resolve, 250));

    const searchOffice = await client.get('/search/tv', { params: { query: 'office', page: 1 } });
    saveFixture('search-office.json', searchOffice.data);

    // 8. Edge cases
    console.log('🎯 Fetching edge cases...');

    // Low vote count movie
    const lowVotes = await client.get('/discover/movie', {
      params: {
        sort_by: 'popularity.desc',
        'vote_count.lte': 50,
        'vote_count.gte': 10,
        page: 1,
      },
    });
    saveFixture('edge-case-low-votes.json', lowVotes.data);

    await new Promise((resolve) => setTimeout(resolve, 250));

    // Obscure but highly rated
    const obscureHighRated = await client.get('/discover/movie', {
      params: {
        sort_by: 'vote_average.desc',
        'vote_count.gte': 10,
        'vote_count.lte': 100,
        page: 1,
      },
    });
    saveFixture('edge-case-obscure-high-rated.json', obscureHighRated.data);

    console.log('\n✨ All fixtures captured successfully!');
    console.log(`📁 Fixtures saved to: ${fixturesDir}`);
  } catch (error) {
    console.error('\n❌ Error capturing fixtures:', error);
    process.exit(1);
  }
}

// Run the script
captureFixtures();
