import { useAuth } from '../contexts/AuthContext';
import { hasPermission, PermissionKey } from '../utils/permissions';

export function usePermissions() {
  const { userDoc } = useAuth();
  const role = userDoc?.role;

  const can = (permission: PermissionKey): boolean => {
    return hasPermission(role, permission);
  };

  return {
    role,
    can,
    isDirector: role === 'director',
    isAdmin: role === 'admin' || role === 'director',
    isStaff: role === 'staff',
  };
}
