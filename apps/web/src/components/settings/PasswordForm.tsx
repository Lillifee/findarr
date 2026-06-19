import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { PasswordChangeForm } from '../../hooks/usePasswordForm';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface PasswordFormProps {
  form: PasswordChangeForm;
}

export function PasswordForm({ form }: PasswordFormProps) {
  const { t } = useTranslation();
  const handleSubmit = (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    void form.submit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="password"
        label={t('passwordForm.currentPassword')}
        value={form.currentPassword}
        onChange={(event) => {
          form.setCurrentPassword(event.target.value);
        }}
        autoComplete="current-password"
        required
      />

      <Input
        type="password"
        label={t('passwordForm.newPassword')}
        value={form.newPassword}
        onChange={(event) => {
          form.setNewPassword(event.target.value);
        }}
        autoComplete="new-password"
        minLength={8}
        required
      />

      <Input
        type="password"
        label={t('passwordForm.confirmPassword')}
        value={form.confirmPassword}
        onChange={(event) => {
          form.setConfirmPassword(event.target.value);
        }}
        autoComplete="new-password"
        minLength={8}
        required
      />

      {form.error && <p className="text-sm text-red-400">{form.error}</p>}
      {form.success && <p className="text-sm text-emerald-400">{form.success}</p>}

      <Button
        type="submit"
        size="sm"
        className="w-full"
        loading={form.submitting}
        disabled={!form.canSubmit}
      >
        {form.submitting ? t('passwordForm.submitting') : t('passwordForm.submit')}
      </Button>
    </form>
  );
}
