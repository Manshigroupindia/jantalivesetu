import { db } from '../config';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { GmailAccount } from '../../types';

const GMAIL_COLLECTION = 'gmailAccounts';

export const fetchGmailAccounts = async (): Promise<GmailAccount[]> => {
  try {
    const q = query(collection(db, GMAIL_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as GmailAccount[];
  } catch (error) {
    console.error('Error fetching Gmail accounts:', error);
    return [];
  }
};

export const createGmailAccount = async (
  data: Omit<GmailAccount, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  userId: string
): Promise<string> => {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, GMAIL_COLLECTION), {
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  });
  return docRef.id;
};

export const updateGmailAccount = async (
  id: string,
  updates: Partial<GmailAccount>
): Promise<void> => {
  const ref = doc(db, GMAIL_COLLECTION, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

export const deleteGmailAccount = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, GMAIL_COLLECTION, id));
};

export const subscribeToGmailAccounts = (callback: (data: GmailAccount[]) => void) => {
  const q = query(collection(db, GMAIL_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as GmailAccount[];
    callback(list);
  }, (error) => {
    console.error('Error subscribing to Gmail accounts:', error);
  });
};
