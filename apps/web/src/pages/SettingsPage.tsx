import { useTranslation } from 'react-i18next';

import { ContentPreferencesForm } from '../components/settings/ContentPreferencesForm';
import { PasswordForm } from '../components/settings/PasswordForm';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { usePasswordForm } from '../hooks/usePasswordForm';
import { useUserSettings } from '../hooks/useUserSettings';

export function SettingsPage() {
  const { t } = useTranslation();
  const settings = useUserSettings();
  const passwordForm = usePasswordForm();

  return (
    <PageContainer>
      <div className="mb-8">
        <PageHeader title={t('settings.title')} description={t('settings.description')} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <SettingsPanel title={t('settings.contentPreferences')}>
          <ContentPreferencesForm settings={settings} />
        </SettingsPanel>

        <SettingsPanel
          title={t('settings.password')}
          description={t('settings.passwordDescription')}
        >
          <PasswordForm form={passwordForm} />
        </SettingsPanel>
      </div>
    </PageContainer>
  );
}
