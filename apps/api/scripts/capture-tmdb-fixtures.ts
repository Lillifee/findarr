/**
 * Script to capture real TMDB API responses and save them as fixtures for integration tests
 *
 * Usage:
 *   tsx server/scripts/capture-tmdb-fixtures.ts
 *
 * This should be run once to populate the fixtures directory with real API data.
 * Fixtures can be refreshed quarterly or when TMDB API changes are detected.
 */

// Sequential awaits with sleep() between requests are intentional rate limiting
// against the TMDB API; parallelizing would defeat the throttle.
// oxlint-disable eslint/no-await-in-loop

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { isDefined } from '@findarr/shared/utils';
import { create } from 'axios';
import * as dotenv from 'dotenv';

const sleep = async (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// Load environment variables from .env file
const currentDirName = import.meta.dirname;
dotenv.config({ path: path.join(currentDirName, '../.env') });

const { TMDB_ACCESS_TOKEN } = process.env;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Create axios client
const client = create({
  baseURL: TMDB_BASE_URL,
  headers: {
    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

if (!isDefined(TMDB_ACCESS_TOKEN)) {
  console.error('❌ TMDB_ACCESS_TOKEN environment variable is required');
  throw new Error('TMDB_ACCESS_TOKEN environment variable is required');
}

const fixturesDir = path.join(currentDirName, '../fixtures/tmdb');

// Ensure fixtures directory exists
mkdirSync(fixturesDir, { recursive: true });

/**
 * Save JSON data to a fixture file
 */
function saveFixture(filename: string, data: unknown): void {
  const filePath = path.join(fixturesDir, filename);
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
      // Fight Club (popular, high votes, keywords)
      550,
      // Forrest Gump (classic, high rating)
      13,
      // The Matrix (sci-fi, action, popular)
      603,
      // Inception (recent blockbuster)
      27_205,
      // Interstellar (sci-fi, high rating)
      157_336,
      // Avengers: Infinity War (superhero, highest grossing)
      299_536,
      // The Dark Knight (superhero, critically acclaimed)
      155,
      // The Lord of the Rings: Return of the King (fantasy, epic)
      122,
    ];

    for (const id of movieIds) {
      const details = await client.get(`/movie/${id}`, {
        params: { append_to_response: 'credits,keywords,external_ids' },
      });
      saveFixture(`movie-${id}.json`, details.data);
      // Rate limit: wait 250ms between requests
      await sleep(250);
    }

    // 6. TV show details with diverse characteristics
    console.log('📺 Fetching TV show details...');
    const tvIds = [
      // Breaking Bad (critically acclaimed)
      1396,
      // Game of Thrones (popular fantasy)
      1399,
      // The Witcher (fantasy, recent)
      46_952,
      // The Flash (superhero)
      60_735,
      // Arcane (animation, high rating)
      94_605,
      // The Office (comedy, long-running)
      2316,
      // Friends (classic sitcom)
      1668,
      // WandaVision (superhero, limited series)
      85_271,
    ];

    for (const id of tvIds) {
      const details = await client.get(`/tv/${id}`, {
        params: { append_to_response: 'credits,keywords,external_ids' },
      });
      saveFixture(`tv-${id}.json`, details.data);
      await sleep(250);
    }

    // 7. Search results (mixed quality/popularity)
    console.log('🔍 Fetching search results...');
    const searchBatman = await client.get('/search/movie', {
      params: { query: 'batman', page: 1 },
    });
    saveFixture('search-batman.json', searchBatman.data);

    await sleep(250);

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

    await sleep(250);
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });

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
    throw error;
  }
}

// Run the script
await captureFixtures();
