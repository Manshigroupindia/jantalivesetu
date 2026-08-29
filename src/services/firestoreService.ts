import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  limit,
  onSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  User,
  StaffProfile,
  StaffApprovalStatus,
  CompanySettings,
  AttendanceRecord,
  WorkAssignment,
  ChatMessage,
  ExpenseItem,
  TeaSnackLog,
  WaterRecord,
  ElectricityRecord,
  OfficeRentRecord,
  CleaningRecord,
  SalaryRecord,
  Notice,
  CompanyHoliday,
  ClientRecord
} from '../types';
import { getNextUniqueStaffId } from '../utils/idGenerator';

export function subscribeToCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  onUpdate: (data: T[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
      onUpdate(items);
    },
    (err) => {
      console.error(`Error subscribing to ${collectionName}:`, err);
      if (onError) onError(err);
    }
  );
}

// User Services
export async function getUserDoc(uid: string): Promise<User | null> {
  const docRef = doc(db, 'users', uid);
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as User) : null;
}

export async function setUserDoc(uid: string, data: Partial<User>): Promise<void> {
  const docRef = doc(db, 'users', uid);
  await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

// Company Settings
export async function getCompanySettings(): Promise<CompanySettings | null> {
  const docRef = doc(db, 'companySettings', 'default');
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as CompanySettings) : null;
}

