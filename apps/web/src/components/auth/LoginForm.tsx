import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '../../hooks/useSession';
import { asVoid } from '../../utils/asyncHandlers';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { InlineFeedback } from '../ui/InlineFeedback';
import { Input } from '../ui/Input';

export function LoginForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useSession();

  async function handleSubmit(e: React.ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch {
      setError(t('login.error'));
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
              {t('login.badge')}
            </p>
            <h1 className="mb-2 text-3xl font-bold text-white">{t('login.title')}</h1>
            <p className="text-zinc-400">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={asVoid(handleSubmit)} className="space-y-6">
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
              placeholder="••••••••"
            />

            {error && <InlineFeedback tone="error" message={error} />}

            <Button
              type="submit"
              disabled={isLoading}
              loading={isLoading}
              variant="primary"
              className="w-full"
            >
              {isLoading ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
