import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { StateDisplay } from '../ui/StateDisplay';

interface VoteCompleteStateProps {
  onExplore: () => void;
  onOpenSettings: () => void;
}

export function VoteCompleteState({ onExplore, onOpenSettings }: VoteCompleteStateProps) {
  return (
    <StateDisplay
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
