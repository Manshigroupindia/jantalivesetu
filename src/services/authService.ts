import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, UserRole } from '../types';
import { getNextUniqueStaffId } from '../utils/idGenerator';

export const DIRECTOR_FIXED_EMAIL = 'devenjhaofficial@gmail.com';

// Helper to create simple hash of PIN for client-side comparison fallback when Cloud Functions emulator/server is not active
export function simpleHashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `pin_hash_${Math.abs(hash)}`;
}

export async function loginWithCredentials(email: string, pass: string): Promise<{ uid: string; userDoc: User }> {
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  const uid = credential.user.uid;

  let userSnap = await getDoc(doc(db, 'users', uid));

  // If user document does not exist yet for Director (initial run), auto-create initial Director user doc
  if (!userSnap.exists() && email === DIRECTOR_FIXED_EMAIL) {
    const initialDirectorDoc: User = {
      uid,
      email: DIRECTOR_FIXED_EMAIL,
      role: 'director',
      approved: true,
      status: 'approved',
      firstLoginCompleted: false,
      name: 'Director',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', uid), initialDirectorDoc);
    userSnap = await getDoc(doc(db, 'users', uid));
  }

  if (!userSnap.exists()) {
    throw new Error('Account record not found in system database. Please contact Director.');
  }

  const userDoc = userSnap.data() as User;
  return { uid, userDoc };
}

export async function sendDirectorPasswordReset(): Promise<void> {
  await firebaseSendPasswordResetEmail(auth, DIRECTOR_FIXED_EMAIL);
}

export async function verifyUserPin(user: User, enteredPin: string): Promise<boolean> {
  if (enteredPin.length !== 4) return false;
  
  if (!user.pinHash) {
    // If PIN is not set yet, returns true for setup phase
    return true;
  }

  const targetHash = simpleHashPin(enteredPin);
  return user.pinHash === targetHash;
}

export async function setSecurityPin(uid: string, pin: string): Promise<void> {
  if (pin.length !== 4) throw new Error('PIN must be exactly 4 digits.');
  const pinHash = simpleHashPin(pin);
  await updateDoc(doc(db, 'users', uid), {
    pinHash,
    updatedAt: new Date().toISOString(),
  });
}

export async function createStaffAccountByDirector(data: {
  email: string;
  temporaryPass: string;
  pin: string;
  role: UserRole;
  designation: string;
  workingArea: string;
  monthlySalary: number;
  fullName: string;
  contactNumber: string;
}): Promise<{ uid: string }> {
  const normalizedEmail = data.email.trim().toLowerCase();

  // Check email uniqueness in Firestore users collection
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error(`This email (${normalizedEmail}) is already assigned to a staff account.`);
  }

  let uid: string;
  try {
    // Create user in Firebase Auth
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, data.temporaryPass);
    uid = credential.user.uid;
  } catch (authErr: any) {
    if (authErr.code === 'auth/email-already-in-use') {
      throw new Error(`This email (${normalizedEmail}) is already registered in Firebase Authentication.`);
    }
    throw authErr;
  }

  const pinHash = simpleHashPin(data.pin);

  const uniqueIdNumber = await getNextUniqueStaffId();

  const newUser: User = {
    uid,
    email: normalizedEmail,
    role: data.role,
    approved: false,
    status: 'pending_profile',
    firstLoginCompleted: false,
    pinHash,
    name: data.fullName,
    designation: data.designation,
    idNumber: uniqueIdNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', uid), newUser);

  // Create initial staffProfile doc with Director-configured monthlySalary
  await setDoc(doc(db, 'staffProfiles', uid), {
    id: uid,
    userId: uid,
    idNumber: uniqueIdNumber,
    fullName: data.fullName,
    email: normalizedEmail,
    contactNumber: data.contactNumber,
    designation: data.designation,
    workingArea: data.workingArea,
    monthlySalary: data.monthlySalary,
    approvalStatus: 'pending_profile',
    joinedDate: new Date().toISOString().split('T')[0],
    validUpto: '31 DEC 2028',
    createdById: auth.currentUser?.uid || 'director',
    createdAt: new Date().toISOString(),
  });

  return { uid };
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}
