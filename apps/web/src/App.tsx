import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { LoginForm } from './components/LoginForm';
import { Navigation } from './components/Navigation';
import { TmdbSetupScreen } from './components/TmdbSetupScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ActivityPage } from './pages/ActivityPage';
import { IntegrationsSettingsPage } from './pages/admin/IntegrationsSettingsPage';
import { SchedulersPage } from './pages/admin/SchedulersPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExplorePage } from './pages/ExplorePage';
import { MediaDetailPage } from './pages/MediaDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { VotePage } from './pages/VotePage';

function SetupRequiredScreen() {
  return <TmdbSetupScreen />;
}

function MainApp() {
  const {
    isAuthenticated,
    isAdmin,
    isLoading: authLoading,
    logout,
    user,
    tmdbConfigured,
  } = useAuth();

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-linear-to-br from-gray-900 via-gray-900 to-amber-900/20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-amber-500"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  if (!tmdbConfigured) {
    return <SetupRequiredScreen />;
  }

  // Render main layout with navigation and routes
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-900 to-amber-900/20">
      <Navigation
        onLogout={() => {
          logout().catch(console.error);
        }}
        user={user}
        isAdmin={isAdmin}
      />

      {/* Main Content - Adjust padding for sidebar on desktop, bottom bar on mobile */}
      <main className="mb-16 md:mb-0 md:ml-64">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/movie/:id" element={<MediaDetailPage />} />
          <Route path="/tv/:id" element={<MediaDetailPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {isAdmin && (
            <>
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/integrations" element={<IntegrationsSettingsPage />} />
              <Route path="/admin/schedulers" element={<SchedulersPage />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// Main App Component with Authentication and Router
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
