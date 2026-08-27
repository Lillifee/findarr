import { type ComponentType, lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom';

import { LoadingScreen } from './components/ui/LoadingScreen';
import { appGradient } from './components/ui/theme';
import { MediaUpdateProvider } from './contexts/MediaUpdateProvider';

function lazyPage<M extends Record<string, ComponentType>, K extends keyof M>(
  loader: () => Promise<M>,
  name: K,
) {
  return lazy(async () => loader().then((m) => ({ default: m[name] })));
}

const DashboardPage = lazyPage(async () => import('./pages/DashboardPage'), 'DashboardPage');
const VotePage = lazyPage(async () => import('./pages/VotePage'), 'VotePage');
const ExplorePage = lazyPage(async () => import('./pages/ExplorePage'), 'ExplorePage');
const MediaDetailPage = lazyPage(async () => import('./pages/MediaDetailPage'), 'MediaDetailPage');
const ActivityPage = lazyPage(async () => import('./pages/ActivityPage'), 'ActivityPage');
const SettingsPage = lazyPage(async () => import('./pages/SettingsPage'), 'SettingsPage');
const UsersPage = lazyPage(async () => import('./pages/UserPage'), 'UsersPage');
const AdministrationPage = lazyPage(
  async () => import('./pages/AdministrationPage'),
  'AdministrationPage',
);
const SchedulersPage = lazyPage(async () => import('./pages/SchedulersPage'), 'SchedulersPage');
const LogsPage = lazyPage(async () => import('./pages/LogsPage'), 'LogsPage');

interface AppRoutesProps {
  isAdmin: boolean;
}

interface DrilldownLocationState {
  backgroundLocation?: Location;
}

export function AppRoutes({ isAdmin }: AppRoutesProps) {
  const location = useLocation();
  // React Router location state is application-defined and cannot be inferred.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const backgroundLocation = (location.state as DrilldownLocationState | null)?.backgroundLocation;
  const hasDrilldownBackground =
    backgroundLocation?.pathname === '/' ||
    backgroundLocation?.pathname === '/explore' ||
    backgroundLocation?.pathname === '/activity';

  return (
    <Suspense fallback={<LoadingScreen />}>
      <MediaUpdateProvider>
        <div
          className={
            hasDrilldownBackground ? 'fixed inset-0 overflow-hidden md:left-64' : 'contents'
          }
          {...(hasDrilldownBackground ? { 'aria-hidden': true, inert: true } : {})}
        >
          <Routes location={hasDrilldownBackground ? backgroundLocation : location}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/vote" element={<VotePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/movie/:id" element={<MediaDetailPage />} />
            <Route path="/tv/:id" element={<MediaDetailPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {isAdmin && (
              <>
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/administration" element={<AdministrationPage />} />
                <Route path="/admin/schedulers" element={<SchedulersPage />} />
                <Route path="/admin/logs" element={<LogsPage />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {hasDrilldownBackground && (
          <div
            role="dialog"
            aria-modal="true"
            className={`relative z-30 min-h-screen ${appGradient}`}
          >
            <Routes location={location}>
              <Route path="/movie/:id" element={<MediaDetailPage />} />
              <Route path="/tv/:id" element={<MediaDetailPage />} />
            </Routes>
          </div>
        )}
      </MediaUpdateProvider>
    </Suspense>
  );
}
