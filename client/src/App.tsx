import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginForm } from './components/LoginForm';
import { Navigation } from './components/Navigation';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ArrSettingsPage } from './pages/admin/ArrSettingsPage';
import { RequestManagementPage } from './pages/admin/RequestManagementPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { MediaDetailPage } from './pages/MediaDetailPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { PopularPage } from './pages/PopularPage';

function MainApp() {
  const { isAuthenticated, isAdmin, isLoading: authLoading, logout, user } = useAuth();

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-linear-to-br from-gray-900 via-gray-900 to-amber-900/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
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
      <main className="md:ml-64 mb-16 md:mb-0">
        <Routes>
          <Route path="/" element={<PopularPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/movie/:id" element={<MediaDetailPage />} />
          <Route path="/tv/:id" element={<MediaDetailPage />} />
          <Route path="/requests" element={<MyRequestsPage />} />
          {isAdmin && (
            <>
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/requests" element={<RequestManagementPage />} />
              <Route path="/admin/arr" element={<ArrSettingsPage />} />
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
