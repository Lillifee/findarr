import type { GenreKey, RegionGroupId } from '@findarr/shared';
import { useEffect, useRef, useState } from 'react';
import { userSettingsService } from '../services/api.js';

interface UseUserSettingsOptions {
  language: string;
  regionGroups: RegionGroupId[];
  withGenres: GenreKey[];
}

interface UseUserSettingsConfig {
  enabled?: boolean;
}

export function useUserSettings(
  settings: UseUserSettingsOptions,
  config: UseUserSettingsConfig = {}
) {
  const { enabled = true } = config;
  const serializedSettings = JSON.stringify(settings);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSerializedSettingsRef = useRef<string | null>(null);
  const [settingsVersion, setSettingsVersion] = useState(0);

  useEffect(() => {
    if (!enabled) {
      previousSerializedSettingsRef.current = serializedSettings;
      return;
    }

    const hasChanged = serializedSettings !== previousSerializedSettingsRef.current;
    if (!hasChanged) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    previousSerializedSettingsRef.current = serializedSettings;
    const nextSettings = JSON.parse(serializedSettings) as UseUserSettingsOptions;

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await userSettingsService.update({
          language: nextSettings.language,
          regionGroups: nextSettings.regionGroups,
          withGenres: nextSettings.withGenres,
        });
        setSettingsVersion(currentVersion => currentVersion + 1);
      } catch (error) {
        console.error('Failed to save user settings:', error);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, serializedSettings]);

  return { settingsVersion };
}
