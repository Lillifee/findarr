import type { RegionGroupId } from '@findarr/shared/constants';
import type { UserSettings } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';
import { useEffect, useState } from 'react';

import { userSettingsService } from '../services/api';

export interface UserSettingsForm {
  language: string;
  regions: RegionGroupId[];
  swipeLimit: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDirty: boolean;
  setLanguage: (value: string) => void;
  setRegions: (value: RegionGroupId[]) => void;
  setSwipeLimit: (value: number) => void;
  save: () => Promise<void>;
}

export function useUserSettings(): UserSettingsForm {
  const [language, setLanguage] = useState('de-DE');
  const [regions, setRegions] = useState<RegionGroupId[]>(['western']);
  const [swipeLimit, setSwipeLimit] = useState(60);
  const [savedSettings, setSavedSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await userSettingsService.get();
        setLanguage(settings.language);
        setRegions(settings.regions);
        setSwipeLimit(settings.swipeLimit);
        setSavedSettings(settings);
      } catch (loadError) {
        console.error('Failed to load user settings:', loadError);
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const isDirty =
    isDefined(savedSettings) &&
    (language !== savedSettings.language ||
      swipeLimit !== savedSettings.swipeLimit ||
      JSON.stringify(regions) !== JSON.stringify(savedSettings.regions));

  const save = async () => {
    setError(null);
    setSaving(true);

    try {
      const updated = await userSettingsService.update({ language, regions, swipeLimit });
      setSavedSettings(updated);
    } catch (saveError) {
      console.error('Failed to save user settings:', saveError);
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return {
    language,
    regions,
    swipeLimit,
    loading,
    saving,
    error,
    isDirty,
    setLanguage,
    setRegions,
    setSwipeLimit,
    save,
  };
}
