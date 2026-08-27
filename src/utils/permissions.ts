import { UserRole } from '../types';

export type PermissionKey =
  | 'dashboard.view'
  | 'staff.view'
  | 'staff.create'
  | 'staff.edit'
  | 'staff.approve'
  | 'staff.delete'
  | 'attendance.viewOwn'
  | 'attendance.viewAll'
  | 'attendance.manage'
  | 'work.viewOwn'
  | 'work.assign'
  | 'work.manage'
  | 'expense.create'
  | 'expense.viewOwn'
  | 'expense.viewAll'
  | 'expense.manage'
  | 'tea.create'
  | 'tea.manage'
  | 'water.create'
  | 'water.manage'
  | 'electricity.create'
  | 'electricity.manage'
  | 'salary.viewOwn'
  | 'salary.viewAll'
  | 'salary.manage'
  | 'rent.manage'
  | 'cleaning.manage'
  | 'notice.manage'
  | 'notices.create'
  | 'holiday.manage'
  | 'holidays.manage'
  | 'settings.manage'
  | 'chat.use'
  | 'reports.view'
  | 'sensitive.delete';

const PERMISSION_MATRIX: Record<PermissionKey, UserRole[]> = {
  'dashboard.view': ['director', 'admin', 'staff'],
  'staff.view': ['director', 'admin'],
  'staff.create': ['director', 'admin'],
  'staff.edit': ['director', 'admin'],
  'staff.approve': ['director', 'admin'],
  'staff.delete': ['director'],
  'attendance.viewOwn': ['director', 'admin', 'staff'],
  'attendance.viewAll': ['director', 'admin'],
  'attendance.manage': ['director', 'admin'],
  'work.viewOwn': ['director', 'admin', 'staff'],
  'work.assign': ['director', 'admin'],
  'work.manage': ['director', 'admin'],
  'expense.create': ['director', 'admin', 'staff'],
  'expense.viewOwn': ['director', 'admin', 'staff'],
  'expense.viewAll': ['director', 'admin'],
  'expense.manage': ['director', 'admin'],
  'tea.create': ['director', 'admin', 'staff'],
  'tea.manage': ['director', 'admin'],
  'water.create': ['director', 'admin', 'staff'],
  'water.manage': ['director', 'admin'],
  'electricity.create': ['director', 'admin', 'staff'],
  'electricity.manage': ['director', 'admin'],
  'salary.viewOwn': ['director', 'admin', 'staff'],
  'salary.viewAll': ['director', 'admin'],
  'salary.manage': ['director'],
  'rent.manage': ['director', 'admin'],
  'cleaning.manage': ['director', 'admin'],
  'notice.manage': ['director', 'admin'],
  'notices.create': ['director', 'admin'],
  'holiday.manage': ['director', 'admin'],
  'holidays.manage': ['director', 'admin'],
  'settings.manage': ['director'],
  'chat.use': ['director', 'admin', 'staff'],
  'reports.view': ['director', 'admin'],
  'sensitive.delete': ['director'],
};

export function hasPermission(role: UserRole | undefined | null, permission: PermissionKey): boolean {
  if (!role) return false;
  const allowedRoles = PERMISSION_MATRIX[permission];
  return allowedRoles ? allowedRoles.includes(role) : false;
}
