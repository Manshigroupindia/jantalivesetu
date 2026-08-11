import React, { useState } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  User, 
  LogOut, 
  AlertTriangle, 
  Clock, 
  CreditCard,
  Plus,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { GlobalSearchModal } from './GlobalSearchModal';

interface TopHeaderProps {
  onMobileMenuToggle: () => void;
  title?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onMobileMenuToggle, title = 'Dashboard' }) => {
  const navigate = useNavigate();
  const { profile, logout, lockSession, isManage } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Left: Mobile Toggle & Page Title */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{title}</h2>
            </div>
          </div>

          {/* Right: Search, Quick Add, Notifications, Profile */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* Global Search Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs text-slate-500 font-medium transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-300 rounded text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* "+ Add New Website" Quick Action */}
            {isManage && (
              <button
                type="button"
                onClick={() => navigate('/websites/new')}
                className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Website</span>
              </button>
            )}

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifDropdownOpen(!notifDropdownOpen);
                  if (!notifDropdownOpen) markAllAsRead();
                }}
                className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white" />
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-150">
                  <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">System Alerts & Notifications</span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {notifications.length} total
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No active notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotifDropdownOpen(false);
                            if (n.websiteId) navigate(`/websites/${n.websiteId}`);
                          }}
                          className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start space-x-2.5"
                        >
                          {n.severity === 'critical' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                          ) : n.severity === 'warning' ? (
                            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <CreditCard className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                            <p className="text-[11px] text-slate-600 leading-snug mt-0.5">{n.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Lock Session Action */}
            <button
              type="button"
              onClick={() => {
                lockSession();
                navigate('/security-verification');
              }}
              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1"
              title="Lock Session"
            >
              <Lock className="w-4 h-4" />
              <span className="hidden lg:inline text-xs font-semibold">Lock</span>
            </button>

            {/* Profile Avatar */}
            <button
              onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center hover:ring-2 hover:ring-brand-500 transition"
              title="View Profile"
            >
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="User profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                profile?.displayName?.charAt(0) || 'U'
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Global Search Overlay */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
