import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Lock, X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { 
  verifyPinHash, 
  checkPinRateLimit, 
  recordFailedPinAttempt, 
  resetPinRateLimit,
  isValid4DigitPin 
} from '../../utils/security';
import { useAuth } from '../../contexts/AuthContext';
import { logAuditEvent } from '../../firebase/services/auditService';

interface SecurityPinModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  actionName?: string;
  targetCollection?: string;
  targetId?: string;
  targetName?: string;
  onVerified: () => void | Promise<void>;
  onCancel: () => void;
}

export const SecurityPinModal: React.FC<SecurityPinModalProps> = ({
  isOpen,
  title = "Security Verification",
  description = "This action requires your 4-digit Access PIN verification.",
  actionName = "Confirm Action",
  targetCollection = "record",
  targetId = "",
  targetName = "",
  onVerified,
  onCancel,
}) => {
  const { profile, currentUser } = useAuth();
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto-focus first box on modal mount
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '']);
      setError('');
      setShowPin(false);
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    const numericChar = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = numericChar;
    setDigits(newDigits);
    setError('');

    // Auto-advance
    if (numericChar && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs[index - 1].current?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      setDigits(pasted.split(''));
      inputRefs[3].current?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = digits.join('');

    if (!isValid4DigitPin(pin)) {
      setError('Please enter a complete 4-digit PIN.');
      return;
    }

    // Rate limit check
    const rateCheck = checkPinRateLimit(currentUser?.uid || 'global');
    if (rateCheck.isLocked) {
      setError(`Too many incorrect attempts. Try again in ${rateCheck.remainingSeconds} seconds.`);
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const storedHash = profile?.accessPinHash;
      if (!storedHash) {
        setError('Access PIN is not configured. Please set your 4-digit PIN in Access Security.');
        setIsVerifying(false);
        return;
      }

      const isValid = verifyPinHash(pin, storedHash, profile?.uid || '');

      if (isValid) {
        resetPinRateLimit(currentUser?.uid || 'global');
        
        // Log Audit Event for successful PIN verification
        if (profile) {
          await logAuditEvent(
            profile.uid,
            profile.displayName,
            profile.role,
            'ACCESS_PIN_VERIFICATION_SUCCESS',
            targetCollection,
            targetId,
            `Access PIN verified for: ${actionName} (${targetName})`
          );
        }

        // Clear PIN from state
        setDigits(['', '', '', '']);
        await onVerified();
      } else {
        const failedResult = recordFailedPinAttempt(currentUser?.uid || 'global');

        if (profile) {
          await logAuditEvent(
            profile.uid,
            profile.displayName,
            profile.role,
            'ACCESS_PIN_VERIFICATION_FAILED',
            targetCollection,
            targetId,
            `Failed Access PIN verification attempt for: ${actionName}`
          );
        }

        if (failedResult.isLocked) {
          setError(`Too many incorrect attempts. Try again in ${failedResult.remainingSeconds} seconds.`);
        } else {
          setError('Incorrect Access PIN.');
        }

        // Clear input boxes on error
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } catch (err: any) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">{title}</h3>
          </div>
          <button 
            onClick={() => {
              setDigits(['', '', '', '']);
              onCancel();
            }} 
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleVerify} className="p-6 space-y-5">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            {description}
          </p>

          {targetName && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">TARGET RECORD:</span>
              <span className="font-bold text-slate-800 font-mono truncate max-w-[220px]">{targetName}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 4 Boxed PIN Input Container */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                4-Digit Access PIN
              </label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold flex items-center space-x-1"
              >
                {showPin ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide PIN</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show PIN</span>
                  </>
                )}
              </button>
            </div>

            {/* 4 Clean Equal-Sized PIN Squares */}
            <div className="grid grid-cols-4 gap-3 max-w-[260px] mx-auto" onPaste={handlePaste}>
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-12 h-14 text-center text-xl font-bold font-mono bg-slate-50 border-2 border-slate-300 rounded-xl focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all shadow-2xs"
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setDigits(['', '', '', '']);
                onCancel();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || digits.join('').length !== 4}
              className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-colors flex items-center space-x-1.5 disabled:opacity-40"
            >
              <Lock className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying...' : actionName}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
