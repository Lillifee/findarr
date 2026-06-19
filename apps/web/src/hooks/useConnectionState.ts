import { useCallback, useEffect, useRef, useState } from 'react';

import { deriveFeedback } from '../components/ui/feedback';

export function useConnectionState(load: () => Promise<void>) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Keep load stable via ref so init doesn't re-fire on every render
  const loadRef = useRef(load);
  loadRef.current = load;

  const clearFeedback = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  const init = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadRef.current();
    } catch {
      // ignore — component-level load failures are non-fatal
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  async function wrapTest(fn: () => Promise<void>) {
    clearFeedback();
    setIsTesting(true);
    try {
      await fn();
    } finally {
      setIsTesting(false);
    }
  }

  async function wrapSave(fn: () => Promise<void>) {
    clearFeedback();
    setIsSaving(true);
    try {
      await fn();
    } finally {
      setIsSaving(false);
    }
  }

  const feedback = deriveFeedback(error, success);

  return {
    isLoading,
    isSaving,
    isTesting,
    testResult,
    setTestResult,
    setError,
    setSuccess,
    clearFeedback,
    feedback,
    wrapTest,
    wrapSave,
  };
}
