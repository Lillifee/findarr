import type { User } from '@findarr/shared/auth';
import { isDefined } from '@findarr/shared/utils';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';

import { Icon } from './components/ui';
import { useVersionInfo } from './hooks/useVersionInfo';
import { interactionService } from './services/api';

interface NavigationProps {
  onLogout: () => void;
  user: User | null;
  isAdmin: boolean;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `w-full rounded-lg border px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
    isActive
      ? 'border-amber-400/35 bg-amber-400/10 text-amber-100'
      : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/80 hover:text-zinc-100'
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
    isActive ? 'text-amber-100' : 'text-zinc-500'
  }`;

function StatusIndicator() {
  return (
    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] ring-1 ring-amber-800 outline-none" />
  );
}

export const Navigation: React.FC<NavigationProps> = ({ onLogout, user, isAdmin }) => {
  const { t } = useTranslation();
  const [mobileAdvancedOpen, setMobileAdvancedOpen] = useState(false);
  const [hasAttention, setHasAttention] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const versionInfo = useVersionInfo(isAdmin);

  useEffect(() => {
    let cancelled = false;

    const loadAttention = async () => {
      try {
        const response = await interactionService.listAttention();

        if (!cancelled) {
          setHasAttention(response.results.length > 0);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load activity attention state:', error);
        }
      }
    };

    void loadAttention();
    const timer = globalThis.setInterval(() => {
      void loadAttention();
    }, 60_000);

    return () => {
      cancelled = true;
      globalThis.clearInterval(timer);
    };
  }, []);

  const attentionIndicator = hasAttention ? <StatusIndicator /> : null;
  const updateIndicator = versionInfo?.updateAvailable === true ? <StatusIndicator /> : null;

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="fixed top-0 left-0 z-40 hidden h-screen w-64 flex-col justify-between border-r border-zinc-800/80 bg-zinc-950 md:flex">
        {/* Top Section */}
        <div>
          {/* Navigation Items */}
          <nav className="mt-4 space-y-2 p-4">
            <NavLink to="/" end className={navLinkClass}>
              <Icon name="home" />
              <span className="font-medium">{t('nav.home')}</span>
            </NavLink>

            <NavLink to="/vote" className={navLinkClass}>
              <Icon name="thumb_up" />
              <span className="font-medium">{t('nav.vote')}</span>
            </NavLink>

            <NavLink to="/explore" className={navLinkClass}>
              <Icon name="explore" />
              <span className="font-medium">{t('nav.explore')}</span>
            </NavLink>

            <NavLink to="/activity" className={navLinkClass}>
              <Icon name="fact_check" />
              <span className="font-medium">{t('nav.activity')}</span>
              <span className="ml-auto">{attentionIndicator}</span>
            </NavLink>

            {/* Account Section - Always Visible on Desktop */}
            <div className="pt-4">
              <div className="mb-2 px-4 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                {t('nav.account')}
              </div>
              <div className="space-y-1">
                <NavLink to="/settings" className={navLinkClass}>
                  <Icon name="tune" />
                  <span className="text-sm font-medium">{t('nav.settings')}</span>
                </NavLink>

                {isAdmin && (
                  <>
                    <NavLink to="/admin/users" className={navLinkClass}>
                      <Icon name="group" />
                      <span className="text-sm font-medium">{t('nav.users')}</span>
                    </NavLink>

                    <NavLink to="/admin/integrations" className={navLinkClass}>
                      <Icon name="link" />
                      <span className="text-sm font-medium">{t('nav.integrations')}</span>
                    </NavLink>

                    <NavLink to="/admin/schedulers" className={navLinkClass}>
                      <Icon name="schedule" />
                      <span className="text-sm font-medium">{t('nav.schedulers')}</span>
                    </NavLink>

                    <NavLink to="/admin/logs" className={navLinkClass}>
                      <Icon name="checklist" />
                      <span className="text-sm font-medium">{t('nav.logs')}</span>
                      <span className="ml-auto">{updateIndicator}</span>
                    </NavLink>
                  </>
                )}

                {/* Desktop logout moved to bottom user-info area */}
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom Section - User Info */}
        <div className="border-t border-zinc-800/80 p-4">
          <div className="p-0">
            <button
              onClick={onLogout}
              className={navLinkClass({ isActive: false })}
              aria-label={
                isDefined(user?.displayName)
                  ? `${t('nav.logout')} ${user.displayName}`
                  : t('nav.logout')
              }
            >
              <Icon name="logout" />
              <span className="text-sm font-medium">
                {t('nav.logout')} {user?.displayName}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation - Hidden on desktop */}
      <nav className="safe-area-inset-bottom fixed right-0 bottom-0 left-0 z-50 border-t border-zinc-800/80 bg-zinc-950 md:hidden">
        <div className="flex h-16 items-center justify-around">
          <NavLink to="/" end className={mobileNavLinkClass}>
            <Icon className="mb-1" name="home" size="lg" />
            <span className="text-xs font-medium">{t('nav.home')}</span>
          </NavLink>

          <NavLink to="/vote" className={mobileNavLinkClass}>
            <Icon className="mb-1" name="thumb_up" size="lg" />
            <span className="text-xs font-medium">{t('nav.vote')}</span>
          </NavLink>
          <NavLink to="/explore" className={mobileNavLinkClass}>
            <Icon className="mb-1" name="explore" size="lg" />
            <span className="text-xs font-medium">{t('nav.explore')}</span>
          </NavLink>

          <NavLink to="/activity" className={mobileNavLinkClass}>
            <span className="relative inline-flex">
              <Icon className="mb-1" name="fact_check" size="lg" />
              {hasAttention && (
                <span className="absolute top-2 -right-1">
                  <StatusIndicator />
                </span>
              )}
            </span>
            <span className="text-xs font-medium">{t('nav.activity')}</span>
          </NavLink>

          <button
            onClick={() => {
              setMobileAdvancedOpen(!mobileAdvancedOpen);
            }}
            className={`flex h-full flex-1 cursor-pointer flex-col items-center justify-center transition-colors ${
              mobileAdvancedOpen || isAdminRoute ? 'text-amber-100' : 'text-zinc-500'
            }`}
          >
            <span className="relative inline-flex">
              <Icon className="mb-1" name="more_vert" size="lg" />
              {updateIndicator && (
                <span className="absolute top-2 -right-1">
                  <StatusIndicator />
                </span>
              )}
            </span>
            <span className="text-xs font-medium">{t('nav.more')}</span>
          </button>
        </div>

        {/* Mobile Advanced Menu Dropdown */}
        {mobileAdvancedOpen && (
          <div className="animate-in fade-in slide-in-from-bottom-2 absolute right-0 bottom-full left-0 border-t border-zinc-800/80 bg-zinc-950 duration-200">
            <div className="space-y-2 p-4">
              <div className="mb-3 px-2 text-xs text-gray-400">
                {t('nav.loggedInAs')}{' '}
                <span className="font-medium text-white">{user?.displayName}</span>
              </div>

              <NavLink
                to="/settings"
                onClick={() => {
                  setMobileAdvancedOpen(false);
                }}
                className={navLinkClass}
              >
                <Icon name="tune" />
                <span className="font-medium">{t('nav.settings')}</span>
              </NavLink>

              {isAdmin && (
                <>
                  <NavLink
                    to="/admin/users"
                    onClick={() => {
                      setMobileAdvancedOpen(false);
                    }}
                    className={navLinkClass}
                  >
                    <Icon name="group" />
                    <span className="font-medium">{t('nav.users')}</span>
                  </NavLink>

                  <NavLink
                    to="/admin/integrations"
                    onClick={() => {
                      setMobileAdvancedOpen(false);
                    }}
                    className={navLinkClass}
                  >
                    <Icon name="link" />
                    <span className="font-medium">{t('nav.integrations')}</span>
                  </NavLink>

                  <NavLink
                    to="/admin/schedulers"
                    onClick={() => {
                      setMobileAdvancedOpen(false);
                    }}
                    className={navLinkClass}
                  >
                    <Icon name="schedule" />
                    <span className="font-medium">{t('nav.schedulers')}</span>
                  </NavLink>

                  <NavLink
                    to="/admin/logs"
                    onClick={() => {
                      setMobileAdvancedOpen(false);
                    }}
                    className={navLinkClass}
                  >
                    <Icon name="checklist" />
                    <span className="font-medium">{t('nav.logs')}</span>
                    <span className="ml-auto">{updateIndicator}</span>
                  </NavLink>
                </>
              )}

              <button
                onClick={() => {
                  setMobileAdvancedOpen(false);
                  onLogout();
                }}
                className={navLinkClass({ isActive: false })}
                aria-label={t('nav.logout')}
              >
                <Icon name="logout" />
                <span className="font-medium">{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};
