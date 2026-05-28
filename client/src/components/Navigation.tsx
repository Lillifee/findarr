import type { User } from '@findarr/shared';
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { interactionService } from '../services/api';

interface NavigationProps {
  onLogout: () => void;
  user: User | null;
  isAdmin: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ onLogout, user, isAdmin }) => {
  const [mobileAdvancedOpen, setMobileAdvancedOpen] = useState(false);
  const [hasAttention, setHasAttention] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

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

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `w-full rounded-lg border px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
      isActive
        ? 'border-gray-200 bg-gray-200 text-gray-950'
        : 'border-transparent text-gray-300 hover:border-gray-700 hover:bg-gray-800 hover:text-white'
    }`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
      isActive ? 'text-white' : 'text-gray-500'
    }`;

  const attentionIndicator = hasAttention ? (
    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 outline-none ring-1 ring-amber-800 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
  ) : null;

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-gray-800/90 backdrop-blur-md border-r border-gray-700/50 flex-col justify-between z-40 shadow-2xl">
        {/* Top Section */}
        <div>
          {/* Navigation Items */}
          <nav className="p-4 space-y-2 mt-4">
            <NavLink to="/" end className={navLinkClass}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10.25L12 3l9 7.25M5.25 9.5V20a.75.75 0 00.75.75h4.5v-6h3v6H18a.75.75 0 00.75-.75V9.5"
                />
              </svg>
              <span className="font-medium">Home</span>
            </NavLink>

            <NavLink to="/vote" className={navLinkClass}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
              <span className="font-medium">Vote</span>
            </NavLink>

            <NavLink to="/explore" className={navLinkClass}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              <span className="font-medium">Explore</span>
            </NavLink>

            <NavLink to="/activity" className={navLinkClass}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 6h11M9 12h11M9 18h11M5 6l1.5 1.5L8 5.5M5 12l1.5 1.5L8 11.5M5 18l1.5 1.5L8 17.5"
                />
              </svg>
              <span className="font-medium">Activity</span>
              <span className="ml-auto">{attentionIndicator}</span>
            </NavLink>

            {/* Account Section - Always Visible on Desktop */}
            <div className="pt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 mb-2">
                Account
              </div>
              <div className="space-y-1">
                <NavLink to="/settings" className={navLinkClass}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317a1 1 0 011.35-.936l1.93.786a1 1 0 00.79 0l1.93-.786a1 1 0 011.35.936l.228 2.067a1 1 0 00.548.784l1.74.98a1 1 0 01.365 1.414l-1.21 1.691a1 1 0 000 .99l1.21 1.69a1 1 0 01-.366 1.415l-1.739.98a1 1 0 00-.548.783l-.228 2.068a1 1 0 01-1.35.935l-1.93-.786a1 1 0 00-.79 0l-1.93.786a1 1 0 01-1.35-.935l-.228-2.068a1 1 0 00-.548-.784l-1.74-.979a1 1 0 01-.365-1.415l1.21-1.69a1 1 0 000-.99l-1.21-1.691a1 1 0 01.366-1.414l1.739-.98a1 1 0 00.548-.783l.228-2.067z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="font-medium text-sm">Settings</span>
                </NavLink>

                {isAdmin && (
                  <>
                    <NavLink to="/admin/users" className={navLinkClass}>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      <span className="font-medium text-sm">Users</span>
                    </NavLink>

                    <NavLink to="/admin/integrations" className={navLinkClass}>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 12H3m2 0a2 2 0 100-4 2 2 0 000 4zm0 0a2 2 0 100 4 2 2 0 000-4m0-4V4m0 16v-4M21 12h-2m2 0a2 2 0 100-4 2 2 0 000 4zm0 0a2 2 0 100 4 2 2 0 000-4m0-4V4m0 16v-4M12 3v2m0 14v2M12 8a4 4 0 100 8 4 4 0 000-8z"
                        />
                      </svg>
                      <span className="font-medium text-sm">Integrations</span>
                    </NavLink>

                    <NavLink to="/admin/schedulers" className={navLinkClass}>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-medium text-sm">Schedulers</span>
                    </NavLink>
                  </>
                )}

                {/* Desktop logout moved to bottom user-info area */}
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom Section - User Info */}
        <div className="border-t border-gray-700/50 p-4">
          <div className="p-0">
            <button
              onClick={onLogout}
              className={navLinkClass({ isActive: false })}
              aria-label={user?.displayName ? `Logout ${user.displayName}` : 'Logout'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="font-medium text-sm">Logout {user?.displayName}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation - Hidden on desktop */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-md border-t border-gray-700/50 z-50 safe-area-inset-bottom shadow-2xl">
        <div className="flex justify-around items-center h-16">
          <NavLink to="/" end className={mobileNavLinkClass}>
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10.25L12 3l9 7.25M5.25 9.5V20a.75.75 0 00.75.75h4.5v-6h3v6H18a.75.75 0 00.75-.75V9.5"
              />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </NavLink>

          <NavLink to="/vote" className={mobileNavLinkClass}>
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
              />
            </svg>
            <span className="text-xs font-medium">Vote</span>
          </NavLink>
          <NavLink to="/explore" className={mobileNavLinkClass}>
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span className="text-xs font-medium">Explore</span>
          </NavLink>

          <NavLink to="/activity" className={mobileNavLinkClass}>
            <span className="relative">
              <svg className="mb-1 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 6h11M9 12h11M9 18h11M5 6l1.5 1.5L8 5.5M5 12l1.5 1.5L8 11.5M5 18l1.5 1.5L8 17.5"
                />
              </svg>
              {hasAttention && (
                <span className="absolute -right-1 top-0 inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
              )}
            </span>
            <span className="text-xs font-medium">Activity</span>
          </NavLink>

          <button
            onClick={() => setMobileAdvancedOpen(!mobileAdvancedOpen)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors cursor-pointer ${
              mobileAdvancedOpen || isAdminRoute ? 'text-white' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
            <span className="text-xs font-medium">More</span>
          </button>
        </div>

        {/* Mobile Advanced Menu Dropdown */}
        {mobileAdvancedOpen && (
          <div className="absolute bottom-full left-0 right-0 bg-gray-800/95 backdrop-blur-md border-t border-gray-700/50 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-4 space-y-2">
              <div className="text-xs text-gray-400 mb-3 px-2">
                Logged in as <span className="text-white font-medium">{user?.displayName}</span>
              </div>

              <NavLink
                to="/settings"
                onClick={() => setMobileAdvancedOpen(false)}
                className={navLinkClass}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317a1 1 0 011.35-.936l1.93.786a1 1 0 00.79 0l1.93-.786a1 1 0 011.35.936l.228 2.067a1 1 0 00.548.784l1.74.98a1 1 0 01.365 1.414l-1.21 1.691a1 1 0 000 .99l1.21 1.69a1 1 0 01-.366 1.415l-1.739.98a1 1 0 00-.548.783l-.228 2.068a1 1 0 01-1.35.935l-1.93-.786a1 1 0 00-.79 0l-1.93.786a1 1 0 01-1.35-.935l-.228-2.068a1 1 0 00-.548-.784l-1.74-.979a1 1 0 01-.365-1.415l1.21-1.69a1 1 0 000-.99l-1.21-1.691a1 1 0 01.366-1.414l1.739-.98a1 1 0 00.548-.783l.228-2.067z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="font-medium">Settings</span>
              </NavLink>

              {isAdmin && (
                <>
                  <NavLink
                    to="/admin/users"
                    onClick={() => setMobileAdvancedOpen(false)}
                    className={navLinkClass}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    <span className="font-medium">Users</span>
                  </NavLink>

                  <NavLink
                    to="/admin/integrations"
                    onClick={() => setMobileAdvancedOpen(false)}
                    className={navLinkClass}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 12H3m2 0a2 2 0 100-4 2 2 0 000 4zm0 0a2 2 0 100 4 2 2 0 000-4m0-4V4m0 16v-4M21 12h-2m2 0a2 2 0 100-4 2 2 0 000 4zm0 0a2 2 0 100 4 2 2 0 000-4m0-4V4m0 16v-4M12 3v2m0 14v2M12 8a4 4 0 100 8 4 4 0 000-8z"
                      />
                    </svg>
                    <span className="font-medium">Integrations</span>
                  </NavLink>

                  <NavLink
                    to="/admin/schedulers"
                    onClick={() => setMobileAdvancedOpen(false)}
                    className={navLinkClass}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-medium">Schedulers</span>
                  </NavLink>
                </>
              )}

              <button
                onClick={() => {
                  setMobileAdvancedOpen(false);
                  onLogout();
                }}
                className={navLinkClass({ isActive: false })}
                aria-label="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};
