import type { VersionInfo } from '@findarr/shared/version';
import { create as createAxios } from 'axios';

import pkg from '../../../../package.json' with { type: 'json' };
import type { AppLogger } from '../utils/logger.js';

const GITHUB_RELEASES_URL = 'https://api.github.com/repos/lillifee/findarr/releases/latest';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface GitHubRelease {
  tag_name: string;
}

const axios = createAxios({
  timeout: 5000,
  headers: { Accept: 'application/vnd.github+json' },
});

const toVersionParts = (version: string): number[] =>
  version
    .replace(/^v/u, '')
    .split('.')
    .map((part) => Math.trunc(Number(part)) || 0);

// Compares dotted numeric versions (e.g. "1.4.10" vs "1.4.4"). Falls back to
// treating a fetch failure or unparsable version as "no update available".
function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = toVersionParts(latest);
  const currentParts = toVersionParts(current);
  const length = Math.max(latestParts.length, currentParts.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (latestParts[i] ?? 0) - (currentParts[i] ?? 0);
    if (diff !== 0) {
      return diff > 0;
    }
  }
  return false;
}

export function createVersionService(appLog: AppLogger) {
  const log = appLog.scope('version');
  const current = typeof pkg.version === 'string' ? pkg.version : '0.0.0';

  let cached: VersionInfo | null = null;
  let cachedAt = 0;

  async function fetchLatestRelease(): Promise<string | null> {
    try {
      const { data } = await axios.get<GitHubRelease>(GITHUB_RELEASES_URL);
      return data.tag_name;
    } catch (error) {
      log.warn({ err: error }, 'Failed to fetch latest GitHub release');
      return null;
    }
  }

  async function getVersionInfo(): Promise<VersionInfo> {
    if (cached && Date.now() - cachedAt < CACHE_TTL_MS) {
      return cached;
    }

    const latest = await fetchLatestRelease();
    cached = {
      current,
      latest,
      updateAvailable: latest !== null && isNewerVersion(latest, current),
    };
    cachedAt = Date.now();
    return cached;
  }

  return { getVersionInfo };
}

export type VersionService = ReturnType<typeof createVersionService>;
