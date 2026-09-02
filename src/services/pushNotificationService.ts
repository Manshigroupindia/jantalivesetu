import { getToken, onMessage } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, functions, getMessagingInstance, firebaseConfig } from '../config/firebase';

export type NotificationType =
  | 'attendance_on'
  | 'attendance_off'
  | 'manual_attendance'
  | 'work_assigned'
  | 'chat_message'
  | 'expense_added'
  | 'profile_approved'
  | 'profile_suspended'
  | 'tea_updated'
  | 'water_updated'
  | 'electricity_updated'
  | 'general';

export interface SendNotificationPayload {
  recipientUserId?: string;
  recipientUserIds?: string[];
  targetRole?: 'director' | 'admin' | 'staff';
  title: string;
  body: string;
  url?: string;
  type: NotificationType;
  metadata?: Record<string, any>;
}

export interface StoredNotificationToken {
  token: string;
  userId: string;
  role: string;
  deviceInfo: string;
  createdAt: any;
  updatedAt: any;
  lastSeenAt: any;
  enabled: boolean;
}

// Generate deterministic doc ID for token to prevent duplicates
export const hashTokenId = (token: string): string => {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `token_${Math.abs(hash)}`;
};

/**
 * Register FCM token for current device
 */
export const registerPushToken = async (userId: string, role: string): Promise<string | null> => {
  try {
    if (!('Notification' in window)) return null;

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    // Get Service Worker Registration
    const swRegistration = await navigator.serviceWorker.ready;

    const vapidKey = firebaseConfig.vapidKey || undefined;
    const token = await getToken(messaging, {
      serviceWorkerRegistration: swRegistration,
      vapidKey: vapidKey || undefined
    });

    if (!token) {
      console.warn('[FCM] No registration token available.');
      return null;
    }

    const tokenId = hashTokenId(token);
    const tokenRef = doc(db, 'users', userId, 'notificationTokens', tokenId);

    const deviceInfo = `${navigator.platform} - ${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}`;

    await setDoc(tokenRef, {
      token,
      userId,
      role: role || 'staff',
      deviceInfo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      enabled: true
    }, { merge: true });

    return token;
  } catch (err) {
    console.error('[FCM Token Error]', err);
    return null;
  }
};

/**
 * Disable or remove current device FCM token
 */
export const unregisterPushToken = async (userId: string, token: string): Promise<void> => {
  try {
    const tokenId = hashTokenId(token);
    const tokenRef = doc(db, 'users', userId, 'notificationTokens', tokenId);
    await setDoc(tokenRef, { enabled: false, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.error('[FCM Unregister Error]', err);
  }
};

/**
 * Centralized Notification Dispatcher
 * Calls Cloud Function first (secure server-side sending),
 * with fallback to client-side Firestore notification creation if functions are unreachable.
 */
export const sendNotification = async (payload: SendNotificationPayload): Promise<void> => {
  try {
    const sendPushFn = httpsCallable(functions, 'sendPushNotification');
    const result = await sendPushFn(payload);
    console.log('[Notification Sent via Cloud Function]', result.data);
  } catch (cloudFnErr) {
    console.warn('[Cloud Function fallback to Firestore direct notifications]', cloudFnErr);

    // Client-side fallback to insert notification history directly into Firestore
    try {
      const recipientUids = new Set<string>();
      if (payload.recipientUserId) recipientUids.add(payload.recipientUserId);
      if (payload.recipientUserIds) payload.recipientUserIds.forEach((id) => recipientUids.add(id));

      if (payload.targetRole) {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', payload.targetRole)));
        usersSnap.forEach((d) => recipientUids.add(d.id));

        if (payload.targetRole === 'director' || payload.targetRole === 'admin') {
          const altRole = payload.targetRole === 'director' ? 'Director' : 'Admin';
          const altSnap = await getDocs(query(collection(db, 'users'), where('role', '==', altRole)));
          altSnap.forEach((d) => recipientUids.add(d.id));
        }
      }

      for (const uid of Array.from(recipientUids)) {
        await addDoc(collection(db, 'notifications'), {
          recipientUserId: uid,
          title: payload.title,
          body: payload.body,
          url: payload.url || '/',
          type: payload.type || 'general',
          createdAt: serverTimestamp(),
          read: false,
          metadata: payload.metadata || {}
        });
      }
    } catch (dbErr) {
      console.error('[Notification Fallback Error]', dbErr);
    }
  }
};

/**
 * Attach Foreground Message Listener
 */
export const listenToForegroundMessages = (callback: (payload: any) => void): (() => void) => {
  let unsubscribe: (() => void) | null = null;
  getMessagingInstance().then((messaging) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, (payload) => {
        callback(payload);
      });
    }
  });
  return () => {
    if (unsubscribe) unsubscribe();
  };
};
