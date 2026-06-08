import { Spinner } from './Spinner';
import { appGradient } from './theme';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className={`flex h-screen items-center justify-center ${appGradient}`}>
      <div className="text-center">
        <Spinner className="mx-auto mb-4" />
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
}
