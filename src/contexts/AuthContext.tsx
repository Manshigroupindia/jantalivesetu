import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole } from '../types';
import { 
  loginDirector as serviceLoginDirector, 
  loginStaff as serviceLoginStaff, 
  logoutUser, 
  fetchCurrentProfile,
  SUPER_ADMIN_EMAIL 
} from '../firebase/services/authService';
import { logAuditEvent } from '../firebase/services/auditService';
import { 
  verifyPinHash, 
  checkPinRateLimit, 
  recordFailedPinAttempt, 
  resetPinRateLimit 
} from '../utils/security';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  isSuperAdmin: boolean;
  isManage: boolean;
  isView: boolean;
  firebaseAuthenticated: boolean;
  securityVerified: boolean;
  sessionLocked: boolean;
  loginDirector: (password: string) => Promise<void>;
  loginStaff: (emailOrId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  verifySecurityPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  lockSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 30 minutes of inactivity timeout
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Security Verification State (Step 2)
  const [securityVerified, setSecurityVerified] = useState<boolean>(false);
  const [sessionLocked, setSessionLocked] = useState<boolean>(false);

  const role: UserRole = profile?.role || 'VIEW';
  const isSuperAdmin = role === 'SUPER_ADMIN' || currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isManage = isSuperAdmin || role === 'MANAGE';
  const isView = role === 'VIEW';
  const firebaseAuthenticated = Boolean(currentUser);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  const getSessionKey = (uid: string) => `sec_sess_token_${uid}`;

  // Session Token helper for tab refresh validation
  const validateExistingSessionToken = (uid: string): boolean => {
    try {
      const storedStr = sessionStorage.getItem(getSessionKey(uid));
      if (!storedStr) return false;
      const data = JSON.parse(storedStr);
      if (data.uid === uid && data.ts && (Date.now() - data.ts < INACTIVITY_TIMEOUT_MS)) {
        return true;
      }
    } catch {
      // Ignore
    }
    return false;
  };

  const setSessionToken = (uid: string) => {
    try {
      sessionStorage.setItem(
        getSessionKey(uid),
        JSON.stringify({ uid, ts: Date.now() })
      );
    } catch {
      // Ignore
    }
  };

  const clearSessionToken = (uid?: string) => {
    try {
      if (uid) {
        sessionStorage.removeItem(getSessionKey(uid));
      } else if (currentUser) {
        sessionStorage.removeItem(getSessionKey(currentUser.uid));
      }
    } catch {
      // Ignore
    }
  };

  const resetInactivityTimer = () => {
    lastActiveRef.current = Date.now();
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    if (currentUser && securityVerified) {
      inactivityTimerRef.current = setTimeout(() => {
        // Lock session due to 30-minute inactivity
        lockSession();
      }, INACTIVITY_TIMEOUT_MS);
    }
  };

  // Activity listeners for 30-min inactivity timeout
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    events.forEach(evt => window.addEventListener(evt, handleUserActivity));
    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [currentUser, securityVerified]);

  const loadProfile = async (fbUser: FirebaseUser) => {
    try {
      const p = await fetchCurrentProfile(fbUser);
      setProfile(p);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  useEffect(() => {
    let unsubProfileListener: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setCurrentUser(fbUser);

      if (fbUser) {
        // Initial profile fetch
        await loadProfile(fbUser);

        // Check if existing browser session token is valid for page refresh
        const isValidSess = validateExistingSessionToken(fbUser.uid);
        setSecurityVerified(isValidSess);

        // Subscribe to real-time changes on /users/{uid}
        const userDocRef = doc(db, 'users', fbUser.uid);
        unsubProfileListener = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            const isDirector = fbUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
            setProfile({
              ...data,
              uid: fbUser.uid,
              email: fbUser.email || data.email,
              role: isDirector ? 'SUPER_ADMIN' : (data.role || 'VIEW'),
            });
          }
        }, (err) => {
          console.error('Profile realtime subscription error:', err);
        });
      } else {
        if (unsubProfileListener) {
          unsubProfileListener();
          unsubProfileListener = null;
        }
        setProfile(null);
        setSecurityVerified(false);
        setSessionLocked(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfileListener) {
        unsubProfileListener();
      }
    };
  }, []);

  const loginDirector = async (password: string) => {
    setLoading(true);
    try {
      const p = await serviceLoginDirector(password);
      setProfile(p);
      // Require Step 2 Verification after Firebase Auth
      setSecurityVerified(false);
      setSessionLocked(false);
      clearSessionToken(p.uid);
      await logAuditEvent(p.uid, p.displayName, p.role, 'LOGIN', 'auth', p.uid, 'Director Firebase Authentication successful (Step 1)');
    } finally {
      setLoading(false);
    }
  };

  const loginStaff = async (emailOrId: string, password: string) => {
    setLoading(true);
    try {
      const p = await serviceLoginStaff(emailOrId, password);
      setProfile(p);
      // Require Step 2 Verification after Firebase Auth
      setSecurityVerified(false);
      setSessionLocked(false);
      clearSessionToken(p.uid);
      await logAuditEvent(p.uid, p.displayName, p.role, 'LOGIN', 'auth', p.uid, 'Staff Firebase Authentication successful (Step 1)');
    } finally {
      setLoading(false);
    }
  };

  const verifySecurityPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || !profile) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const rateCheck = checkPinRateLimit(currentUser.uid);
    if (rateCheck.isLocked) {
      return { 
        success: false, 
        error: `Too many failed attempts. Try again in ${rateCheck.remainingSeconds} seconds.` 
      };
    }

    const storedHash = profile.accessPinHash;
    if (!storedHash) {
      return { success: false, error: 'Access PIN is not configured yet.' };
    }

    const isValid = verifyPinHash(pin, storedHash, profile.uid || currentUser.uid);

    if (isValid) {
      resetPinRateLimit(currentUser.uid);
      setSecurityVerified(true);
      setSessionLocked(false);
      setSessionToken(currentUser.uid);
      resetInactivityTimer();

      await logAuditEvent(
        profile.uid,
        profile.displayName,
        profile.role,
        'ACCESS_PIN_VERIFICATION_SUCCESS',
        'auth',
        currentUser.uid,
        '2-Step Access PIN Verification completed successfully'
      );

      return { success: true };
    } else {
      const failedRes = recordFailedPinAttempt(currentUser.uid);
      await logAuditEvent(
        profile.uid,
        profile.displayName,
        profile.role,
        'ACCESS_PIN_VERIFICATION_FAILED',
        'auth',
        currentUser.uid,
        'Failed 2-Step Access PIN verification attempt'
      );

      if (failedRes.isLocked) {
        return { 
          success: false, 
          error: `Too many failed attempts. Try again in ${failedRes.remainingSeconds} seconds.` 
        };
      }
      return { success: false, error: 'Incorrect Access PIN.' };
    }
  };

  const lockSession = () => {
    setSecurityVerified(false);
    setSessionLocked(true);
    if (currentUser) {
      clearSessionToken(currentUser.uid);
    }
  };

  const logout = async () => {
    if (profile) {
      await logAuditEvent(profile.uid, profile.displayName, profile.role, 'LOGOUT', 'auth', profile.uid, 'User logged out');
    }
    clearSessionToken(currentUser?.uid);
    await logoutUser();
    setProfile(null);
    setCurrentUser(null);
    setSecurityVerified(false);
    setSessionLocked(false);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await loadProfile(currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        role: isSuperAdmin ? 'SUPER_ADMIN' : role,
        loading,
        isSuperAdmin,
        isManage,
        isView,
        firebaseAuthenticated,
        securityVerified,
        sessionLocked,
        loginDirector,
        loginStaff,
        logout,
        refreshProfile,
        verifySecurityPin,
        lockSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
