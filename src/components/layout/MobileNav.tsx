import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  ChevronRight,
  MoreHorizontal,
  Lock,
  Download,
  Bell
} from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSecurity } from '../../contexts/SecurityContext';
import { usePWA } from '../../contexts/PWAContext';
import { usePushNotification } from '../../contexts/PushNotificationContext';
import { usePermissions } from '../../hooks/usePermissions';
import { signOutUser } from '../../services/authService';
import { useNotification } from '../../contexts/NotificationContext';
import { ALL_NAV_ITEMS, CATEGORY_LABELS, NavCategory } from '../../config/navigation';

export const MobileNav: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { companySettings } = useCompany();
  const { userDoc, staffProfile } = useAuth();
  const { lockPinSession } = useSecurity();
  const { unreadCount, openCenter } = usePushNotification();
  const { isStandalone, triggerInstall } = usePWA();
  const { can, role, isDirector } = usePermissions();
  const { showConfirm } = useNotification();
  const location = useLocation();

  // Close drawer when route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const handleLogout = () => {
    showConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of Janta Live Setu?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        setDrawerOpen(false);
        await signOutUser();
      },
    });
  };

  // Filter items based on single-source permissions
  const authorizedItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.isDirectorOnly) return isDirector;
    if (item.permission) return can(item.permission);
    return true;
  });

  // Filter for Bottom Navigation Bar items
  const bottomNavItems = authorizedItems
    .filter((item) => item.showInBottomNav)
    .sort((a, b) => (a.bottomNavOrder || 99) - (b.bottomNavOrder || 99));

  // Categories for Hamburger Drawer
  const categories: NavCategory[] = ['main', 'office', 'management', 'facilities', 'system'];

  return (
    <div className="md:hidden">
      {/* MOBILE TOP HEADER */}
      <header className="h-14 bg-white border-b border-gray-100 px-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
          >
            <Menu className="w-6 h-6" />
          </button>
          {companySettings?.logoUrl ? (
            <img src={companySettings.logoUrl} alt="Logo" className="h-7 w-auto object-contain" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-brand-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
              JL
            </div>
          )}
          <span className="text-sm font-extrabold text-gray-900 truncate">
            {companySettings?.companyName || 'Janta Live'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* MOBILE NOTIFICATION BELL */}
          <button
            onClick={openCenter}
            className="relative p-1.5 text-gray-700 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all active:scale-95"
            title="Notification Center"
            aria-label="Notification Center"
          >
            <Bell className="w-5 h-5 text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 uppercase border border-brand-200">
            {role || 'Staff'}
          </span>
          <img
            src={
              staffProfile?.photoUrl ||
              userDoc?.photoUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
            }
            alt="Avatar"
            className="w-8 h-8 rounded-xl object-cover border border-brand-500 shadow-sm"
          />
        </div>
      </header>

      {/* MOBILE NAVIGATION DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            <div className="flex flex-col h-full overflow-hidden">
              {/* DRAWER HEADER */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
                <div className="flex items-center gap-2.5">
                  {companySettings?.logoUrl ? (
                    <img src={companySettings.logoUrl} alt="Logo" className="h-7 w-auto object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-brand-600 text-white font-black flex items-center justify-center text-xs shadow-sm">
                      JL
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-black text-gray-900 leading-tight">Janta Live Setu</h3>
                    <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">{role || 'Staff'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* USER INFO BAR */}
              <div className="p-3 bg-brand-50/40 border-b border-gray-100 flex items-center gap-3 shrink-0">
                <img
                  src={
                    staffProfile?.photoUrl ||
                    userDoc?.photoUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
                  }
                  alt="Avatar"
                  className="w-10 h-10 rounded-xl object-cover border-2 border-brand-500 shadow-sm"
                />
                <div className="truncate">
                  <p className="text-xs font-black text-gray-900 truncate">
                    {staffProfile?.fullName || userDoc?.name || 'User'}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-500 truncate">
                    {staffProfile?.designation || (role ? role.toUpperCase() : 'STAFF')}
                  </p>
                </div>
              </div>

              {/* DRAWER NAV ITEMS (GROUPED) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-5">
                {categories.map((cat) => {
                  const catItems = authorizedItems.filter((item) => item.category === cat);
                  if (catItems.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-1">
                      <p className="px-2 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
                        {CATEGORY_LABELS[cat]}
                      </p>
                      {catItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setDrawerOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                isActive
                                  ? 'bg-brand-600 text-white shadow-sm'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                              }`
                            }
                          >
                            <div className="flex items-center gap-3 truncate">
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </div>
                            <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-300'}`} />
                          </NavLink>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* DRAWER FOOTER */}
              <div className="p-3 border-t border-gray-100 bg-gray-50/80 shrink-0 space-y-2">
                {!isStandalone && (
                  <button
                    onClick={() => {
                      setDrawerOpen(false);
                      triggerInstall();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold hover:bg-brand-100 transition-colors shadow-sm active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Install App
                  </button>
                )}

                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    lockPinSession();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-800 text-xs font-bold hover:bg-gray-200 transition-colors shadow-sm active:scale-95"
                >
                  <Lock className="w-4 h-4 text-gray-600" /> Lock Session
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors shadow-sm active:scale-95"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
                <p className="text-[10px] text-gray-400 text-center font-semibold">Secure with Janta Live Setu</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR FOR MOBILE */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-20 px-2 shadow-lg">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 w-full py-1 text-[10px] font-extrabold transition-colors ${
                  isActive ? 'text-brand-600 font-black' : 'text-gray-500 hover:text-gray-800'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}

        {/* MORE (DRAWER TRIGGER) */}
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open full menu"
          className="flex flex-col items-center justify-center gap-1 w-full py-1 text-[10px] font-extrabold text-gray-500 hover:text-gray-800 transition-colors"
        >
          <MoreHorizontal className="w-5 h-5 text-gray-600" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
};
