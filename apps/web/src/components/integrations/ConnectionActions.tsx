import { Button } from '../ui/Button';
import type { Feedback } from '../ui/feedback';
import { InlineFeedback } from '../ui/InlineFeedback';

interface ConnectionActionsProps {
  isSaving: boolean;
  isDirty: boolean;
  canTest: boolean;
  isTesting: boolean;
  hasTestResult: boolean;
  feedback: Feedback | null;
  onTest: () => void;
}

export function ConnectionActions({
  isSaving,
  isDirty,
  canTest,
  isTesting,
  hasTestResult,
  feedback,
  onTest,
}: ConnectionActionsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving || !isDirty} size="sm">
          {isSaving ? 'Saving\u2026' : 'Save Settings'}
        </Button>
        {canTest && (
          <Button type="button" onClick={onTest} disabled={isTesting} variant="secondary" size="sm">
            {isTesting ? 'Testing\u2026' : hasTestResult ? 'Synchronize' : 'Test & Synchronize'}
          </Button>
        )}
      </div>

      <div className="sm:min-h-10 sm:flex-1">
        {feedback && <InlineFeedback tone={feedback.tone} message={feedback.message} />}
      </div>
    </div>
  );
}
