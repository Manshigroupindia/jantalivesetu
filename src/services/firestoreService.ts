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
  return targetId;
}

export async function softDeleteStaffProfile(userId: string, deletedBy: string, reason?: string): Promise<void> {
  const staffProfile = await getStaffProfile(userId);
  const userDocSnap = await getDoc(doc(db, 'users', userId));
  const userDocData = userDocSnap.exists() ? (userDocSnap.data() as User) : null;

  const currentStatus = staffProfile?.approvalStatus || userDocData?.status || 'approved';
  const now = new Date().toISOString();

  await updateDoc(doc(db, 'users', userId), {
    status: 'deleted',
    approved: false,
    deletedAt: now,
    deletedBy,
    previousStatus: currentStatus,
    deletionReason: reason || '',
    updatedAt: now,
  });

  if (staffProfile) {
    await saveStaffProfile({
      ...staffProfile,
      approvalStatus: 'deleted',
      deletedAt: now,
      deletedBy,
      previousStatus: currentStatus,
      deletionReason: reason || '',
    });
  }
}

export async function restoreStaffProfile(userId: string, restoredBy: string): Promise<StaffApprovalStatus> {
  const staffProfile = await getStaffProfile(userId);
  const userDocSnap = await getDoc(doc(db, 'users', userId));
  const userDocData = userDocSnap.exists() ? (userDocSnap.data() as User) : null;

  const prevStatus = staffProfile?.previousStatus || userDocData?.previousStatus || 'approved';
  const isApproved = (prevStatus === 'approved' || prevStatus === 'active');
  const now = new Date().toISOString();

  await updateDoc(doc(db, 'users', userId), {
    status: prevStatus,
    approved: isApproved,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    updatedAt: now,
  });

  if (staffProfile) {
    await saveStaffProfile({
      ...staffProfile,
      approvalStatus: prevStatus,
      deletedAt: undefined,
      deletedBy: undefined,
      deletionReason: undefined,
    });
  }

  return prevStatus;
}

export async function deleteStaffProfile(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'staffProfiles', userId));
  await deleteDoc(doc(db, 'users', userId));
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
    updatedAt: new Date().toISOString(),
  });
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
