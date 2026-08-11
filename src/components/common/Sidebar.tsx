import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Globe, 
  FolderTree, 
  Mail, 
  Server, 
  Share2, 
  User, 
  Users, 
  Settings, 
  FileText, 
  LogOut,
  Shield,
  ShieldCheck,
  Lock,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const { isSuperAdmin, profile, logout, lockSession } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Websites', path: '/websites', icon: Globe },
    { label: 'Categories', path: '/categories', icon: FolderTree },
    { label: 'Gmail Accounts', path: '/gmail', icon: Mail },
    { label: 'Hosting & Platforms', path: '/platforms', icon: Server },
    { label: 'Social Media', path: '/social', icon: Share2 },
    { label: 'Profile', path: '/profile', icon: User },
    ...(isSuperAdmin ? [{ label: 'Employees', path: '/employees', icon: Users }] : []),
    ...(isSuperAdmin ? [{ label: 'Access Security', path: '/access-security', icon: ShieldCheck }] : []),
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Audit Logs', path: '/audit-logs', icon: FileText },
  ];

  const content = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md font-bold text-lg tracking-tight">
            WD
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white leading-snug tracking-tight">
              Client Data Manager
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Internal Business Control</p>
          </div>
        </div>
        <button
          onClick={onMobileClose}
          className="md:hidden text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Badge Indicator */}
      <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className={`w-3.5 h-3.5 ${isSuperAdmin ? 'text-purple-400' : 'text-blue-400'}`} />
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            {profile?.role || 'User'}
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
          Authorized
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {profile?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{profile?.displayName || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate font-mono">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => lockSession()}
              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Lock Session"
            >
              <Lock className="w-4 h-4" />
            </button>
            <button
              onClick={() => logout()}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block h-screen sticky top-0 flex-shrink-0 z-30">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onMobileClose} />
          <div className="relative flex-1 max-w-xs w-full animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
