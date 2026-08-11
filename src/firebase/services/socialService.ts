import { db } from '../config';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { SocialAccount } from '../../types';

const SOCIAL_COLLECTION = 'socialAccounts';

export const fetchSocialAccounts = async (): Promise<SocialAccount[]> => {
  try {
    const q = query(collection(db, SOCIAL_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as SocialAccount[];
  } catch (error) {
    console.error('Error fetching social media accounts:', error);
    return [];
  }
};

export const createSocialAccount = async (
  data: Omit<SocialAccount, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  userId: string
): Promise<string> => {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, SOCIAL_COLLECTION), {
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  });
  return docRef.id;
};

export const updateSocialAccount = async (
  id: string,
  updates: Partial<SocialAccount>
): Promise<void> => {
  const ref = doc(db, SOCIAL_COLLECTION, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

export const deleteSocialAccount = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, SOCIAL_COLLECTION, id));
};

export const subscribeToSocialAccounts = (callback: (data: SocialAccount[]) => void) => {
  const q = query(collection(db, SOCIAL_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as SocialAccount[];
    callback(list);
  }, (error) => {
    console.error('Error subscribing to social media accounts:', error);
  });
};
