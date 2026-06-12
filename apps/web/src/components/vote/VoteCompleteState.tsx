import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';

interface VoteCompleteStateProps {
  onExplore: () => void;
  onOpenSettings: () => void;
}

export function VoteCompleteState({ onExplore, onOpenSettings }: VoteCompleteStateProps) {
  return (
    <EmptyState
      className="py-24"
      icon={<Icon className="text-amber-300/80" name="check_circle" size="display" />}
      title="All done"
      message="You have voted on every item in your current range. Increase your voting range in settings to vote on more."
      action={
        <>
          <Button onClick={onExplore}>Explore</Button>
          <Button variant="secondary" onClick={onOpenSettings}>
            Open settings
          </Button>
        </>
      }
    />
  );
}
