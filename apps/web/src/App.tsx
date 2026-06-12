import { BrowserRouter } from 'react-router-dom';

import { AppShell } from './AppShell';
import { LoginForm } from './components/auth/LoginForm';
import { TmdbSetupScreen } from './components/auth/TmdbSetupScreen';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { SessionProvider } from './contexts/SessionProvider';
import { useSession } from './hooks/useSession';

function MainApp() {
  const { isAuthenticated, isLoading, isTmdbConfigured } = useSession();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  if (!isTmdbConfigured) {
    return <TmdbSetupScreen />;
  }

  return <AppShell />;
}

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </SessionProvider>
  );
}

export default App;
