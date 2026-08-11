import { db } from '../config';
import { collection, addDoc, serverTimestamp, query, orderBy, limit as firestoreLimit, getDocs } from 'firebase/firestore';
import { AuditLog, AuditAction } from '../../types';

const AUDIT_COLLECTION = 'auditLogs';

export const logAuditEvent = async (
  userId: string,
  userName: string,
  userRole: string,
  action: AuditAction,
  collectionName: string,
  recordId: string,
  details?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const sanitizedMeta = metadata ? { ...metadata } : {};
    // Never store actual passwords in audit logs
    delete sanitizedMeta.password;
    delete sanitizedMeta.websiteAdminPassword;
    delete sanitizedMeta.hostingPassword;
    delete sanitizedMeta.accessPassword;

    await addDoc(collection(db, AUDIT_COLLECTION), {
      userId,
      userName: userName || 'Unknown User',
      userRole: userRole || 'VIEW',
      action,
      collection: collectionName,
      recordId,
      details: details || '',
      metadata: sanitizedMeta,
      timestamp: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
  }
};

export const fetchAuditLogs = async (maxLogs: number = 100): Promise<AuditLog[]> => {
  try {
    const q = query(collection(db, AUDIT_COLLECTION), orderBy('timestamp', 'desc'), firestoreLimit(maxLogs));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AuditLog[];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
};
