import { useCallback, useEffect, useState } from 'react';

import { useSession } from '../../hooks/useSession';
import { adminTmdbService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { deriveFeedback } from '../ui/feedback';
import { InlineFeedback } from '../ui/InlineFeedback';
import { Input } from '../ui/Input';

export function TmdbSetupScreen() {
  const { refreshBootstrapStatus } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [savedTokenSet, setSavedTokenSet] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const feedback = deriveFeedback(error, success);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await adminTmdbService.getSettings();
      setSavedTokenSet(settings.tmdbAccessTokenSet);
      setTokenInput('');
    } catch {
      setError('Failed to load TMDB settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function saveSettings() {
    const savedSettings = await adminTmdbService.saveSettings(
      tokenInput ? { tmdbAccessToken: tokenInput } : {},
    );

    setSavedTokenSet(savedSettings.tmdbAccessTokenSet);
    setTokenInput('');
  }

  async function runTest() {
    const result = await adminTmdbService.test();

    if (result) {
      setSuccess('Connection successful. Findarr is ready to continue.');
      await refreshBootstrapStatus();
      return;
    }

    setError('Could not reach TMDB. Check the access token and try again.');
  }

  async function handleSubmit(e: React.ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    setIsTesting(true);

    try {
      if (tokenInput) {
        await saveSettings();
      }
      await runTest();
    } catch {
      setError('Failed to save and test the TMDB access token');
    } finally {
      setIsSaving(false);
      setIsTesting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-zinc-950 via-neutral-950 to-stone-950 px-4">
      <div className="w-full max-w-2xl">
        <Card
          variant="solid"
          padding="lg"
          className="overflow-hidden rounded-3xl border-zinc-800 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="mb-5 inline-flex rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-amber-300 uppercase">
                Setup Required
              </p>
              <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">Connect TMDB</h1>
              <p className="mt-2 max-w-xl text-sm leading-5 text-zinc-400">
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </p>
              <p className="mt-2 max-w-xl text-sm leading-5 text-zinc-400">
                Finish the initial Findarr setup by adding a TMDB read access token. This enables
                search, discovery, and full media metadata throughout the app.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-5 py-5 text-left text-sm text-zinc-400">
              <p>
                Sign in or create an account at{' '}
                <a
                  href="https://www.themoviedb.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-amber-300 underline decoration-amber-400/50 underline-offset-3 hover:text-amber-200"
                >
                  themoviedb.org
                </a>
                , then open the following section in your account:
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-semibold text-white">
                  Settings
                </span>
                <span className="text-zinc-500">/</span>
                <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-semibold text-white">
                  API
                </span>
                <span className="text-zinc-500">/</span>
                <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-semibold text-white">
                  API Read Access Token
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                Copy that value and paste it into the field below.
              </p>
            </div>
          </div>

          <form onSubmit={asVoid(handleSubmit)} className="space-y-6">
            <Input
              type="password"
              label="Access Token"
              value={tokenInput}
              onChange={(e) => {
                setError('');
                setSuccess('');
                setTokenInput(e.target.value);
              }}
              placeholder={savedTokenSet ? '••••••••••••••••' : 'Enter TMDB access token'}
              autoComplete="new-password"
              className="min-h-12"
            />

            {feedback && <InlineFeedback tone={feedback.tone} message={feedback.message} />}

            <Button
              type="submit"
              disabled={isLoading || isSaving || isTesting || (!tokenInput && !savedTokenSet)}
              className="min-h-12 w-full text-sm"
            >
              {isSaving || isTesting ? 'Finishing…' : 'Finish'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
