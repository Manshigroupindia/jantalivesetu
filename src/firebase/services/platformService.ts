import { db } from '../config';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { PlatformAccount } from '../../types';

const PLATFORMS_COLLECTION = 'platformAccounts';

export const fetchPlatformAccounts = async (): Promise<PlatformAccount[]> => {
  try {
    const q = query(collection(db, PLATFORMS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as PlatformAccount[];
  } catch (error) {
    console.error('Error fetching platform accounts:', error);
    return [];
  }
};

export const createPlatformAccount = async (
  data: Omit<PlatformAccount, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  userId: string
): Promise<string> => {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, PLATFORMS_COLLECTION), {
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  });
  return docRef.id;
};

export const updatePlatformAccount = async (
  id: string,
  updates: Partial<PlatformAccount>
): Promise<void> => {
  const ref = doc(db, PLATFORMS_COLLECTION, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

export const deletePlatformAccount = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, PLATFORMS_COLLECTION, id));
};

export const subscribeToPlatformAccounts = (callback: (data: PlatformAccount[]) => void) => {
  const q = query(collection(db, PLATFORMS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as PlatformAccount[];
    callback(list);
  }, (error) => {
    console.error('Error subscribing to platform accounts:', error);
  });
};
