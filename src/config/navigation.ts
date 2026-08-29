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
  LucideIcon
} from 'lucide-react';
import { PermissionKey } from '../utils/permissions';

export type NavCategory = 'main' | 'office' | 'management' | 'facilities' | 'system';

export interface NavItemConfig {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  category: NavCategory;
  permission?: PermissionKey;
  isDirectorOnly?: boolean;
  showInBottomNav?: boolean;
  bottomNavOrder?: number;
}

export const CATEGORY_LABELS: Record<NavCategory, string> = {
  main: 'MAIN NAVIGATION',
  office: 'OFFICE & EXPENSES',
  management: 'STAFF & MANAGEMENT',
  facilities: 'FACILITIES & CLEANING',
  system: 'SYSTEM & ANNOUNCEMENTS',
};

export const ALL_NAV_ITEMS: NavItemConfig[] = [
  // MAIN
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    category: 'main',
    permission: 'dashboard.view',
    showInBottomNav: true,
    bottomNavOrder: 1,
  },
  {
    id: 'work',
    label: 'My Work',
    path: '/work',
    icon: Briefcase,
    category: 'main',
    permission: 'work.viewOwn',
    showInBottomNav: true,
    bottomNavOrder: 2,
  },
  {
    id: 'chat',
    label: 'Chat',
    path: '/chat',
    icon: MessageSquare,
    category: 'main',
    permission: 'chat.use',
    showInBottomNav: true,
    bottomNavOrder: 3,
  },
  {
    id: 'attendance',
    label: 'Attendance',
    path: '/attendance',
    icon: Clock,
    category: 'main',
    permission: 'attendance.viewOwn',
    showInBottomNav: true,
    bottomNavOrder: 4,
  },

  // OFFICE & EXPENSES
  {
    id: 'expenses',
    label: 'Expenses',
    path: '/expenses',
    icon: Receipt,
    category: 'office',
    permission: 'expense.viewOwn',
  },
  {
    id: 'tea-snacks',
    label: 'Tea / Snacks',
    path: '/tea-snacks',
    icon: Coffee,
    category: 'office',
    permission: 'tea.create',
  },
  {
    id: 'water',
    label: 'Water Record',
    path: '/water',
    icon: Droplet,
    category: 'office',
    permission: 'water.create',
  },
  {
    id: 'electricity',
    label: 'Electricity',
    path: '/electricity',
    icon: Zap,
    category: 'office',
    permission: 'electricity.create',
  },

  // STAFF & MANAGEMENT
  {
    id: 'staff',
    label: 'Staff Entry',
    path: '/staff',
    icon: Users,
    category: 'management',
    permission: 'staff.view',
  },
  {
    id: 'salary',
    label: 'Salary Engine',
    path: '/salary',
    icon: DollarSign,
    category: 'management',
    permission: 'salary.viewOwn',
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: FileBarChart,
    category: 'management',
    permission: 'reports.view',
  },
  {
    id: 'clients',
    label: 'Client Directory',
    path: '/clients',
    icon: FolderGit2,
    category: 'management',
  },

  // FACILITIES & CLEANING
  {
    id: 'rent',
    label: 'Office Rent',
    path: '/office/rent',
    icon: Building,
    category: 'facilities',
    permission: 'rent.manage',
  },
  {
    id: 'cleanliness',
    label: 'Cleanliness',
    path: '/office/cleanliness',
    icon: Sparkles,
    category: 'facilities',
    permission: 'cleaning.manage',
  },
  {
    id: 'toilet-cleaning',
    label: 'Toilet Cleaning',
    path: '/office/toilet-cleaning',
    icon: ShieldCheck,
    category: 'facilities',
    permission: 'cleaning.manage',
  },

  // SYSTEM & ANNOUNCEMENTS
  {
    id: 'notices',
    label: 'Notice Board',
    path: '/notices',
    icon: Bell,
    category: 'system',
  },
  {
    id: 'holidays',
    label: 'Holidays',
    path: '/holidays',
    icon: CalendarDays,
    category: 'system',
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    path: '/audit',
    icon: Lock,
    category: 'system',
    isDirectorOnly: true,
  },
  {
    id: 'profile',
    label: 'My Profile',
    path: '/profile',
    icon: User,
    category: 'system',
  },
  {
    id: 'settings',
    label: 'CMS Settings',
    path: '/settings',
    icon: Settings,
    category: 'system',
    permission: 'settings.manage',
  },
];
