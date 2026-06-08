import { BrowserRouter } from 'react-router-dom';

import { AppShell } from './AppShell';
import { LoginForm } from './components/auth/LoginForm';
import { TmdbSetupScreen } from './components/auth/TmdbSetupScreen';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from './hooks/useAuth';

function MainApp() {
  const { isAuthenticated, isLoading, tmdbConfigured } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  if (!tmdbConfigured) {
    return <TmdbSetupScreen />;
  }

  return <AppShell />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
