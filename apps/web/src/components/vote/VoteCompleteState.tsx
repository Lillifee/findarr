import { Button } from '../ui/Button';
import { CenteredState } from '../ui/CenteredState';

interface VoteCompleteStateProps {
  onExplore: () => void;
  onOpenSettings: () => void;
}

export function VoteCompleteState({ onExplore, onOpenSettings }: VoteCompleteStateProps) {
  return (
    <CenteredState>
      <div className="mb-4 text-6xl">🎉</div>
      <h2 className="mb-2 text-2xl font-bold text-white">All Done!</h2>
      <p className="mb-6 text-lg text-gray-400">
        You&apos;ve voted on every item in your current range. Increase your voting range in
        settings to vote on more.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onExplore}>Explore</Button>
        <Button variant="secondary" onClick={onOpenSettings}>
          Open settings
        </Button>
      </div>
    </CenteredState>
  );
}
