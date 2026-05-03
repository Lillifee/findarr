import type { RegionGroupId } from '@findarr/shared';
import { useEffect, useRef, useState } from 'react';
import { RegionSelector } from '../components/RegionSelector';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { SelectInput } from '../components/ui/SelectInput';
import { userSettingsService } from '../services/api';

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

export function SettingsPage() {
  const [language, setLanguage] = useState('de-DE');
  const [regions, setRegions] = useState<RegionGroupId[]>(['western']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedInitialValuesRef = useRef(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await userSettingsService.get();
        setLanguage(settings.language);
        setRegions(settings.regions);
      } catch (loadError) {
        console.error('Failed to load user settings:', loadError);
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!hasLoadedInitialValuesRef.current) {
      hasLoadedInitialValuesRef.current = true;
      return;
    }

    setError(null);

    void userSettingsService
      .update({
        language,
        regions,
      })
      .catch(saveError => {
        console.error('Failed to save user settings:', saveError);
        setError('Failed to save settings.');
      });
  }, [language, loading, regions]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <div className="mb-8">
        <PageHeader
          title="Settings"
          description="Manage your default language and region preferences for new browse and vote sessions."
        />
      </div>

      <Card variant="solid" padding="none" className="overflow-hidden">
        <div className="border-b border-gray-800 px-5 py-4 md:px-6">
          <h2 className="text-lg font-semibold text-white">Content Preferences</h2>
        </div>

        <div className="space-y-6 px-5 py-5 md:px-6 md:py-6">
          {loading ? (
            <div className="text-gray-400">Loading settings...</div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <SelectInput
                  label="Language"
                  value={language}
                  onChange={event => setLanguage(event.target.value)}
                >
                  {LANGUAGE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              </div>

              <RegionSelector
                selectedRegions={regions}
                onRegionsChange={setRegions}
                disabled={false}
              />

              {error && <p className="text-sm text-red-400">{error}</p>}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
