import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribeToWebsites } from '../firebase/services/websiteService';
import { WebsiteClientData } from '../types';
import { calculateDomainExpiry } from '../utils/dateUtils';

export interface AppNotification {
  id: string;
  type: 'expiry_alert' | 'pending_payment' | 'recent_addition';
  title: string;
  message: string;
  date: string;
  websiteId?: string;
  severity: 'critical' | 'warning' | 'info';
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  expiringIn7Days: WebsiteClientData[];
  expiringIn30Days: WebsiteClientData[];
  expiringIn60Days: WebsiteClientData[];
  expiredWebsites: WebsiteClientData[];
  pendingPaymentWebsites: WebsiteClientData[];
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [websites, setWebsites] = useState<WebsiteClientData[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const unsub = subscribeToWebsites((data) => {
      setWebsites(data);
    });
    return () => unsub();
  }, []);

  const expiringIn7Days = websites.filter(w => {
    const exp = calculateDomainExpiry(w.domainExpiryDate);
    return exp.daysRemaining >= 0 && exp.daysRemaining <= 7;
  });

  const expiringIn30Days = websites.filter(w => {
    const exp = calculateDomainExpiry(w.domainExpiryDate);
    return exp.daysRemaining >= 0 && exp.daysRemaining <= 30;
  });

  const expiringIn60Days = websites.filter(w => {
    const exp = calculateDomainExpiry(w.domainExpiryDate);
    return exp.daysRemaining >= 0 && exp.daysRemaining <= 60;
  });

  const expiredWebsites = websites.filter(w => {
    const exp = calculateDomainExpiry(w.domainExpiryDate);
    return exp.daysRemaining < 0;
  });

  const pendingPaymentWebsites = websites.filter(w => w.paymentStatus === 'Pending');

  useEffect(() => {
    const notifs: AppNotification[] = [];

    // Expired websites alerts
    expiredWebsites.forEach(w => {
      notifs.push({
        id: `exp-${w.id}`,
        type: 'expiry_alert',
        title: `Domain Expired: ${w.domain}`,
        message: `${w.clientName}'s domain ${w.domain} expired on ${w.domainExpiryDate}.`,
        date: w.domainExpiryDate || new Date().toISOString(),
        websiteId: w.id,
        severity: 'critical',
      });
    });

    // Urgent expiring soon (< 7 days)
    expiringIn7Days.forEach(w => {
      const exp = calculateDomainExpiry(w.domainExpiryDate);
      notifs.push({
        id: `exp7-${w.id}`,
        type: 'expiry_alert',
        title: `Domain Expiring Soon (${exp.daysRemaining} days)`,
        message: `${w.domain} (${w.clientName}) expires on ${w.domainExpiryDate}.`,
        date: w.domainExpiryDate,
        websiteId: w.id,
        severity: 'warning',
      });
    });

    // Pending payments alerts
    pendingPaymentWebsites.forEach(w => {
      notifs.push({
        id: `pay-${w.id}`,
        type: 'pending_payment',
        title: `Pending Payment: ${w.clientName}`,
        message: `Payment status for ${w.websiteName} (${w.domain}) is marked as Pending.`,
        date: w.updatedAt || new Date().toISOString(),
        websiteId: w.id,
        severity: 'info',
      });
    });

    setNotifications(notifs);
    setUnreadCount(notifs.length);
  }, [websites]);

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        expiringIn7Days,
        expiringIn30Days,
        expiringIn60Days,
        expiredWebsites,
        pendingPaymentWebsites,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
