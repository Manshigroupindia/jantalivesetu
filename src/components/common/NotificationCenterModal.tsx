import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  CheckCheck,
  Clock,
  Briefcase,
  MessageSquare,
  Receipt,
  UserCheck,
  UserX,
  Coffee,
  Droplets,
  Zap,
  ChevronRight,
  Info
} from 'lucide-react';
import { usePushNotification, AppNotification } from '../../contexts/PushNotificationContext';
import { NotificationType } from '../../services/pushNotificationService';

export const NotificationCenterModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    isCenterOpen,
    closeCenter,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = usePushNotification();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  if (!isCenterOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'attendance_on':
      case 'attendance_off':
      case 'manual_attendance':
        return <Clock className="w-4 h-4 text-emerald-600" />;
      case 'work_assigned':
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case 'chat_message':
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case 'expense_added':
        return <Receipt className="w-4 h-4 text-amber-600" />;
      case 'profile_approved':
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'profile_suspended':
        return <UserX className="w-4 h-4 text-red-600" />;
      case 'tea_updated':
        return <Coffee className="w-4 h-4 text-amber-600" />;
      case 'water_updated':
        return <Droplets className="w-4 h-4 text-cyan-600" />;
      case 'electricity_updated':
        return <Zap className="w-4 h-4 text-yellow-600" />;
      default:
        return <Info className="w-4 h-4 text-brand-600" />;
    }
  };

  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleItemClick = (n: AppNotification) => {
    if (!n.read) {
      markAsRead(n.id);
    }
    closeCenter();
    if (n.url) {
      navigate(n.url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={closeCenter} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200 border-l border-gray-100">
        {/* HEADER */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative p-2 bg-brand-50 text-brand-600 rounded-xl">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 leading-tight">Notification Center</h3>
              <p className="text-[10px] font-bold text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                title="Mark all as read"
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
            <button
              onClick={closeCenter}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-100 bg-white shrink-0 px-4 pt-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'all'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            All Notifications ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'unread'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* NOTIFICATION LIST */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-gray-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-gray-600">No notifications found</p>
              <p className="text-[11px] text-gray-400">
                {activeTab === 'unread' ? 'You have read all your notifications!' : 'Updates and alerts will appear here.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                  n.read
                    ? 'bg-white border-gray-100 hover:border-gray-200'
                    : 'bg-brand-50/30 border-brand-100 hover:bg-brand-50/60 shadow-sm'
                }`}
              >
                {!n.read && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-brand-600" />
                )}

                <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 shrink-0">
                  {getNotificationIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${n.read ? 'font-bold text-gray-800' : 'font-black text-gray-900'}`}>
                      {n.title}
                    </p>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-snug mt-0.5 font-medium line-clamp-2">
                    {n.body}
                  </p>

                  <div className="flex items-center justify-between pt-2 text-[10px] text-gray-400 font-semibold">
                    <span>{formatRelativeTime(n.createdAt)}</span>
                    <span className="flex items-center gap-0.5 text-brand-600 hover:underline">
                      View <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/80 text-center shrink-0">
          <p className="text-[10px] font-bold text-gray-400">Janta Live Setu — Instant Notification Center</p>
        </div>
      </div>
    </div>
  );
};
