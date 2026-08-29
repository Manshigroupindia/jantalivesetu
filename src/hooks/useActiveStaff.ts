import { useMemo } from 'react';
import { useRealtimeCollection } from './useRealtime';
import { StaffProfile, User } from '../types';

export interface UseActiveStaffResult {
  activeStaffList: StaffProfile[];
  activeStaffMap: Map<string, StaffProfile>;
  loading: boolean;
}

/**
 * Checks if a staff member profile and/or user document represents an active, non-deleted, approved staff member.
 */
export function isStaffMemberActive(p?: Partial<StaffProfile> | null, u?: Partial<User> | null): boolean {
  if (!p && !u) return false;

  const inactiveStatuses = [
    'deleted',
    'bin',
    'trash',
    'suspended',
    'deactivated',
    'rejected',
    'pending_profile',
    'under_review',
    'archived',
    'inactive',
  ];

  // 1. Validate User document if provided
  if (u) {
    if (u.role === 'director') return false;
    if (u.approved === false) return false;
    if (u.isDeleted === true || (u as any).deleted === true || u.deletedAt != null || u.isSuspended === true) return false;

    const uStatus = (u.status as string)?.toLowerCase();
    if (uStatus && inactiveStatuses.includes(uStatus)) return false;
  }

  // 2. Validate StaffProfile document if provided
  if (p) {
    if ((p as any).isDeleted === true || (p as any).deleted === true || p.deletedAt != null || (p as any).isSuspended === true) return false;

    const pStatus = p.status?.toLowerCase();
    const pApproval = p.approvalStatus?.toLowerCase();

    if ((pStatus && inactiveStatuses.includes(pStatus)) || (pApproval && inactiveStatuses.includes(pApproval))) {
      return false;
    }
  }

  return true;
}

/**
 * Single Canonical Hook for Active Staff Members in Janta Live Setu
 *
 * Rules:
 * 1. Synchronizes staffProfiles and users collections.
 * 2. Filters out any staff member with status/approvalStatus of deleted, bin, trash, suspended, deactivated, or unapproved.
 * 3. Excludes Director accounts from staff payroll/attendance/assignment lists.
 * 4. Deduplicates strictly by canonical UID (userId).
 */
export function useActiveStaff(): UseActiveStaffResult {
  const { data: rawStaffProfiles = [], loading: loadingStaff } = useRealtimeCollection<StaffProfile>('staffProfiles');
  const { data: rawUsers = [], loading: loadingUsers } = useRealtimeCollection<User>('users');

  const loading = loadingStaff || loadingUsers;

  const activeStaffMap = useMemo(() => {
    const usersMap = new Map<string, User>();
    rawUsers.forEach((u) => {
      if (u && u.uid) {
        usersMap.set(u.uid, u);
      }
    });

    const staffMap = new Map<string, StaffProfile>();

    // 1. Process staffProfiles collection
    rawStaffProfiles.forEach((p) => {
      if (!p) return;
      const uid = p.userId || p.id;
      if (!uid) return;

      const uDoc = usersMap.get(uid);

      // Exclude inactive / deleted / unapproved staff
      if (!isStaffMemberActive(p, uDoc)) {
        return;
      }

      if (!staffMap.has(uid)) {
        staffMap.set(uid, { ...p, id: uid, userId: uid });
      } else {
        const existing = staffMap.get(uid)!;
        staffMap.set(uid, {
          ...existing,
          ...p,
          id: uid,
          userId: uid,
          monthlySalary: p.monthlySalary || existing.monthlySalary || 0,
        });
      }
    });

    // 2. Process users collection (for active staff user docs not yet in staffProfiles)
    rawUsers.forEach((u) => {
      if (!u || !u.uid || u.role === 'director') return;
      const uid = u.uid;

      if (!isStaffMemberActive(null, u)) {
        return;
      }

      if (!staffMap.has(uid)) {
        staffMap.set(uid, {
          id: uid,
          userId: uid,
          idNumber: u.idNumber || `JLS-${uid.slice(-4)}`,
          fullName: u.name || u.email?.split('@')[0] || 'Staff Member',
          fatherName: '',
          motherName: '',
          email: u.email || '',
          contactNumber: u.phone || 'N/A',
          emergencyContact: '',
          address: u.address || '',
          designation: u.designation || 'Staff Member',
          workingArea: u.city || 'Head Office',
          monthlySalary: u.monthlySalary || 0,
          photoUrl: u.photoUrl || '',
          approvalStatus: (u.status as any) || 'approved',
          status: (u.status as any) || 'approved',
          joinedDate: u.createdAt ? u.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
          validUpto: '31 DEC 2028',
          createdById: 'director',
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        });
      }
    });

    return staffMap;
  }, [rawStaffProfiles, rawUsers]);

  const activeStaffList = useMemo(() => {
    return Array.from(activeStaffMap.values());
  }, [activeStaffMap]);

  return {
    activeStaffList,
    activeStaffMap,
    loading,
  };
}
