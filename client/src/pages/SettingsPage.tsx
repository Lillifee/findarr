import type { RegionGroupId } from '@findarr/shared';
import { useEffect, useRef, useState } from 'react';
import { RegionSelector } from '../components/RegionSelector';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { SelectInput } from '../components/ui/SelectInput';
import { authService, userSettingsService } from '../services/api';
import { asVoid } from '../utils/asyncHandlers';

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
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const hasLoadedInitialValuesRef = useRef(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await userSettingsService.get();
        setLanguage(settings.language);
        setRegions(settings.regions);
      } catch (loadError) {
        console.error('Failed to load user settings:', loadError);
        setSettingsError('Failed to load settings.');
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

    setSettingsError(null);

    void userSettingsService
      .update({
        language,
        regions,
      })
      .catch(saveError => {
        console.error('Failed to save user settings:', saveError);
        setSettingsError('Failed to save settings.');
      });
  }, [language, loading, regions]);

  async function handlePasswordSubmit(e: React.ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation must match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated successfully.');
    } catch {
      setPasswordError('Failed to change password. Check your current password and try again.');
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:py-10">
      <div className="mb-8">
        <PageHeader
          title="Settings"
          description="Manage your default language and region preferences for new browse and vote sessions."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
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

                {settingsError && <p className="text-sm text-red-400">{settingsError}</p>}
              </>
            )}
          </div>
        </Card>

        <Card variant="solid" padding="none" className="overflow-hidden">
          <div className="border-b border-gray-800 px-5 py-4 md:px-6">
            <h2 className="text-lg font-semibold text-white">Password</h2>
            <p className="mt-1 text-sm text-gray-400">Update your sign-in password.</p>
          </div>

          <form
            onSubmit={asVoid(handlePasswordSubmit)}
            className="space-y-4 px-5 py-5 md:px-6 md:py-6"
          >
            <Input
              type="password"
              label="Current Password"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            <Input
              type="password"
              label="New Password"
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />

            <Input
              type="password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />

            {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-emerald-400">{passwordSuccess}</p>}

            <Button
              type="submit"
              className="w-full"
              loading={isChangingPassword}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              {isChangingPassword ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
