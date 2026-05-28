import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminTmdbService } from '../services/api';
import { asVoid } from '../utils/asyncHandlers';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

type FeedbackTone = 'error' | 'success';

function InlineFeedback({
  tone,
  message,
}: {
  tone: FeedbackTone;
  message: string;
}) {
  const toneClass =
    tone === 'error'
      ? 'border-red-800/60 text-red-300'
      : 'border-emerald-800/60 text-emerald-300';
  const dotClass = tone === 'error' ? 'bg-red-400' : 'bg-emerald-400';

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-dashed bg-gray-900/30 px-3 py-2 text-sm ${toneClass}`}
    >
      <span
        className={`h-2 w-2 flex-none rounded-full ${dotClass}`}
        aria-hidden="true"
      />
      <span>{message}</span>
    </div>
  );
}

export function TmdbSetupScreen() {
  const { refreshBootstrapStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [savedTokenSet, setSavedTokenSet] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const feedback = error
    ? { tone: 'error' as const, message: error }
    : success
      ? { tone: 'success' as const, message: success }
      : null;

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
    const savedSettings = await adminTmdbService.saveSettings({
      ...(tokenInput ? { tmdbAccessToken: tokenInput } : {}),
    });

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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-2xl">
        <Card
          variant="solid"
          padding="lg"
          className="overflow-hidden rounded-3xl border-gray-700/60 shadow-2xl"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="mb-5 inline-flex rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                Setup Required
              </p>
              <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">
                Connect TMDB
              </h1>
              <p className="max-w-xl text-sm leading-5 mt-2 text-gray-400">
                This product uses the TMDB API but is not endorsed or certified
                by TMDB.
              </p>
              <p className="max-w-xl text-sm leading-5 mt-2 text-gray-400">
                Finish the initial Findarr setup by adding a TMDB read access
                token. This enables search, discovery, and full media metadata
                throughout the app.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <div className="rounded-2xl border border-gray-700/50 bg-gray-900/30 px-5 py-5 text-left text-sm text-gray-400">
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
                <span className="rounded-lg border border-gray-600/60 bg-gray-800/70 px-3 py-1.5 font-semibold text-white">
                  Settings
                </span>
                <span className="text-gray-500">/</span>
                <span className="rounded-lg border border-gray-600/60 bg-gray-800/70 px-3 py-1.5 font-semibold text-white">
                  API
                </span>
                <span className="text-gray-500">/</span>
                <span className="rounded-lg border border-gray-600/60 bg-gray-800/70 px-3 py-1.5 font-semibold text-white">
                  API Read Access Token
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-300">
                Copy that value and paste it into the field below.
              </p>
            </div>
          </div>

          <form onSubmit={asVoid(handleSubmit)} className="space-y-6">
            <Input
              type="password"
              label="Access Token"
              value={tokenInput}
              onChange={e => {
                setError('');
                setSuccess('');
                setTokenInput(e.target.value);
              }}
              placeholder={
                savedTokenSet ? '••••••••••••••••' : 'Enter TMDB access token'
              }
              autoComplete="new-password"
              className="min-h-12"
            />

            {feedback && (
              <InlineFeedback tone={feedback.tone} message={feedback.message} />
            )}

            <Button
              type="submit"
              disabled={
                isLoading ||
                isSaving ||
                isTesting ||
                (!tokenInput && !savedTokenSet)
              }
              className="w-full min-h-12 text-sm"
            >
              {isSaving || isTesting ? 'Finishing…' : 'Finish'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
