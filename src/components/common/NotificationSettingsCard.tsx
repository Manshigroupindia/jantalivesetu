import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Bell, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { usePushNotification } from '../../contexts/PushNotificationContext';

export const NotificationSettingsCard: React.FC = () => {
  const { permission, requestPermission } = usePushNotification();

  const getStatusBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="success" size="sm">Enabled</Badge>;
      case 'denied':
        return <Badge variant="danger" size="sm">Blocked</Badge>;
      case 'unsupported':
        return <Badge variant="warning" size="sm">Not Supported</Badge>;
      default:
        return <Badge variant="info" size="sm">Not Enabled</Badge>;
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand-600" /> Web Push Notifications
        </h3>
        {getStatusBadge()}
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <div>
            <p className="text-xs font-bold text-gray-900">Push Notifications</p>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5">
              Receive real-time alerts for attendance check-ins, assigned work, messages, and office logs on your device.
            </p>
          </div>

          <div className="shrink-0 pt-0.5">
            {permission === 'granted' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" /> Active
              </span>
            ) : permission === 'denied' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
                <ShieldAlert className="w-4 h-4" /> Blocked
              </span>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={requestPermission}
                disabled={permission === 'unsupported'}
              >
                Enable Notifications
              </Button>
            )}
          </div>
        </div>

        {permission === 'denied' && (
          <div className="p-3 rounded-xl bg-red-50/70 border border-red-200/70 flex items-center gap-2 text-xs font-medium text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Notifications are blocked in your browser settings. Please unblock site permissions to receive alerts.</span>
          </div>
        )}

        {permission === 'unsupported' && (
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center gap-2 text-xs font-medium text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Your current browser or environment does not support Web Push Notifications.</span>
          </div>
        )}
      </div>
    </Card>
  );
};
