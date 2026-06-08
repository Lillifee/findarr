import { Navigate, Route, Routes } from 'react-router-dom';

import { ActivityPage } from './pages/ActivityPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExplorePage } from './pages/ExplorePage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { MediaDetailPage } from './pages/MediaDetailPage';
import { SchedulersPage } from './pages/SchedulersPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UserPage';
import { VotePage } from './pages/VotePage';

interface AppRoutesProps {
  isAdmin: boolean;
}

export function AppRoutes({ isAdmin }: AppRoutesProps) {
  return (
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
        </>
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
