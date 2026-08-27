import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Menu,
  X,
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  Receipt,
  Clock,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { signOutUser } from '../../services/authService';

export const MobileNav: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { companySettings } = useCompany();
  const { userDoc, staffProfile } = useAuth();
  const { can, role } = usePermissions();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOutUser();
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, show: can('dashboard.view') },
    { label: 'My Work', path: '/work', icon: Briefcase, show: can('work.viewOwn') },
    { label: 'Chat', path: '/chat', icon: MessageSquare, show: can('chat.use') },
    { label: 'Attendance', path: '/attendance', icon: Clock, show: can('attendance.viewOwn') },
    { label: 'Expenses', path: '/expenses', icon: Receipt, show: can('expense.viewOwn') },
    { label: 'Staff Entry', path: '/staff', icon: Briefcase, show: can('staff.view') },
    { label: 'Reports', path: '/reports', icon: Briefcase, show: can('reports.view') },
    { label: 'CMS Settings', path: '/settings', icon: Briefcase, show: can('settings.manage') },
  ];

  return (
    <div className="md:hidden">
      {/* MOBILE TOP HEADER */}
      <header className="h-14 bg-white border-b border-gray-100 px-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          {companySettings?.logoUrl ? (
            <img src={companySettings.logoUrl} alt="Logo" className="h-7 w-auto object-contain" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-brand-600 text-white font-black text-xs flex items-center justify-center">
              JL
            </div>
          )}
          <span className="text-sm font-extrabold text-gray-900 truncate">
            {companySettings?.companyName || 'Janta Live'}
          </span>
        </div>

        <img
          src={
            staffProfile?.photoUrl ||
            userDoc?.photoUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
          }
          alt="Avatar"
          className="w-8 h-8 rounded-xl object-cover border border-brand-500"
        />
      </header>

      {/* MOBILE NAVIGATION DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />

          {/* Panel */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            <div>
              {/* DRAWER HEADER */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 text-white font-black flex items-center justify-center text-xs">
                    JL
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Janta Live Setu</h3>
                    <p className="text-[10px] font-semibold text-brand-600 uppercase">{role || 'Staff'}</p>
                  </div>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* DRAWER NAV ITEMS */}
              <div className="p-2 space-y-1 overflow-y-auto max-h-[70vh]">
                {navItems
                  .filter((i) => i.show)
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setDrawerOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                            isActive ? 'bg-brand-600 text-white' : 'text-gray-700 hover:bg-gray-50'
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>
                    );
                  })}
              </div>
            </div>

            {/* DRAWER FOOTER */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
              <p className="text-[10px] text-gray-400 text-center font-medium">Secure with Janta Live Setu</p>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR FOR MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-gray-200 flex items-center justify-around z-20 px-2 shadow-lg">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive ? 'text-brand-600' : 'text-gray-400'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/work"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive ? 'text-brand-600' : 'text-gray-400'
            }`
          }
        >
          <Briefcase className="w-5 h-5" />
          <span>Work</span>
        </NavLink>

        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive ? 'text-brand-600' : 'text-gray-400'
            }`
          }
        >
          <MessageSquare className="w-5 h-5" />
          <span>Chat</span>
        </NavLink>

        <NavLink
          to="/expenses"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive ? 'text-brand-600' : 'text-gray-400'
            }`
          }
        >
          <Receipt className="w-5 h-5" />
          <span>Expenses</span>
        </NavLink>
      </div>
    </div>
  );
};
