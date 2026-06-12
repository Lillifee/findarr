import { ContentPreferencesForm } from '../components/settings/ContentPreferencesForm';
import { PasswordForm } from '../components/settings/PasswordForm';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { usePasswordForm } from '../hooks/usePasswordForm';
import { useUserSettings } from '../hooks/useUserSettings';

export function SettingsPage() {
  const settings = useUserSettings();
  const passwordForm = usePasswordForm();

  return (
    <PageContainer>
      <div className="mb-8">
        <PageHeader
          title="Settings"
          description="Manage your default language and region preferences for new browse and vote sessions."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <SettingsPanel title="Content Preferences">
          <ContentPreferencesForm settings={settings} />
        </SettingsPanel>

        <SettingsPanel title="Password" description="Update your sign-in password.">
          <PasswordForm form={passwordForm} />
        </SettingsPanel>
      </div>
    </PageContainer>
  );
}
