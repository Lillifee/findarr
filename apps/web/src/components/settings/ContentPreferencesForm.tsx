import { isDefined } from '@findarr/shared/utils';
import type { ChangeEvent } from 'react';

import type { UserSettingsForm } from '../../hooks/useUserSettings';
import { Button } from '../ui/Button';
import { SelectInput } from '../ui/SelectInput';
import { RegionSelector } from './RegionSelector';

const LANGUAGE_OPTIONS = [
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'it-IT', label: 'Italian (Italy)' },
  { value: 'nl-NL', label: 'Dutch (Netherlands)' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
];

interface ContentPreferencesFormProps {
  settings: UserSettingsForm;
}

export function ContentPreferencesForm({ settings }: ContentPreferencesFormProps) {
  if (settings.loading) {
    return <div className="text-gray-400">Loading settings...</div>;
  }

  const handleSubmit = (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    void settings.save();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SelectInput
        label="Language"
        value={settings.language}
        onChange={(event) => {
          settings.setLanguage(event.target.value);
        }}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectInput>

      <RegionSelector
        selectedRegions={settings.regions}
        onRegionsChange={settings.setRegions}
        disabled={false}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="swipe-limit" className="text-sm font-medium text-gray-200">
            Voting range
          </label>
          <span className="text-sm font-semibold text-amber-500">{settings.swipeLimit} items</span>
        </div>
        <input
          id="swipe-limit"
          type="range"
          min={60}
          max={240}
          step={20}
          value={settings.swipeLimit}
          onChange={(event) => {
            settings.setSwipeLimit(Number(event.target.value));
          }}
          className="w-full accent-amber-500"
        />
        <p className="text-xs text-gray-500">
          How many of the top-ranked titles are available to vote on.
        </p>
      </div>

      {isDefined(settings.error) && <p className="text-sm text-red-400">{settings.error}</p>}

      <div className="flex justify-end border-t border-gray-800/80 pt-4">
        <Button type="submit" disabled={settings.saving || !settings.isDirty} size="sm">
          {settings.saving ? 'Saving\u2026' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
