import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  Clock,
  Receipt,
  Coffee,
  Droplet,
  Zap,
  DollarSign,
  Users,
  Building,
  Sparkles,
  ShieldCheck,
  Bell,
  CalendarDays,
  FileBarChart,
  Settings,
  FolderGit2,
  Lock,
  User,
  LogOut
} from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../contexts/AuthContext';
import { signOutUser } from '../../services/authService';

export const Sidebar: React.FC = () => {
  const { companySettings } = useCompany();
  const { can, role, isDirector } = usePermissions();
  const { userDoc, staffProfile } = useAuth();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOutUser();
    }
  };

  const navItems = [
    { label: 'My Profile', path: '/profile', icon: User, show: true },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, show: can('dashboard.view') },
    { label: 'My Work', path: '/work', icon: Briefcase, show: can('work.viewOwn') },
    { label: 'Chat', path: '/chat', icon: MessageSquare, show: can('chat.use') },
    { label: 'Attendance', path: '/attendance', icon: Clock, show: can('attendance.viewOwn') },
    { label: 'Expenses', path: '/expenses', icon: Receipt, show: can('expense.viewOwn') },
    { label: 'Tea / Snacks', path: '/tea-snacks', icon: Coffee, show: can('tea.create') },
    { label: 'Water Record', path: '/water', icon: Droplet, show: can('water.create') },
    { label: 'Electricity', path: '/electricity', icon: Zap, show: can('electricity.create') },
    { label: 'Salary Engine', path: '/salary', icon: DollarSign, show: can('salary.viewOwn') },
    { label: 'Staff Entry', path: '/staff', icon: Users, show: can('staff.view') },
    { label: 'Office Rent', path: '/office/rent', icon: Building, show: can('rent.manage') },
    { label: 'Cleanliness', path: '/office/cleanliness', icon: Sparkles, show: can('cleaning.manage') },
    { label: 'Toilet Cleaning', path: '/office/toilet-cleaning', icon: ShieldCheck, show: can('cleaning.manage') },
    { label: 'Notice Board', path: '/notices', icon: Bell, show: true },
    { label: 'Holidays', path: '/holidays', icon: CalendarDays, show: true },
    { label: 'Reports', path: '/reports', icon: FileBarChart, show: can('reports.view') },
    { label: 'Audit Logs', path: '/audit', icon: Lock, show: isDirector },
    { label: 'Client Directory', path: '/clients', icon: FolderGit2, show: true },
    { label: 'CMS Settings', path: '/settings', icon: Settings, show: can('settings.manage') },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 hidden md:flex shrink-0 shadow-sm z-20">
      {/* BRANDING HEADER */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
        {companySettings?.logoUrl ? (
          <img src={companySettings.logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-black text-lg flex items-center justify-center shadow-md">
            JL
          </div>
        )}
        <div className="truncate">
          <h1 className="text-base font-black text-gray-900 tracking-tight truncate">
            {companySettings?.companyName || 'Janta Live'}
          </h1>
          <span className="text-[10px] font-bold text-brand-600 tracking-widest uppercase block">SETU CMS</span>
        </div>
      </div>

      {/* OPTIONAL DEITY IMAGE */}
      {companySettings?.deityImageUrl && (
        <div className="px-6 py-2 bg-brand-50/50 border-b border-gray-100 flex items-center justify-center gap-2">
          <img src={companySettings.deityImageUrl} alt="Deity" className="w-6 h-6 rounded-full object-cover border border-brand-200" />
          <span className="text-[11px] font-semibold text-brand-800">Shree Ganeshay Namah</span>
        </div>
      )}

      {/* NAVIGATION ITEMS */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
      </nav>

      {/* USER FOOTER */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={
                staffProfile?.photoUrl ||
                userDoc?.photoUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
              }
              alt="Avatar"
              className="w-9 h-9 rounded-xl object-cover border shrink-0"
            />
            <div className="truncate">
              <p className="text-xs font-bold text-gray-900 truncate">{userDoc?.name || 'User'}</p>
              <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider truncate">
                {role || 'Staff'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 font-medium text-center mt-2">Secure with Janta Live Setu</p>
      </div>
    </aside>
  );
};
