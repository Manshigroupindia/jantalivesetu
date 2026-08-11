import React from 'react';
import { Check, Edit3, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { maskPassword } from '../../utils/security';

interface PreviewField {
  label: string;
  value: React.ReactNode;
  isPassword?: boolean;
  isFullWidth?: boolean;
}

interface PreviewModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  fields: PreviewField[];
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  title = 'Review Before Saving',
  subtitle = 'Please verify all details carefully before committing to Firestore.',
  fields,
  onConfirm,
  onEdit,
  onCancel,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-brand-500/20 text-brand-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">{title}</h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Cards */}
        <div className="p-6 overflow-y-auto space-y-4 flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field, idx) => (
              <div
                key={idx}
                className={`p-3 bg-slate-50 border border-slate-200 rounded-lg ${
                  field.isFullWidth ? 'md:col-span-2' : ''
                }`}
              >
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {field.label}
                </div>
                <div className="text-sm font-medium text-slate-900 break-words">
                  {field.isPassword ? (
                    <span className="font-mono text-slate-600">{maskPassword(field.value?.toString())}</span>
                  ) : (
                    field.value || <span className="text-slate-400 italic">Not specified</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onEdit}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>← Edit</span>
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : '✓ Confirm & Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
