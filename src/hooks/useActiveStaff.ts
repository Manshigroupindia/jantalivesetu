import { useMemo } from 'react';
import { useRealtimeCollection } from './useRealtime';
import { StaffProfile, User } from '../types';

export interface UseActiveStaffResult {
  activeStaffList: StaffProfile[];
  activeStaffMap: Map<string, StaffProfile>;
  loading: boolean;
}

/**
 * Single Canonical Hook for Active Staff Members in Janta Live Setu
 *
 * Rules:
 * 1. Synchronizes staffProfiles and users collections.
 * 2. Filters out any staff member with approvalStatus === 'deleted', status === 'deleted', isDeleted === true, or deletedAt != null.
 * 3. Filters out any user where status === 'deleted' or approved === false.
 * 4. Excludes Director accounts from staff payroll/attendance lists.
 * 5. Deduplicates strictly by canonical UID (userId) so no duplicate profiles exist for the same staff member.
 */
export function useActiveStaff(): UseActiveStaffResult {
  const { data: rawStaffProfiles = [], loading: loadingStaff } = useRealtimeCollection<StaffProfile>('staffProfiles');
  const { data: rawUsers = [], loading: loadingUsers } = useRealtimeCollection<User>('users');

  const loading = loadingStaff || loadingUsers;

  const usersMap = new Map<string, User>();
  rawUsers.forEach((u) => {
    if (u && u.uid) {
      usersMap.set(u.uid, u);
    }
  });

  const activeStaffMap = new Map<string, StaffProfile>();

  const isDeleted = (statusStr?: string, approvalStr?: string, isDelFlag?: boolean, deletedAtVal?: any) => {
    const s = statusStr?.toLowerCase();
    const a = approvalStr?.toLowerCase();
    return s === 'deleted' || a === 'deleted' || isDelFlag === true || deletedAtVal != null;
  };

  // 1. Process staffProfiles collection
  rawStaffProfiles.forEach((p) => {
    if (!p) return;
    const uid = p.userId || p.id;
    if (!uid) return;

    // Filter out deleted staff profiles
    if (isDeleted(p.status, p.approvalStatus, (p as any).isDeleted, p.deletedAt)) {
      return;
    }

    // Filter out if user document indicates deleted or unapproved or director
    const uDoc = usersMap.get(uid);
    if (uDoc) {
      if (uDoc.role === 'director') return;
      if (isDeleted(uDoc.status, undefined, undefined, uDoc.deletedAt) || uDoc.approved === false) {
        return;
      }
    }

    if (!activeStaffMap.has(uid)) {
      activeStaffMap.set(uid, { ...p, id: uid, userId: uid });
    } else {
      const existing = activeStaffMap.get(uid)!;
      activeStaffMap.set(uid, {
        ...existing,
        ...p,
        id: uid,
        userId: uid,
        monthlySalary: p.monthlySalary || existing.monthlySalary || 0,
      });
    }
  });

  // 2. Process users collection (for any active staff user doc not yet in staffProfiles)
  rawUsers.forEach((u) => {
    if (!u || !u.uid || u.role === 'director') return;
    const uid = u.uid;

    if (isDeleted(u.status, undefined, undefined, u.deletedAt) || u.approved === false) {
      return;
    }

    if (!activeStaffMap.has(uid)) {
      activeStaffMap.set(uid, {
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

  return useMemo(() => {
    const activeStaffList = Array.from(activeStaffMap.values());
    return {
      activeStaffList,
      activeStaffMap,
      loading,
    };
  }, [rawStaffProfiles, rawUsers, loading]);
}