export async function setCompanySettings(settings: Partial<CompanySettings>): Promise<void> {
  const docRef = doc(db, 'companySettings', 'default');
  await setDoc(docRef, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getStaffProfile(profileId: string): Promise<StaffProfile | null> {
  const docRef = doc(db, 'staffProfiles', profileId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as StaffProfile;
  }
  return getStaffProfileByUserId(profileId);
}

export const getStaffProfileById = getStaffProfile;

export async function getStaffProfileByUserId(userId: string): Promise<StaffProfile | null> {
  const q = query(collection(db, 'staffProfiles'), where('userId', '==', userId), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as StaffProfile;
  }
  return null;
}

export async function saveStaffProfile(profile: Partial<StaffProfile>): Promise<string> {
  const targetId = profile.userId || profile.id;
  if (!targetId) {
    throw new Error('Cannot save staff profile: missing canonical userId / profile.id');
  }

  const docRef = doc(db, 'staffProfiles', targetId);
  await setDoc(
    docRef,
    {
      id: targetId,
      userId: targetId,
      ...profile,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // If there was an old document with profile.id != targetId, clean it up to maintain single canonical UID identity
  if (profile.id && profile.id !== targetId) {
    try {
      await deleteDoc(doc(db, 'staffProfiles', profile.id));
    } catch (err) {
      console.warn('Could not remove legacy duplicate staff profile doc:', err);
    }
  }

  return targetId;
}

export async function softDeleteStaffProfile(userId: string, deletedBy: string, reason?: string): Promise<void> {
  if (!userId) {
    throw new Error('Staff ID is required for deletion.');
  }
  if (userId === deletedBy) {
    throw new Error('Director account cannot be deleted from Staff Management.');
  }

  const staffProfile = await getStaffProfile(userId);
  const userDocSnap = await getDoc(doc(db, 'users', userId));
  const userDocData = userDocSnap.exists() ? (userDocSnap.data() as User) : null;

  if (userDocData?.role === 'director') {
    throw new Error('Director account cannot be deleted from Staff Management.');
  }

  const isAlreadyDeleted =
    staffProfile?.approvalStatus?.toLowerCase() === 'deleted' ||
    userDocData?.status?.toLowerCase() === 'deleted';

  if (isAlreadyDeleted) {
    throw new Error('This staff account is already in the Bin.');
  }

  const currentStatus = staffProfile?.approvalStatus || userDocData?.status || 'approved';
  const now = new Date().toISOString();

  // 1. Update users/{userId} document in Firestore
  await setDoc(
    doc(db, 'users', userId),
    {
      status: 'deleted',
      approved: false,
      deletedAt: now,
      deletedBy,
      previousStatus: currentStatus,
      deletionReason: reason || '',
      updatedAt: now,
    },
    { merge: true }
  );

  // 2. Update staffProfiles/{userId} document in Firestore (creating canonical doc if missing)
  const canonicalIdNumber = staffProfile?.idNumber || userDocData?.idNumber || (await getNextUniqueStaffId());

  await saveStaffProfile({
    ...(staffProfile || {}),
    id: userId,
    userId,
    idNumber: canonicalIdNumber,
    fullName: staffProfile?.fullName || userDocData?.name || userDocData?.email?.split('@')[0] || 'Staff Member',
    email: staffProfile?.email || userDocData?.email || '',
    contactNumber: staffProfile?.contactNumber || userDocData?.phone || 'N/A',
    designation: staffProfile?.designation || userDocData?.designation || 'Staff Member',
    workingArea: staffProfile?.workingArea || userDocData?.city || 'Head Office',
    monthlySalary: staffProfile?.monthlySalary || userDocData?.monthlySalary || 0,
    photoUrl: staffProfile?.photoUrl || userDocData?.photoUrl || '',
    approvalStatus: 'deleted',
    status: 'deleted',
    deletedAt: now,
    deletedBy,
    previousStatus: currentStatus,
    deletionReason: reason || '',
  });

  // 3. Clean up any orphan profile documents matching email or userId
  const targetEmail = (staffProfile?.email || userDocData?.email)?.trim().toLowerCase();
  if (targetEmail) {
    try {
      const q = query(collection(db, 'staffProfiles'), where('email', '==', targetEmail));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (d.id !== userId) {
          await deleteDoc(doc(db, 'staffProfiles', d.id));
        }
      }
    } catch (err) {
      console.warn('Error cleaning up orphan profile docs:', err);
    }
  }
}

/**
 * Normalizes staff records across users and staffProfiles collections in Firestore.
 * Ensures single canonical records per staff member, synchronizes deleted status,
 * cleans up orphan documents, and resolves duplicate Staff IDs automatically.
 */
export async function normalizeStaffData(): Promise<void> {
  try {
    const [usersSnap, staffProfilesSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'staffProfiles')),
    ]);

    const usersMap = new Map<string, User>();
    usersSnap.docs.forEach((d) => {
      usersMap.set(d.id, { uid: d.id, ...d.data() } as User);
    });

    const profilesByEmail = new Map<string, StaffProfile[]>();
    const profilesByUid = new Map<string, StaffProfile[]>();

    staffProfilesSnap.docs.forEach((d) => {
      const p = { id: d.id, ...d.data() } as StaffProfile;
      const email = p.email?.trim().toLowerCase();
      if (email) {
        if (!profilesByEmail.has(email)) profilesByEmail.set(email, []);
        profilesByEmail.get(email)!.push(p);
      }
      const uid = p.userId || (usersMap.has(d.id) ? d.id : undefined);
      if (uid) {
        if (!profilesByUid.has(uid)) profilesByUid.set(uid, []);
        profilesByUid.get(uid)!.push(p);
      }
    });

    // 1. Synchronize users & staffProfiles status and consolidate orphan docs
    for (const [uid, user] of usersMap.entries()) {
      if (user.role === 'director') continue;
      const userEmail = user.email?.trim().toLowerCase();
      const isDeletedInUser = user.status?.toLowerCase() === 'deleted';

      const matchingProfiles = [
        ...(profilesByUid.get(uid) || []),
        ...(userEmail ? profilesByEmail.get(userEmail) || [] : []),
      ];

      const uniqueProfiles = Array.from(new Map(matchingProfiles.map((p) => [p.id, p])).values());
      const isDeletedInAnyProfile = uniqueProfiles.some(
        (p) => p.approvalStatus?.toLowerCase() === 'deleted' || p.status?.toLowerCase() === 'deleted'
      );

      const shouldBeDeleted = isDeletedInUser || isDeletedInAnyProfile;
      const targetStatus: StaffApprovalStatus = shouldBeDeleted ? 'deleted' : ((user.status as StaffApprovalStatus) || 'approved');

      if (shouldBeDeleted && user.status?.toLowerCase() !== 'deleted') {
        await setDoc(doc(db, 'users', uid), { status: 'deleted', approved: false, updatedAt: new Date().toISOString() }, { merge: true });
      }

      let canonicalProfile = uniqueProfiles.find((p) => p.id === uid);
      if (!canonicalProfile && uniqueProfiles.length > 0) {
        const source = uniqueProfiles[0];
        canonicalProfile = {
          ...source,
          id: uid,
          userId: uid,
          idNumber: user.idNumber || source.idNumber || `JLS-${uid.slice(-4)}`,
          approvalStatus: targetStatus,
          status: targetStatus,
        };
        await setDoc(doc(db, 'staffProfiles', uid), canonicalProfile, { merge: true });
      } else if (canonicalProfile) {
        if (canonicalProfile.approvalStatus?.toLowerCase() !== targetStatus || canonicalProfile.status?.toLowerCase() !== targetStatus) {
          await setDoc(doc(db, 'staffProfiles', uid), { approvalStatus: targetStatus, status: targetStatus, updatedAt: new Date().toISOString() }, { merge: true });
        }
      }

      for (const orphan of uniqueProfiles) {
        if (orphan.id !== uid) {
          await deleteDoc(doc(db, 'staffProfiles', orphan.id)).catch(() => {});
        }
      }
    }

    // 2. Fix duplicate Staff IDs (e.g., Rohit & Kumar Anubhav both having JL-STAFF-2026-0001)
    const assignedStaffIds = new Map<string, string>(); // idNumber -> uid

    for (const [uid, user] of usersMap.entries()) {
      if (user.role === 'director') continue;

      const profileSnap = await getDoc(doc(db, 'staffProfiles', uid));
      const profileData = profileSnap.exists() ? (profileSnap.data() as StaffProfile) : null;
      const currentIdNumber = profileData?.idNumber || user.idNumber;

      if (currentIdNumber && currentIdNumber.startsWith('JL-STAFF-')) {
        if (assignedStaffIds.has(currentIdNumber) && assignedStaffIds.get(currentIdNumber) !== uid) {
          // Duplicate Staff ID collision detected! Reassign second user a new unique collision-safe Staff ID
          const newUniqueId = await getNextUniqueStaffId();
          await setDoc(doc(db, 'users', uid), { idNumber: newUniqueId }, { merge: true });
          if (profileSnap.exists()) {
            await setDoc(doc(db, 'staffProfiles', uid), { idNumber: newUniqueId }, { merge: true });
          }
          assignedStaffIds.set(newUniqueId, uid);
        } else {
          assignedStaffIds.set(currentIdNumber, uid);
        }
      }
    }
  } catch (err) {
    console.error('Error in normalizeStaffData:', err);
  }
}

