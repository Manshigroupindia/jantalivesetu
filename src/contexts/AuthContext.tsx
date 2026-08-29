import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { User, StaffProfile } from '../types';
import { getStaffProfileByUserId } from '../services/firestoreService';
import { signOutUser } from '../services/authService';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userDoc: User | null;
  staffProfile: StaffProfile | null;
  loading: boolean;
  error: string | null;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userDoc: null,
  staffProfile: null,
  loading: true,
  error: null,
  refreshUserDoc: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    let unsubStaffDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setError(null);

      if (fbUser) {
        // Listen to live updates of user document
        const userRef = doc(db, 'users', fbUser.uid);
        unsubUserDoc = onSnapshot(
          userRef,
          async (snap) => {
            if (snap.exists()) {
              const uData = snap.data() as User;
              if (uData.status === 'deleted') {
                setUserDoc(null);
                setStaffProfile(null);
                setLoading(false);
                await signOutUser();
                return;
              }
              setUserDoc(uData);

              // Fetch corresponding staff profile
              try {
                const pData = await getStaffProfileByUserId(fbUser.uid);
                if (pData?.approvalStatus === 'deleted') {
                  setUserDoc(null);
                  setStaffProfile(null);
                  setLoading(false);
                  await signOutUser();
                  return;
                }
                setStaffProfile(pData);
              } catch (err) {
                console.error('Error fetching staff profile:', err);
              }
            } else {
              setUserDoc(null);
              setStaffProfile(null);
            }
            setLoading(false);
          },
          (err) => {
            console.error('User doc snapshot error:', err);
            setLoading(false);
          }
        );

        // Listen to live updates of staff profile document
        const staffRef = doc(db, 'staffProfiles', fbUser.uid);
        unsubStaffDoc = onSnapshot(staffRef, async (staffSnap) => {
          if (staffSnap.exists()) {
            const pData = staffSnap.data() as StaffProfile;
            if (pData.approvalStatus === 'deleted') {
              setUserDoc(null);
              setStaffProfile(null);
              setLoading(false);
              await signOutUser();
              return;
            }
            setStaffProfile(pData);
          }
        });
      } else {
        setUserDoc(null);
        setStaffProfile(null);
        setLoading(false);
        if (unsubUserDoc) unsubUserDoc();
        if (unsubStaffDoc) unsubStaffDoc();
      }
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
      if (unsubStaffDoc) unsubStaffDoc();
    };
  }, []);

  const refreshUserDoc = async () => {
    if (!firebaseUser) return;
    try {
      const pData = await getStaffProfileByUserId(firebaseUser.uid);
      setStaffProfile(pData);
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userDoc,
        staffProfile,
        loading,
        error,
        refreshUserDoc,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
