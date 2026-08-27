import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionKey } from '../../utils/permissions';

export interface RoleGuardProps {
  permission: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { can } = usePermissions();

  if (!can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
