import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '../../hooks/useSession';
import { asVoid } from '../../utils/asyncHandlers';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { InlineFeedback } from '../ui/InlineFeedback';
import { Input } from '../ui/Input';

export function OwnerSetupScreen() {
  const { t } = useTranslation();
  const { setupOwner } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('ownerSetup.passwordMismatch'));
      return;
    }

    setIsLoading(true);

    try {
      await setupOwner(email, password, displayName);
    } catch {
      setError(t('ownerSetup.error'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-zinc-950 via-neutral-950 to-stone-950 px-4">
      <div className="w-full max-w-md">
        <Card
          variant="solid"
          padding="lg"
          className="overflow-hidden rounded-3xl border-zinc-800 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
        >
          <div className="mb-8 text-center">
            <p className="mb-5 inline-flex rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-amber-300 uppercase">
              {t('ownerSetup.badge')}
            </p>
            <h1 className="mb-2 text-3xl font-bold text-white">{t('ownerSetup.title')}</h1>
            <p className="text-sm leading-5 text-zinc-400">{t('ownerSetup.description')}</p>
          </div>

          <form onSubmit={asVoid(handleSubmit)} className="space-y-6">
            <Input
              id="displayName"
              type="text"
              label={t('common.displayName')}
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
              }}
              required
              placeholder="Admin"
              autoComplete="name"
            />

            <Input
              id="email"
              type="email"
              label={t('common.email')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              required
              placeholder="mail@example.com"
              autoComplete="email"
            />

            <Input
              id="password"
              type="password"
              label={t('common.password')}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
              minLength={8}
              placeholder={t('ownerSetup.passwordPlaceholder')}
              autoComplete="new-password"
            />

            <Input
              id="confirmPassword"
              type="password"
              label={t('ownerSetup.confirmPasswordLabel')}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
              }}
              required
              minLength={8}
              placeholder={t('ownerSetup.confirmPasswordPlaceholder')}
              autoComplete="new-password"
            />

            {error && <InlineFeedback tone="error" message={error} />}

            <Button
              type="submit"
              disabled={isLoading}
              loading={isLoading}
              variant="primary"
              className="w-full"
            >
              {isLoading ? t('common.creating') : t('ownerSetup.submit')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