export async function restoreStaffProfile(userId: string, restoredBy: string): Promise<StaffApprovalStatus> {
  if (!userId) {
    throw new Error('Staff ID is required for restoration.');
  }

  const staffProfile = await getStaffProfile(userId);
  const userDocSnap = await getDoc(doc(db, 'users', userId));
  const userDocData = userDocSnap.exists() ? (userDocSnap.data() as User) : null;

  const prevStatus =
    (staffProfile?.previousStatus as StaffApprovalStatus) ||
    (userDocData?.previousStatus as StaffApprovalStatus) ||
    'approved';

  const isApproved = prevStatus === 'approved' || prevStatus === 'active';
  const restoredStatus = isApproved ? 'approved' : prevStatus;
  const now = new Date().toISOString();

  // 1. Restore users/{userId}
  await setDoc(
    doc(db, 'users', userId),
    {
      status: restoredStatus,
      approved: isApproved,
      deletedAt: null,
      deletedBy: null,
      previousStatus: null,
      deletionReason: null,
      updatedAt: now,
    },
    { merge: true }
  );

  // 2. Restore staffProfiles/{userId}
  if (staffProfile) {
    await saveStaffProfile({
      ...staffProfile,
      approvalStatus: restoredStatus,
      status: restoredStatus,
      deletedAt: undefined,
      deletedBy: undefined,
      previousStatus: undefined,
      deletionReason: undefined,
    });
  } else if (userDocData) {
    await saveStaffProfile({
      id: userId,
      userId,
      idNumber: userDocData.idNumber || `JLS-${userId.slice(-4)}`,
      fullName: userDocData.name || userDocData.email?.split('@')[0] || 'Staff Member',
      fatherName: '',
      motherName: '',
      email: userDocData.email || '',
      contactNumber: userDocData.phone || 'N/A',
      emergencyContact: '',
      address: userDocData.address || '',
      designation: userDocData.designation || 'Staff Member',
      workingArea: userDocData.city || 'Head Office',
      monthlySalary: userDocData.monthlySalary || 0,
      photoUrl: userDocData.photoUrl || '',
      approvalStatus: restoredStatus,
      status: restoredStatus,
      joinedDate: userDocData.createdAt ? userDocData.createdAt.split('T')[0] : now.split('T')[0],
      validUpto: '31 DEC 2028',
      createdById: restoredBy,
      createdAt: userDocData.createdAt || now,
    });
  }

  return restoredStatus;
}

