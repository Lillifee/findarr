import type { RegionGroupId } from '@findarr/shared/constants';
import { DEFAULT_USER_SETTINGS, type UserSettings } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';
import { useEffect, useState } from 'react';

import i18n from '../i18n.ts';
import { userSettingsService } from '../services/api';

export interface UserSettingsForm {
  language: string;
  uiLanguage: string;
  regions: RegionGroupId[];
  swipeLimit: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDirty: boolean;
  setLanguage: (value: string) => void;
  setUiLanguage: (value: string) => void;
  setRegions: (value: RegionGroupId[]) => void;
  setSwipeLimit: (value: number) => void;
  save: () => Promise<void>;
}

interface UserSettingsStatus {
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialStatus: UserSettingsStatus = {
  loading: true,
  saving: false,
  error: null,
};

const areRegionsEqual = (left: RegionGroupId[], right: RegionGroupId[]) =>
  left.length === right.length && left.every((region, index) => region === right[index]);

export function useUserSettings(): UserSettingsForm {
  const [draft, setDraft] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<UserSettings | null>(null);
  const [status, setStatus] = useState<UserSettingsStatus>(initialStatus);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await userSettingsService.get();
        setDraft(settings);
        setSavedSettings(settings);
      } catch (loadError) {
        console.error('Failed to load user settings:', loadError);
        setStatus((prev) => ({ ...prev, error: 'Failed to load settings.' }));
      } finally {
        setStatus((prev) => ({ ...prev, loading: false }));
      }
    };

    void loadSettings();
  }, []);

  const isDirty =
    isDefined(savedSettings) &&
    (draft.language !== savedSettings.language ||
      draft.uiLanguage !== savedSettings.uiLanguage ||
      draft.swipeLimit !== savedSettings.swipeLimit ||
      !areRegionsEqual(draft.regions, savedSettings.regions));

  const save = async () => {
    setStatus((prev) => ({ ...prev, saving: true, error: null }));

    try {
      const updated = await userSettingsService.update(draft);
      setDraft(updated);
      setSavedSettings(updated);
      void i18n.changeLanguage(updated.uiLanguage);
    } catch (saveError) {
      console.error('Failed to save user settings:', saveError);
      setStatus((prev) => ({ ...prev, error: 'Failed to save settings.' }));
    } finally {
      setStatus((prev) => ({ ...prev, saving: false }));
    }
  };

  return {
    ...draft,
    ...status,
    isDirty,
    setLanguage: (language) => {
      setDraft((prev) => ({ ...prev, language }));
    },
    setUiLanguage: (uiLanguage) => {
      setDraft((prev) => ({ ...prev, uiLanguage }));
    },
    setRegions: (regions) => {
      setDraft((prev) => ({ ...prev, regions }));
    },
    setSwipeLimit: (swipeLimit) => {
      setDraft((prev) => ({ ...prev, swipeLimit }));
    },
    save,
  };
}
