import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = dirname(currentFilename);

/**
 * Load a JSON fixture file from the fixtures directory
 * @param relativePath - Path relative to server/fixtures/ (e.g., 'tmdb/movie-550.json')
 * @returns Parsed JSON object
 */
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters
export function loadFixture<T>(relativePath: string): T {
  const fixturesRoot = join(currentDirname, '../../../fixtures');
  const filePath = join(fixturesRoot, relativePath);

  try {
    const content = readFileSync(filePath, 'utf8');
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(
      `Failed to load fixture at ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

/**
 * Load all JSON fixtures from a directory
 * @param directoryPath - Path relative to server/fixtures/ (e.g., 'tmdb/movies')
 * @returns Array of parsed JSON objects
 */
export function loadAllFixtures<T>(directoryPath: string): T[] {
  const fixturesRoot = join(currentDirname, '../../../fixtures');
  const fullPath = join(fixturesRoot, directoryPath);

  try {
    const files = readdirSync(fullPath);
    return files
      .filter((file: string) => file.endsWith('.json'))
      .map((file: string) => loadFixture(join(directoryPath, file)));
  } catch (error) {
    throw new Error(
      `Failed to load fixtures from ${directoryPath}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}
