import { Button } from '../ui/Button';

interface DetailBackButtonProps {
  onClick: () => void;
}

export function DetailBackButton({ onClick }: DetailBackButtonProps) {
  return (
    <div className="pointer-events-none fixed top-4 right-0 left-0 z-100 md:top-8 md:left-64">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <Button onClick={onClick} variant="secondary" className="pointer-events-auto">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Back</span>
        </Button>
      </div>
    </div>
  );
}
