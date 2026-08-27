import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, UserRole } from '../types';

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
  // Create user in Firebase Auth
  const credential = await createUserWithEmailAndPassword(auth, data.email, data.temporaryPass);
  const uid = credential.user.uid;

  const pinHash = simpleHashPin(data.pin);

  const newUser: User = {
    uid,
    email: data.email,
    role: data.role,
    approved: false,
    status: 'pending_profile',
    firstLoginCompleted: false,
    pinHash,
    name: data.fullName,
    designation: data.designation,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', uid), newUser);

  return { uid };
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}
