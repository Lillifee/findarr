import { isDefined } from '@findarr/shared/utils';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { UserSettingsForm } from '../../hooks/useUserSettings';
import { Button } from '../ui/Button';
import { SelectInput } from '../ui/SelectInput';
import { LoadingState } from '../ui/StateDisplay';
import { RangeSetting } from './RangeSetting';
import { RegionSelector } from './RegionSelector';

const CONTENT_LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'it-IT', label: 'Italian (Italy)' },
  { value: 'nl-NL', label: 'Dutch (Netherlands)' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
];

const UI_LANGUAGE_OPTIONS = [
  { value: 'en', labelKey: 'language.en' },
  { value: 'de', labelKey: 'language.de' },
] as const;

interface ContentPreferencesFormProps {
  settings: UserSettingsForm;
}

export function ContentPreferencesForm({ settings }: ContentPreferencesFormProps) {
  const { t } = useTranslation();

  if (settings.loading) {
    return <LoadingState spinnerSize="sm" />;
  }

  const handleSubmit = (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    void settings.save();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <SelectInput
          label={t('settings.uiLanguage')}
          value={settings.uiLanguage}
          onChange={(event) => {
            settings.setUiLanguage(event.target.value);
          }}
        >
          {UI_LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </SelectInput>
        <p className="text-xs text-zinc-500">{t('settings.uiLanguageDescription')}</p>
      </div>

      <div className="space-y-1.5">
        <SelectInput
          label={t('settings.contentLanguage')}
          value={settings.language}
          onChange={(event) => {
            settings.setLanguage(event.target.value);
          }}
        >
          {CONTENT_LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
        <p className="text-xs text-zinc-500">{t('settings.contentLanguageDescription')}</p>
      </div>

      <RegionSelector
        selectedRegions={settings.regions}
        onRegionsChange={settings.setRegions}
        disabled={false}
      />

      <RangeSetting
        id="swipe-limit"
        label={t('settings.votingRange')}
        value={settings.swipeLimit}
        min={60}
        max={240}
        step={20}
        onChange={settings.setSwipeLimit}
        description={t('settings.votingRangeDescription')}
        suffix={` ${t('settings.items')}`}
      />

      {isDefined(settings.error) && <p className="text-sm text-red-400">{settings.error}</p>}

      <div className="flex justify-end border-t border-zinc-800 pt-4">
        <Button type="submit" disabled={settings.saving || !settings.isDirty} size="sm">
          {settings.saving ? t('common.saving') : t('common.saveSettings')}
        </Button>
      </div>
    </form>
  );
}
