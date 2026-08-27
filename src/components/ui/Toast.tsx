import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  isOpen,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    if (!isOpen || !duration) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  };

  const bgStyles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 p-4 rounded-2xl border shadow-xl transition-all duration-300 transform translate-y-0 ${bgStyles[type]}`}
    >
      {icons[type]}
      <p className="text-xs font-bold">{message}</p>
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-black/5 transition-colors text-gray-500 hover:text-gray-700"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