export async function deleteStaffProfile(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('Staff ID is required for permanent deletion.');
  }

  // Delete all staff profiles matching userId
  const q = query(collection(db, 'staffProfiles'), where('userId', '==', userId));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }

  await deleteDoc(doc(db, 'staffProfiles', userId)).catch(() => {});
  await deleteDoc(doc(db, 'users', userId)).catch(() => {});
}

// Attendance
export async function recordDutyCheckIn(attendance: Omit<AttendanceRecord, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'attendance'), attendance);
  return docRef.id;
}

export async function recordDutyCheckOut(
  attendanceId: string,
  checkOutTime: string,
  checkOutLocation: any,
  totalMinutes: number
): Promise<void> {
  const docRef = doc(db, 'attendance', attendanceId);
  await updateDoc(docRef, {
    checkOut: checkOutTime,
    checkOutLocation,
    totalMinutes,
    status: 'completed',
    updatedAt: new Date().toISOString(),
  });
}

export async function createManualAttendance(data: {
  userId: string;
  userName: string;
  userDesignation: string;
  date: string;
  checkIn: string;
  checkOut: string;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  manualReason: string;
  createdById: string;
  createdByName: string;
}): Promise<string> {
  // Check duplicate attendance for date
  const q = query(
    collection(db, 'attendance'),
    where('userId', '==', data.userId),
    where('date', '==', data.date)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error('Attendance already exists for this date.');
  }

  let totalMinutes = 480;
  try {
    const parseTime = (tStr: string) => {
      const match = tStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };
    const startM = parseTime(data.checkIn);
    const endM = parseTime(data.checkOut);
    if (endM > startM) totalMinutes = endM - startM;
  } catch (e) {
    // fallback
  }

  const locationObj = {
    latitude: data.latitude || 0,
    longitude: data.longitude || 0,
    accuracy: 0,
    capturedAt: new Date().toISOString(),
  };

  const newDoc: Omit<AttendanceRecord, 'id'> = {
    userId: data.userId,
    userName: data.userName,
    userDesignation: data.userDesignation,
    date: data.date,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    checkInLocation: locationObj,
    checkOutLocation: locationObj,
    totalMinutes,
    status: 'completed',
    attendanceType: 'MANUAL',
    manualReason: data.manualReason,
    createdById: data.createdById,
    createdByName: data.createdByName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, 'attendance'), newDoc);
  return docRef.id;
}

export async function autoCloseStaleAttendance(records: AttendanceRecord[]): Promise<void> {
  const nowIST = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
  const currentHourIST = parseInt(
    new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit' }),
    10
  );

  for (const record of records) {
    if (!record.checkIn || record.checkOut) continue;

    const recordDate = record.date;
    const isPastDate = recordDate < nowIST;
    const isTodayAfter9PM = recordDate === nowIST && currentHourIST >= 21;

    if (isPastDate || isTodayAfter9PM) {
      try {
        const docRef = doc(db, 'attendance', record.id);
        await updateDoc(docRef, {
          checkOut: '09:00 PM',
          checkOutLocation: {
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            capturedAt: new Date().toISOString(),
            address: 'Automatic Closed',
          },
          status: 'auto_closed',
          checkoutType: 'AUTO',
          isAutoClosed: true,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Failed to auto-close stale attendance:', record.id, e);
      }
    }
  }
}

// Work Assignments
export async function createWorkAssignment(work: Omit<WorkAssignment, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'workAssignments'), work);
  return docRef.id;
}

