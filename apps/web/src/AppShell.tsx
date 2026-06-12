import { AppRoutes } from './AppRoutes';
import { appGradient } from './components/ui/theme';
import { useSession } from './hooks/useSession';
import { Navigation } from './Navigation';

export function AppShell() {
  const { isAdmin, logout, user } = useSession();

  return (
    <div className={`min-h-screen ${appGradient}`}>
      <Navigation
        onLogout={() => {
          logout().catch(console.error);
        }}
        user={user}
        isAdmin={isAdmin}
      />

      {/* Sidebar offset on desktop, bottom bar offset on mobile */}
      <main className="mb-16 md:mb-0 md:ml-64">
        <AppRoutes isAdmin={isAdmin} />
      </main>
    </div>
  );
}
