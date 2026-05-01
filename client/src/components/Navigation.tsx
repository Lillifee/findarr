import type { User } from '@findarr/shared';
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavigationProps {
  onLogout: () => void;
  user: User | null;
  isAdmin: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ onLogout, user, isAdmin }) => {
  const [mobileAdvancedOpen, setMobileAdvancedOpen] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `w-full px-4 py-3 rounded-lg flex items-center gap-3 text-left transition-all ${
      isActive
        ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-md'
        : 'text-gray-300 hover:bg-gray-700'
    }`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
      isActive ? 'text-amber-400' : 'text-gray-400'
    }`;

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-gray-800/90 backdrop-blur-md border-r border-gray-700/50 flex-col justify-between z-40 shadow-2xl">
        {/* Top Section */}
        <div>
          {/* Navigation Items */}
          <nav className="p-4 space-y-2 mt-4">
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

            <NavLink to="/popular" className={navLinkClass}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              <span className="font-medium">Popular</span>
            </NavLink>

            <NavLink to="/requests" className={navLinkClass}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
              <span className="font-medium">My Votes</span>
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

                    <NavLink to="/admin/arr" className={navLinkClass}>
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

                <button
                  onClick={onLogout}
                  className="w-full px-4 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg flex items-center gap-3 transition-all font-medium text-sm border border-red-600/30 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom Section - User Info */}
        <div className="p-4 border-t border-gray-700">
          <div className="p-3 bg-gray-700/50 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Logged in as</div>
            <div className="text-sm font-medium text-white truncate">{user?.displayName}</div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation - Hidden on desktop */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-md border-t border-gray-700/50 z-50 safe-area-inset-bottom shadow-2xl">
        <div className="flex justify-around items-center h-16">
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
          <NavLink to="/popular" className={mobileNavLinkClass}>
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span className="text-xs font-medium">Popular</span>
          </NavLink>

          <NavLink to="/requests" className={mobileNavLinkClass}>
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
              />
            </svg>
            <span className="text-xs font-medium">Votes</span>
          </NavLink>

          <button
            onClick={() => setMobileAdvancedOpen(!mobileAdvancedOpen)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors cursor-pointer ${
              mobileAdvancedOpen || isAdminRoute ? 'text-amber-400' : 'text-gray-400'
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
          <div className="absolute bottom-full left-0 right-0 bg-gray-800/95 backdrop-blur-lg border-t border-gray-700/50 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                    to="/admin/arr"
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
                </>
              )}

              <button
                onClick={() => {
                  setMobileAdvancedOpen(false);
                  onLogout();
                }}
                className="w-full px-4 py-3 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg flex items-center gap-3 transition-all font-medium border border-red-600/30 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};
