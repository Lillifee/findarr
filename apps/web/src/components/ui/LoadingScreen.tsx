import { LoadingState } from './StateDisplay';
import { appGradient } from './theme';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className={`flex h-screen items-center justify-center ${appGradient}`}>
      <LoadingState title={message} />
    </div>
  );
}
