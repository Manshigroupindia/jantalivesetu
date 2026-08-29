import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle, HelpCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface ConfirmConfig {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface AlertConfig {
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose?: () => void;
}

export interface PromptConfig {
  title?: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (val: string) => void | Promise<void>;
  onCancel?: () => void;
}

interface NotificationContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  showAlert: (config: string | AlertConfig) => void;
  showConfirm: (config: ConfirmConfig) => void;
  showPrompt: (config: PromptConfig) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  showToast: () => {},
  showAlert: () => {},
  showConfirm: () => {},
  showPrompt: () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null);
  const [promptValue, setPromptValue] = useState<string>('');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const showAlert = useCallback((config: string | AlertConfig) => {
    if (typeof config === 'string') {
      setAlertConfig({ message: config, type: 'info' });
    } else {
      setAlertConfig(config);
    }
  }, []);

  const showConfirm = useCallback((config: ConfirmConfig) => {
    setConfirmConfig(config);
  }, []);

  const showPrompt = useCallback((config: PromptConfig) => {
    setPromptConfig(config);
    setPromptValue(config.defaultValue || '');
  }, []);

  const closeAlert = () => {
    if (alertConfig?.onClose) alertConfig.onClose();
    setAlertConfig(null);
  };

  const handleConfirmAction = async () => {
    if (!confirmConfig) return;
    const action = confirmConfig.onConfirm;
    setConfirmConfig(null);
    await action();
  };

  const handleCancelConfirm = () => {
    if (confirmConfig?.onCancel) confirmConfig.onCancel();
    setConfirmConfig(null);
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptConfig) return;
    const action = promptConfig.onConfirm;
    const val = promptValue;
    setPromptConfig(null);
    setPromptValue('');
    await action(val);
  };

  const handleCancelPrompt = () => {
    if (promptConfig?.onCancel) promptConfig.onCancel();
    setPromptConfig(null);
    setPromptValue('');
  };

  // Keyboard shortcut ESC to dismiss modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (alertConfig) closeAlert();
        if (confirmConfig) handleCancelConfirm();
        if (promptConfig) handleCancelPrompt();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alertConfig, confirmConfig, promptConfig]);

  return (
    <NotificationContext.Provider value={{ showToast, showAlert, showConfirm, showPrompt }}>
      {children}

      {/* TOAST NOTIFICATIONS (Top-Right) */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const bg = {
            success: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/20',
            error: 'bg-brand-600 text-white border-brand-500 shadow-brand-950/20',
            warning: 'bg-amber-600 text-white border-amber-500 shadow-amber-950/20',
            info: 'bg-gray-900 text-white border-gray-800 shadow-gray-950/20',
          }[toast.type];

          const icon = {
            success: <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />,
            error: <AlertCircle className="w-5 h-5 shrink-0 text-white" />,
            warning: <AlertTriangle className="w-5 h-5 shrink-0 text-white" />,
            info: <Info className="w-5 h-5 shrink-0 text-white" />,
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl border shadow-xl transition-all transform animate-in slide-in-from-top-4 duration-200 ${bg}`}
            >
              <div className="flex items-center gap-3">
                {icon}
                <p className="text-xs font-bold leading-snug">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ALERT MODAL */}
      {alertConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={closeAlert} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 z-10 text-center">
            <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ${
              alertConfig.type === 'error' ? 'bg-red-50 text-red-600' :
              alertConfig.type === 'warning' ? 'bg-amber-50 text-amber-600' :
              alertConfig.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'
            }`}>
              {alertConfig.type === 'error' ? <AlertCircle className="w-7 h-7" /> :
               alertConfig.type === 'warning' ? <AlertTriangle className="w-7 h-7" /> :
               alertConfig.type === 'success' ? <CheckCircle2 className="w-7 h-7" /> : <Info className="w-7 h-7" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">{alertConfig.title || 'Notice'}</h3>
              <p className="text-xs font-medium text-gray-600 leading-relaxed">{alertConfig.message}</p>
            </div>
            <Button variant="primary" className="w-full bg-brand-600 hover:bg-brand-700 text-white" onClick={closeAlert}>
              OK
            </Button>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleCancelConfirm} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 z-10 text-center">
            <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ${
              confirmConfig.isDanger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'
            }`}>
              {confirmConfig.isDanger ? <AlertTriangle className="w-7 h-7" /> : <HelpCircle className="w-7 h-7" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">{confirmConfig.title || 'Confirm Action'}</h3>
              <p className="text-xs font-medium text-gray-600 leading-relaxed">{confirmConfig.message}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="w-full" onClick={handleCancelConfirm}>
                {confirmConfig.cancelText || 'Cancel'}
              </Button>
              <Button
                variant={confirmConfig.isDanger ? 'danger' : 'primary'}
                className="w-full"
                onClick={handleConfirmAction}
              >
                {confirmConfig.confirmText || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PROMPT MODAL */}
      {promptConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleCancelPrompt} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 z-10">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-gray-900">{promptConfig.title || 'Input Required'}</h3>
              <p className="text-xs font-medium text-gray-600 leading-relaxed">{promptConfig.message}</p>
            </div>
            <form onSubmit={handlePromptSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={promptConfig.placeholder || 'Enter response...'}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <div className="flex gap-3">
                <Button type="button" variant="secondary" className="w-full" onClick={handleCancelPrompt}>
                  {promptConfig.cancelText || 'Cancel'}
                </Button>
                <Button type="submit" variant="primary" className="w-full bg-brand-600 hover:bg-brand-700 text-white">
                  {promptConfig.confirmText || 'Submit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
