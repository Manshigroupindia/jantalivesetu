import { addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuditLog, UserRole } from '../types';

export async function logAuditEvent(params: {
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  recordId?: string;
  previousValue?: string;
  newValue?: string;
}): Promise<void> {
  try {
    const auditData: Omit<AuditLog, 'id'> = {
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.action,
      module: params.module,
      recordId: params.recordId || '',
      previousValue: params.previousValue || '',
      newValue: params.newValue || '',
      timestamp: new Date().toISOString(),
    };

    await addDoc(collection(db, 'auditLogs'), auditData);
  } catch (err) {
    console.error('Failed to log audit event:', err);
    // Audit logging failure should not crash the app, but should be logged to console
  }
}
