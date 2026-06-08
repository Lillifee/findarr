export type ConnectionStatus =
  | 'loading'
  | 'dirty'
  | 'not-configured'
  | 'ready'
  | 'connected'
  | 'disconnected';

interface DeriveStatusParams {
  isLoading: boolean;
  isDirty: boolean;
  hasSavedSettings: boolean;
  testResult: boolean | null;
}

export function deriveConnectionStatus({
  isLoading,
  isDirty,
  hasSavedSettings,
  testResult,
}: DeriveStatusParams): ConnectionStatus {
  if (isLoading) {
    return 'loading';
  }
  if (isDirty) {
    return 'dirty';
  }
  if (!hasSavedSettings) {
    return 'not-configured';
  }
  if (testResult === null) {
    return 'ready';
  }
  return testResult ? 'connected' : 'disconnected';
}
