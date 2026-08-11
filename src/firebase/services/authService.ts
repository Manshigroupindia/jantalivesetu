import { auth, db } from '../../firebase';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../../types';

const DIRECTOR_EMAIL = "devenjhaofficial@gmail.com";
export const SUPER_ADMIN_EMAIL = DIRECTOR_EMAIL;

export const loginDirector = async (password: string): Promise<UserProfile> => {
  if (!password || !password.trim()) {
    throw new Error("Director password is required.");
  }

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      DIRECTOR_EMAIL,
      password
    );
    const fbUser = credential.user;

    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    let profile: UserProfile;
    if (userDocSnap.exists()) {
      profile = {
        ...(userDocSnap.data() as UserProfile),
        uid: fbUser.uid,
        email: DIRECTOR_EMAIL,
        displayName: userDocSnap.data().displayName || 'Director / Super Admin',
        role: 'SUPER_ADMIN',
        status: 'Active',
      };
    } else {
      profile = {
        uid: fbUser.uid,
        email: DIRECTOR_EMAIL,
        displayName: 'Director / Super Admin',
        role: 'SUPER_ADMIN',
        status: 'Active',
        createdAt: new Date().toISOString(),
      };
    }

    await setDoc(userDocRef, profile, { merge: true });
    return profile;
  } catch (error: any) {
    console.error("Firebase Director authentication error:", error);

    switch (error?.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        throw new Error("Invalid Director password.");

      case "auth/user-not-found":
        throw new Error("Director account was not found.");

      case "auth/too-many-requests":
        throw new Error("Too many login attempts. Please try again later.");

      case "auth/api-key-not-valid":
      case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
        throw new Error(
          "Firebase API configuration is invalid. Verify the Firebase Console web app configuration."
        );

      default:
        throw new Error("Director login failed. Please try again.");
    }
  }
};

// Sign in Staff user with Email/ID and Password
export const loginStaff = async (emailOrId: string, password: string): Promise<UserProfile> => {
  if (!emailOrId.trim() || !password.trim()) {
    throw new Error('Please enter both Staff ID / Email and Password.');
  }

  let emailToUse = emailOrId.trim();
  if (!emailToUse.includes('@')) {
    emailToUse = `${emailToUse.toLowerCase()}@internal.company`;
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, emailToUse, password);
    const fbUser = credential.user;

    const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }

    const employeeDoc = await getDoc(doc(db, 'employees', fbUser.uid));
    if (employeeDoc.exists()) {
      const empData = employeeDoc.data();
      const staffProfile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email || emailToUse,
        displayName: empData.employeeName || 'Staff Member',
        role: empData.role || 'VIEW',
        employeeId: empData.employeeId,
        department: empData.department,
        status: empData.status || 'Active',
        permissions: empData.permissions,
        accessPinHash: empData.accessPinHash,
        accessPinEnabled: empData.accessPinEnabled,
        accessPinUpdatedAt: empData.accessPinUpdatedAt,
      };
      await setDoc(doc(db, 'users', fbUser.uid), staffProfile, { merge: true });
      return staffProfile;
    }

    const defaultStaffProfile: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email || emailToUse,
      displayName: fbUser.displayName || 'Staff Member',
      role: 'VIEW',
      status: 'Active',
    };
    await setDoc(doc(db, 'users', fbUser.uid), defaultStaffProfile, { merge: true });
    return defaultStaffProfile;
  } catch (error: any) {
    console.error("Firebase Staff authentication error:", error);

    switch (error?.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        throw new Error("Invalid staff password.");

      case "auth/user-not-found":
        throw new Error("Staff account was not found.");

      case "auth/too-many-requests":
        throw new Error("Too many login attempts. Please try again later.");

      case "auth/api-key-not-valid":
      case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
        throw new Error(
          "Firebase API configuration is invalid. Verify the Firebase Console web app configuration."
        );

      default:
        throw new Error("Staff login failed. Please try again.");
    }
  }
};

// Logout helper
export const logoutUser = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

// Load profile for currently authenticated user
export const fetchCurrentProfile = async (fbUser: FirebaseUser): Promise<UserProfile> => {
  const isDirector = fbUser.email?.toLowerCase() === DIRECTOR_EMAIL.toLowerCase();

  const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
  if (userDoc.exists()) {
    const data = userDoc.data() as UserProfile;
    if (isDirector) {
      return {
        ...data,
        uid: fbUser.uid,
        email: DIRECTOR_EMAIL,
        role: 'SUPER_ADMIN',
        displayName: data.displayName || 'Director / Super Admin',
      };
    }
    return data;
  }

  if (isDirector) {
    const directorProfile: UserProfile = {
      uid: fbUser.uid,
      email: DIRECTOR_EMAIL,
      displayName: 'Director / Super Admin',
      role: 'SUPER_ADMIN',
      status: 'Active',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', fbUser.uid), directorProfile, { merge: true });
    return directorProfile;
  }

  return {
    uid: fbUser.uid,
    email: fbUser.email || '',
    displayName: fbUser.displayName || 'Staff User',
    role: 'VIEW',
    status: 'Active',
  };
};