export async function updateWorkAssignmentStatus(
  workId: string,
  status: WorkAssignment['status'],
  staffProofUrl?: string,
  staffNotes?: string
): Promise<void> {
  const docRef = doc(db, 'workAssignments', workId);
  const updates: any = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (staffProofUrl !== undefined) updates.staffProofUrl = staffProofUrl;
  if (staffNotes !== undefined) updates.staffNotes = staffNotes;
  if (status === 'completed') updates.completedAt = new Date().toISOString();

  await updateDoc(docRef, updates);
}

export const updateWorkStatus = updateWorkAssignmentStatus;

// Chat
export async function sendChatMessage(
  arg1: string | Omit<ChatMessage, 'id'>,
  arg2?: Omit<ChatMessage, 'id'>
): Promise<void> {
  let message: Omit<ChatMessage, 'id'>;
  if (typeof arg1 === 'string' && arg2) {
    message = arg2;
  } else {
    message = arg1 as Omit<ChatMessage, 'id'>;
  }
  const msgRef = collection(db, 'chatMessages');
  await addDoc(msgRef, message);
}

// Expenses
export async function createExpenseItem(expense: Omit<ExpenseItem, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'expenses'), expense);
  return docRef.id;
}

export const createExpense = createExpenseItem;

export async function updateExpenseStatus(
  expenseId: string,
  status: ExpenseItem['status'],
  actionBy?: string,
  notes?: string
): Promise<void> {
  const docRef = doc(db, 'expenses', expenseId);
  const updates: any = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (actionBy) updates.actionBy = actionBy;
  if (notes) updates.notes = notes;
  await updateDoc(docRef, updates);
}

// Tea & Snacks
export async function createTeaSnackLog(log: Omit<TeaSnackLog, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'teaSnackLogs'), log);
  return docRef.id;
}

export async function updateTeaSnackLog(
  logId: string,
  updates: Partial<TeaSnackLog>
): Promise<void> {
  const docRef = doc(db, 'teaSnackLogs', logId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTeaSnackLog(logId: string): Promise<void> {
  const docRef = doc(db, 'teaSnackLogs', logId);
  await deleteDoc(docRef);
}

// Water Records
export async function createWaterRecord(record: Omit<WaterRecord, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'waterRecords'), record);
  return docRef.id;
}

export const saveWaterRecord = createWaterRecord;

// Electricity Records
export async function createElectricityRecord(record: Omit<ElectricityRecord, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'electricityRecords'), record);
  return docRef.id;
}

export const saveElectricityBill = createElectricityRecord;

// Office Rent
export async function createOfficeRentRecord(record: Omit<OfficeRentRecord, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'officeRentRecords'), record);
  return docRef.id;
}

export const saveOfficeRent = createOfficeRentRecord;

// Housekeeping & Sanitation
export async function createCleaningRecord(record: Omit<CleaningRecord, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'cleaningRecords'), record);
  return docRef.id;
}

export const saveCleaningRecord = createCleaningRecord;

// Salary Records
export async function saveSalaryRecord(record: Omit<SalaryRecord, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'salaryRecords'), record);
  return docRef.id;
}

// Notices & Holidays
export async function createNotice(notice: Omit<Notice, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'notices'), notice);
  return docRef.id;
}

export async function deleteNotice(id: string): Promise<void> {
  const docRef = doc(db, 'notices', id);
  await deleteDoc(docRef);
}

export async function createCompanyHoliday(holiday: Omit<CompanyHoliday, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'holidays'), holiday);
  return docRef.id;
}

export async function deleteCompanyHoliday(id: string): Promise<void> {
  const docRef = doc(db, 'holidays', id);
  await deleteDoc(docRef);
}

// Client Records
export async function createClientRecord(client: Omit<ClientRecord, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'clientRecords'), client);
  return docRef.id;
}

// General Deletion Helpers
export async function softDeleteRecord(collectionName: string, id: string): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, { isDeleted: true, updatedAt: new Date().toISOString() });
}

export async function hardDeleteRecord(collectionName: string, id: string): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}
