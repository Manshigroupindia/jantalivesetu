import React, { useState, useRef, useEffect } from 'react';
import { Lock, AlertCircle, CheckCircle2, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSecurity } from '../../contexts/SecurityContext';
import { useCompany } from '../../contexts/CompanyContext';
import { verifyUserPin, signOutUser } from '../../services/authService';
import { Button } from '../ui/Button';

export const LockScreen: React.FC = () => {
  const { userDoc, firebaseUser } = useAuth();
  const { isPinLocked, unlockPinSession } = useSecurity();
  const { companySettings } = useCompany();

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

  // Auto-focus first input box when lock screen appears
  useEffect(() => {
    if (isPinLocked) {
      setPinDigits(['', '', '', '']);
      setError(null);
      setSuccess(false);
      setTimeout(() => inputRefs[0].current?.focus(), 150);
    }
  }, [isPinLocked]);

  if (!isPinLocked || !firebaseUser || !userDoc) {
    return null;
  }

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Paste 4-digit PIN support
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
        }, 300);
      } else {
        setError('Incorrect PIN. Please try again.');
        setPinDigits(['', '', '', '']);
        setLoading(false);
        setTimeout(() => inputRefs[0].current?.focus(), 100);
      }
    } catch (err) {
      setError('PIN verification failed. Please try again.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      unlockPinSession();
    } catch (err) {
      console.error('Error signing out from lock screen:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-950 via-slate-900 to-black text-white flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden animate-in fade-in duration-300 select-none">
      {/* GLOW DECORATIONS */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white/10 border border-white/15 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6 relative z-10">
        {/* LOGO */}
        <div className="flex justify-center">
          {companySettings?.logoUrl ? (
            <img
              src={companySettings.logoUrl}
              alt={companySettings.companyName || 'Logo'}
              className="w-20 h-20 rounded-2xl object-contain bg-white p-1.5 shadow-xl border border-white/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-brand-600 text-white font-black text-3xl flex items-center justify-center shadow-xl border border-brand-500">
              {companySettings?.companyName ? companySettings.companyName.substring(0, 2).toUpperCase() : 'JL'}
            </div>
          )}
        </div>

        {/* HEADER */}
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {companySettings?.companyName || 'Janta Live Setu'}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/30">
            <Lock className="w-3.5 h-3.5" />
            <span>Session Locked</span>
          </div>
          <p className="text-xs text-gray-300 font-medium mt-3">
            Enter your 4-digit security PIN to unlock access
          </p>
        </div>

        {/* 4 DIGIT PIN INPUT */}
        <div className="flex justify-center items-center gap-3 py-2">
          {pinDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={inputRefs[idx]}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={loading || success}
              className={`w-12 h-14 text-center text-2xl font-bold rounded-2xl border bg-black/40 text-white transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                error
                  ? 'border-red-500 text-red-400 bg-red-950/20'
                  : success
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                  : 'border-white/20 focus:border-brand-400'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-semibold bg-red-950/40 p-2.5 rounded-xl border border-red-800/40">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
            <CheckCircle2 className="w-4 h-4 animate-bounce shrink-0" />
            <span>Session Unlocked</span>
          </div>
        )}

        {/* HELP & LOGOUT */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
          <p className="text-gray-400 text-[11px] text-left leading-tight">
            Forgot PIN? Contact Director to reset.
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 font-bold transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
