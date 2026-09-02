import React from 'react';
import { Bell, ShieldCheck, X } from 'lucide-react';
import { usePushNotification } from '../../contexts/PushNotificationContext';
import { Button } from '../ui/Button';

export const NotificationPermissionModal: React.FC = () => {
  const { isPromptOpen, requestPermission, dismissPrompt } = usePushNotification();

  if (!isPromptOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={dismissPrompt} />

      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 border border-gray-100 space-y-5 animate-in zoom-in-95 duration-150 z-10 text-center">
        {/* Close Button */}
        <button
          onClick={dismissPrompt}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-inner">
          <Bell className="w-8 h-8 animate-bounce" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h3 className="text-xl font-black text-gray-900 leading-tight">Enable Notifications</h3>
          <p className="text-xs font-semibold text-gray-600 leading-relaxed px-2">
            Get instant updates for attendance, work assignments, team messages, and expense approvals directly on your device.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 flex items-center justify-between text-left">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-bold text-gray-700">Official Janta Live Setu Alerts</span>
          </div>
          <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Free
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <Button
            variant="primary"
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-lg shadow-brand-600/20 active:scale-95 transition-all text-sm"
            onClick={requestPermission}
          >
            Enable Notifications
          </Button>
          <button
            onClick={dismissPrompt}
            className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};
