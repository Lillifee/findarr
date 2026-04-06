import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load a JSON fixture file from the fixtures directory
 * @param relativePath - Path relative to server/fixtures/ (e.g., 'tmdb/movie-550.json')
 * @returns Parsed JSON object
 */
export function loadFixture<T = unknown>(relativePath: string): T {
  const fixturesRoot = join(__dirname, '../../../fixtures');
  const filePath = join(fixturesRoot, relativePath);

  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(
      `Failed to load fixture at ${relativePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Load all JSON fixtures from a directory
 * @param directoryPath - Path relative to server/fixtures/ (e.g., 'tmdb/movies')
 * @returns Array of parsed JSON objects
 */
export function loadAllFixtures<T = unknown>(directoryPath: string): T[] {
  const fixturesRoot = join(__dirname, '../../../fixtures');
  const fullPath = join(fixturesRoot, directoryPath);

  try {
    const files = readdirSync(fullPath);
    return files
      .filter((file: string) => file.endsWith('.json'))
      .map((file: string) => loadFixture<T>(join(directoryPath, file)));
  } catch (error) {
    throw new Error(
      `Failed to load fixtures from ${directoryPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
