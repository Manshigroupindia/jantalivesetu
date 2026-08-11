import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, LogOut, KeyRound } from 'lucide-react';
import { isValid4DigitPin } from '../utils/security';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { hashPin } from '../utils/security';

export const SecurityVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    profile, 
    securityVerified, 
    verifySecurityPin, 
    logout, 
    sessionLocked,
    isSuperAdmin,
    refreshProfile
  } = useAuth();

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Initial PIN setup mode state if user has no PIN yet
  const [setupMode, setSetupMode] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [setupError, setSetupError] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // If not Firebase authenticated, redirect to login
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    } else if (securityVerified) {
      navigate('/dashboard');
    }
  }, [currentUser, securityVerified, navigate]);

  // Focus first input box on mount
  useEffect(() => {
    if (!setupMode) {
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 150);
    }
  }, [setupMode]);

  const hasPinConfigured = Boolean(profile?.accessPinHash);

  const handleDigitChange = (index: number, value: string) => {
    const numericChar = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = numericChar;
    setDigits(newDigits);
    setError('');

    // Auto advance
    if (numericChar && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
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
      setError('Please enter a complete 4-digit numeric PIN.');
      return;
    }

    if (!hasPinConfigured) {
      setError('Access PIN is not configured yet. Click below to set up your PIN.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const res = await verifySecurityPin(pin);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.error || 'Incorrect Access PIN.');
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } catch (err: any) {
      setError('Verification error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Setup Initial Access PIN for user if not configured
  const handleSetupPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid4DigitPin(newPin)) {
      setSetupError('PIN must be exactly 4 numeric digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setSetupError('PINs do not match.');
      return;
    }

    setIsSettingUp(true);
    setSetupError('');

    try {
      if (currentUser?.uid) {
        const hashed = hashPin(newPin, currentUser.uid);
        const now = new Date().toISOString();

        await setDoc(doc(db, 'users', currentUser.uid), {
          accessPinHash: hashed,
          accessPinEnabled: true,
          accessPinUpdatedAt: now,
          updatedAt: now,
        }, { merge: true });

        await refreshProfile();

        // Verify immediately
        const res = await verifySecurityPin(newPin);
        if (res.success) {
          navigate('/dashboard');
        } else {
          setSetupError('Failed to verify newly created PIN.');
        }
      }
    } catch (err: any) {
      setSetupError(err.message || 'Failed to set Access PIN.');
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-2 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-xl border border-brand-400/30">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Security Verification
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          Step 2 — Enter 4-Digit Access PIN to enter workspace
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Status Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <Lock className="w-4.5 h-4.5 text-brand-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {sessionLocked ? 'Session Locked' : '2-Step Verification Gated'}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30">
              {profile?.role || (isSuperAdmin ? 'SUPER_ADMIN' : 'USER')}
            </span>
          </div>

          {/* Form Area */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* User Profile Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  {profile?.displayName?.charAt(0) || currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="truncate max-w-[200px]">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {profile?.displayName || 'Authenticated User'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {currentUser?.email}
                  </div>
                </div>
              </div>
            </div>

            {/* SETUP INITIAL PIN MODE */}
            {setupMode ? (
              <form onSubmit={handleSetupPinSubmit} className="space-y-4 pt-2">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium leading-relaxed">
                  Set your personal 4-digit Access PIN to enable 2-step security verification.
                </div>

                {setupError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{setupError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    New 4-Digit Access PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm 4-Digit Access PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setSetupMode(false)}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSettingUp}
                    className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50"
                  >
                    {isSettingUp ? 'Saving PIN...' : 'Save & Enter Workspace'}
                  </button>
                </div>
              </form>
            ) : (
              /* STANDARD PIN VERIFICATION FORM */
              <form onSubmit={handleVerify} className="space-y-5">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
                    <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 4 Boxed PIN Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Enter 4-Digit Access PIN
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

                <button
                  type="submit"
                  disabled={isVerifying || digits.join('').length !== 4}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-40"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isVerifying ? 'Verifying...' : 'Verify Access PIN'}</span>
                </button>

                {!hasPinConfigured && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setSetupMode(true)}
                      className="text-xs text-brand-600 hover:text-brand-700 font-bold underline flex items-center justify-center space-x-1 mx-auto"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Set Up Your 4-Digit Access PIN</span>
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* Logout / Switch Account */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Wrong account?</span>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="text-slate-600 hover:text-slate-900 font-bold flex items-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
