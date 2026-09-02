import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import {
  registerPushToken,
  listenToForegroundMessages,
  NotificationType,
  sendNotification,
  SendNotificationPayload
} from '../services/pushNotificationService';

export interface AppNotification {
  id: string;
  recipientUserId: string;
  title: string;
  body: string;
  url: string;
  type: NotificationType;
  createdAt: any;
  read: boolean;
  createdBy?: string;
  metadata?: Record<string, any>;
}

export type PermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

interface PushNotificationContextType {
  permission: PermissionStatus;
  isPromptOpen: boolean;
  requestPermission: () => Promise<boolean>;
  dismissPrompt: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isCenterOpen: boolean;
  openCenter: () => void;
  closeCenter: () => void;
  sendAppNotification: (payload: SendNotificationPayload) => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType>({
  permission: 'default',
  isPromptOpen: false,
  requestPermission: async () => false,
  dismissPrompt: () => {},
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  isCenterOpen: false,
  openCenter: () => {},
  closeCenter: () => {},
  sendAppNotification: async () => {},
});

export const PushNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userDoc } = useAuth();
  const { showToast } = useNotification();
  const [permission, setPermission] = useState<PermissionStatus>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as PermissionStatus;
    }
    return 'unsupported';
  });
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isCenterOpen, setIsCenterOpen] = useState(false);

  // Check if prompt should be shown after login
  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    const currentPerm = Notification.permission as PermissionStatus;
    setPermission(currentPerm);

    if (currentPerm === 'default') {
      const dismissed = localStorage.getItem(`fcm_prompt_dismissed_${user.uid}`);
      if (!dismissed) {
        // Delay slightly for smooth page load experience
        const timer = setTimeout(() => {
          setIsPromptOpen(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    } else if (currentPerm === 'granted') {
      // Auto-refresh token in Firestore
      registerPushToken(user.uid, userDoc?.role || 'staff');
    }
  }, [user, userDoc?.role]);

  // Request Notification Permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return false;
    }

    try {
      const res = await Notification.requestPermission();
      const newPerm = res as PermissionStatus;
      setPermission(newPerm);
      setIsPromptOpen(false);

      if (newPerm === 'granted' && user) {
        await registerPushToken(user.uid, userDoc?.role || 'staff');
        showToast('Push notifications enabled successfully!', 'success');
        return true;
      } else if (newPerm === 'denied') {
        showToast('Notifications are blocked in your browser settings.', 'warning');
      }
      return false;
    } catch (err) {
      console.error('[Request Permission Error]', err);
      return false;
    }
  }, [user, userDoc?.role, showToast]);

  const dismissPrompt = useCallback(() => {
    setIsPromptOpen(false);
    if (user) {
      localStorage.setItem(`fcm_prompt_dismissed_${user.uid}`, 'true');
    }
  }, [user]);

  // Realtime Firestore Listener for User Notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientUserId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AppNotification[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            recipientUserId: data.recipientUserId,
            title: data.title || 'Janta Live Setu',
            body: data.body || '',
            url: data.url || '/',
            type: data.type || 'general',
            createdAt: data.createdAt,
            read: !!data.read,
            createdBy: data.createdBy,
            metadata: data.metadata || {}
          };
        });
        setNotifications(list);
      },
      (err) => {
        console.warn('[Notifications Listener Error]', err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Listen to Foreground Messages when app is open
  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenToForegroundMessages((payload) => {
      console.log('[Foreground Message Received]', payload);
      const title = payload.notification?.title || payload.data?.title || 'Janta Live Setu';
      const body = payload.notification?.body || payload.data?.body || 'New update received.';
      showToast(`🔔 ${title}: ${body}`, 'info');
    });

    return () => unsubscribe();
  }, [user, showToast]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } catch (err) {
      console.error('[Mark As Read Error]', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      const unreadDocs = notifications.filter((n) => !n.read);
      const batch = writeBatch(db);
      unreadDocs.forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('[Mark All As Read Error]', err);
    }
  };

  const openCenter = () => setIsCenterOpen(true);
  const closeCenter = () => setIsCenterOpen(false);

  const sendAppNotification = async (payload: SendNotificationPayload) => {
    await sendNotification(payload);
  };

  return (
    <PushNotificationContext.Provider
      value={{
        permission,
        isPromptOpen,
        requestPermission,
        dismissPrompt,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        isCenterOpen,
        openCenter,
        closeCenter,
        sendAppNotification
      }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
};

export const usePushNotification = () => useContext(PushNotificationContext);
