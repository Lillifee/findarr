import { type ComponentType, lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { LoadingScreen } from './components/ui/LoadingScreen';

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
const IntegrationsPage = lazyPage(
  async () => import('./pages/IntegrationsPage'),
  'IntegrationsPage',
);
const SchedulersPage = lazyPage(async () => import('./pages/SchedulersPage'), 'SchedulersPage');
const LogsPage = lazyPage(async () => import('./pages/LogsPage'), 'LogsPage');

interface AppRoutesProps {
  isAdmin: boolean;
}

export function AppRoutes({ isAdmin }: AppRoutesProps) {
  return (
    <Suspense fallback={<LoadingScreen />}>
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
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/integrations" element={<IntegrationsPage />} />
            <Route path="/admin/schedulers" element={<SchedulersPage />} />
            <Route path="/admin/logs" element={<LogsPage />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
