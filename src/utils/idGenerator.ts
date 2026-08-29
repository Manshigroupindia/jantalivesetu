import { db } from '../config/firebase';
import { doc, runTransaction, collection, getDocs, setDoc } from 'firebase/firestore';

/**
 * Atomic & Collision-Safe Staff ID Generator backed by Firestore transaction.
 * Example output: JL-STAFF-2026-0001, JL-STAFF-2026-0002
 */
export async function getNextUniqueStaffId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const counterRef = doc(db, 'counters', 'staffIdCounter');

  let seqNumber = 1;
  try {
    seqNumber = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      let next = 1;
      if (snap.exists()) {
        const data = snap.data();
        if (data.year === currentYear && typeof data.currentSequence === 'number') {
          next = data.currentSequence + 1;
        } else {
          next = (await getMaxStaffIdSequence(currentYear)) + 1;
        }
      } else {
        next = (await getMaxStaffIdSequence(currentYear)) + 1;
      }
      transaction.set(
        counterRef,
        { currentSequence: next, year: currentYear, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return next;
    });
  } catch (e) {
    console.warn('Transaction on staffIdCounter failed, using max sequence fallback:', e);
    const maxSeq = await getMaxStaffIdSequence(currentYear);
    seqNumber = maxSeq + 1;
    await setDoc(
      counterRef,
      { currentSequence: seqNumber, year: currentYear, updatedAt: new Date().toISOString() },
      { merge: true }
    ).catch(() => {});
  }

  return `JL-STAFF-${currentYear}-${String(seqNumber).padStart(4, '0')}`;
}

export async function getMaxStaffIdSequence(year: number): Promise<number> {
  let maxSeq = 0;
  try {
    const [staffSnap, userSnap] = await Promise.all([
      getDocs(collection(db, 'staffProfiles')),
      getDocs(collection(db, 'users')),
    ]);

    const allDocs = [...staffSnap.docs, ...userSnap.docs];
    for (const d of allDocs) {
      const idNum = d.data()?.idNumber;
      if (typeof idNum === 'string' && idNum.startsWith(`JL-STAFF-${year}-`)) {
        const parts = idNum.split('-');
        const seqStr = parts[parts.length - 1];
        const num = parseInt(seqStr, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading max staff ID sequence:', e);
  }
  return maxSeq;
}

export function generateStaffIdNumber(seqNumber: number = 1): string {
  const currentYear = new Date().getFullYear();
  const nextSeq = String(seqNumber).padStart(4, '0');
  return `JL-STAFF-${currentYear}-${nextSeq}`;
}
