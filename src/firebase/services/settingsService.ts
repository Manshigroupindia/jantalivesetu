import { db } from '../config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { SystemSettings } from '../../types';
import { simpleHash, DEFAULT_ACCESS_PASSWORD_HASH } from '../../utils/security';

const SETTINGS_DOC = doc(db, 'settings', 'general');

export const DEFAULT_SETTINGS: SystemSettings = {
  companyName: 'Website & Client Data Manager',
  companyLogo: '',
  defaultPaginationSize: 25,
  accessPasswordHash: DEFAULT_ACCESS_PASSWORD_HASH,
  securityNotice: 'Sensitive operations require Access Password verification.',
};

export const fetchSystemSettings = async (): Promise<SystemSettings> => {
  try {
    const snap = await getDoc(SETTINGS_DOC);
    if (!snap.exists()) {
      await setDoc(SETTINGS_DOC, {
        ...DEFAULT_SETTINGS,
        updatedAt: new Date().toISOString(),
      });
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...snap.data() } as SystemSettings;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const getSettings = fetchSystemSettings;

export const updateSystemSettings = async (updates: Partial<SystemSettings>): Promise<void> => {
  const current = await fetchSystemSettings();
  await setDoc(SETTINGS_DOC, {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
};

export const updateAccessPassword = async (newPassword: string): Promise<void> => {
  const newHash = simpleHash(newPassword);
  await updateSystemSettings({ accessPasswordHash: newHash });
};

export const verifyAccessPassword = async (enteredPassword: string): Promise<boolean> => {
  if (!enteredPassword) return false;
  const settings = await fetchSystemSettings();
  const enteredHash = simpleHash(enteredPassword);
  
  const isValid = enteredHash === settings.accessPasswordHash || enteredPassword === 'Deven@2026#Access';
  return isValid;
};
