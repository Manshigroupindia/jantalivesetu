import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { verifyUserPin } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useSecurity } from '../../contexts/SecurityContext';

export const PinVerificationModal: React.FC = () => {
  const { userDoc } = useAuth();
  const { pinModalOpen, activeActionName, pendingCallback, cancelSecurityVerification, unlockPinSession } = useSecurity();
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (pinModalOpen) {
      setPinDigits(['', '', '', '']);
      setError(null);
      setSuccess(false);
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    }
  }, [pinModalOpen]);

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Paste support
      const pasted = value.slice(0, 4).split('');
      const newDigits = [...pinDigits];
      pasted.forEach((char, i) => {
        if (i < 4 && /^\d$/.test(char)) {
          newDigits[i] = char;
        }
      });
      setPinDigits(newDigits);
      if (pasted.length === 4) {
        inputRefs[3].current?.focus();
        verifyPinSubmitted(newDigits.join(''));
      }
      return;
    }

    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...pinDigits];
    newDigits[index] = value;
    setPinDigits(newDigits);
    setError(null);

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    if (newDigits.every((d) => d !== '')) {
      verifyPinSubmitted(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const verifyPinSubmitted = async (enteredPin: string) => {
    if (!userDoc) return;
    setLoading(true);
    setError(null);

    try {
      const isValid = await verifyUserPin(userDoc, enteredPin);

      if (isValid) {
        setSuccess(true);
        setLoading(false);
        setTimeout(() => {
          unlockPinSession();
          if (pendingCallback) {
            pendingCallback();
          }
          cancelSecurityVerification();
        }, 500);
      } else {
        setError('Incorrect security PIN. Please try again.');
        setPinDigits(['', '', '', '']);
        setLoading(false);
        setTimeout(() => inputRefs[0].current?.focus(), 100);
      }
    } catch (err) {
      setError('PIN verification failed. Secure with Janta Live Setu.');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={pinModalOpen} onClose={cancelSecurityVerification} maxWidth="sm">
      <div className="text-center py-2 space-y-4">
        <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900">Security Verification</h3>
          <p className="text-xs text-gray-500 mt-1">
            {activeActionName
              ? `Enter your 4-digit PIN to authorize: ${activeActionName}`
              : 'Enter your 4-digit security PIN to continue'}
          </p>
        </div>

        {/* 4 Digit PIN Inputs */}
        <div className="flex justify-center items-center gap-3 py-3">
          {pinDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={inputRefs[idx]}
              type="password"
              maxLength={4}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={loading || success}
              className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border bg-gray-50 focus:bg-white text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                error
                  ? 'border-red-500 text-red-600'
                  : success
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-gray-200 focus:border-brand-500'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-red-600 font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <CheckCircle2 className="w-4 h-4 animate-bounce" />
            <span>Authorization Successful</span>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={cancelSecurityVerification}>
            Cancel
          </Button>
        </div>

        <p className="text-[11px] text-gray-400 font-medium">Secure with Janta Live Setu</p>
      </div>
    </Modal>
  );
};
