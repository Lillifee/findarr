import type { VersionInfo } from '@findarr/shared/version';
import { useEffect, useState } from 'react';

import { adminVersionService } from '../services/api';

/**
 * Polls the current app version against the latest GitHub release. Only
 * meaningful for admins (the endpoint is admin-only), so callers should gate
 * usage behind `isAdmin`.
 */
export function useVersionInfo(enabled: boolean) {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    if (!enabled) {
      return () => {
        // No-op cleanup when disabled.
      };
    }

    let cancelled = false;

    const load = async () => {
      try {
        const info = await adminVersionService.get();
        if (!cancelled) {
          setVersionInfo(info);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load version info:', error);
        }
      }
    };

    void load();
    // The backend caches the GitHub lookup for hours, so a slow client poll is fine.
    const timer = globalThis.setInterval(() => {
      void load();
    }, 3_600_000);

    return () => {
      cancelled = true;
      globalThis.clearInterval(timer);
    };
  }, [enabled]);

  return versionInfo;
}
