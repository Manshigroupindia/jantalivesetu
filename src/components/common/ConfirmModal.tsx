import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { useSecurity } from '../../contexts/SecurityContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  itemDetails?: string;
  warningMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Are you sure?',
  itemName,
  itemDetails,
  warningMessage = 'This action cannot be undone. Permanent deletion requires Security Access verification.',
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  const { requestSecurityVerification } = useSecurity();

  if (!isOpen) return null;

  const handleConfirmWithSecurity = () => {
    requestSecurityVerification(
      onConfirm,
      'Security Access Verification',
      'Please enter Website Access Password to authorize record deletion.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-semibold text-base leading-tight">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-rose-100 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          {itemName && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block mb-0.5">Target Record</span>
              <p className="text-sm font-bold text-rose-950">{itemName}</p>
              {itemDetails && <p className="text-xs text-rose-800 mt-0.5">{itemDetails}</p>}
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">{warningMessage}</p>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmWithSecurity}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Confirm & Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
