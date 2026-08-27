import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Lock, Mail, ShieldCheck, UserCheck, KeyRound, AlertCircle, ArrowLeft } from 'lucide-react';
import { loginWithCredentials, sendDirectorPasswordReset, DIRECTOR_FIXED_EMAIL } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUserDoc } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState<'director' | 'staff' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSelectRole = (role: 'director' | 'staff') => {
    setSelectedRole(role);
    setError(null);
    if (role === 'director') {
      setEmail(DIRECTOR_FIXED_EMAIL);
    } else {
      setEmail('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const targetEmail = selectedRole === 'director' ? DIRECTOR_FIXED_EMAIL : email;

    try {
      const { userDoc } = await loginWithCredentials(targetEmail, password);

      // Verify PIN if user has set up a PIN and is trying to login
      if (userDoc.pinHash && pin) {
        const { simpleHashPin } = await import('../../services/authService');
        if (simpleHashPin(pin) !== userDoc.pinHash) {
          setError('Incorrect 4-digit security PIN.');
          setLoading(false);
          return;
        }
      }

      if (userDoc.status === 'deleted') {
        const { signOutUser } = await import('../../services/authService');
        await signOutUser();
        setError('Your Janta Live Setu account has been removed. Please contact the Director.');
        setLoading(false);
        return;
      }

      await refreshUserDoc();

      if (userDoc.role === 'director') {
        if (!userDoc.firstLoginCompleted) {
          navigate('/setup/director');
        } else {
          navigate('/dashboard');
        }
      } else {
        if (userDoc.status === 'pending_profile') {
          navigate('/setup/staff');
        } else if (userDoc.status === 'under_review' || !userDoc.approved) {
          navigate('/pending-approval');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError(err.message || 'Authentication failed. Secure with Janta Live Setu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      await sendDirectorPasswordReset();
      setResetSent(true);
      setError(null);
    } catch (err: any) {
      setError('Failed to send password reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-bg via-white to-gray-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
        
        {/* LEFT BRANDING PANEL */}
        <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-black/20 blur-2xl pointer-events-none" />

          <div className="space-y-4 z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-brand-600 font-black text-xl flex items-center justify-center shadow-lg">
                JL
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">Janta Live Setu</h1>
                <p className="text-xs text-brand-200 font-semibold tracking-widest uppercase">Office Management CMS</p>
              </div>
            </div>

            <div className="pt-6 space-y-3">
              <p className="text-lg font-bold leading-snug">
                Unified Corporate Infrastructure for Media & Office Operations.
              </p>
              <p className="text-xs text-brand-100/90 leading-relaxed">
                Real-time attendance, salary engines, work assignment tracking, utilities, and secure role-based access.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 z-10">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-100">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Secure with Janta Live Setu</span>
            </div>
          </div>
        </div>

        {/* RIGHT LOGIN FORM */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          {!selectedRole ? (
            /* STEP 1: ROLE SELECTION */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-black text-gray-900">Who are you?</h2>
                <p className="text-xs text-gray-500">Select your account portal to sign in</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => handleSelectRole('director')}
                  className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-brand-500 hover:bg-brand-50/40 transition-all duration-200 text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 group-hover:text-brand-600">Director Portal</h3>
                    <p className="text-xs text-gray-500">Executive access for Director</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectRole('staff')}
                  className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-brand-500 hover:bg-brand-50/40 transition-all duration-200 text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 group-hover:text-brand-600">Staff Portal</h3>
                    <p className="text-xs text-gray-500">Login for reporters, admins, and office staff</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: CREDENTIAL FORM */
            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <span className="text-xs font-extrabold text-brand-600 uppercase tracking-wider">
                  {selectedRole === 'director' ? 'Director Portal' : 'Staff Portal'}
                </span>
              </div>

              {selectedRole === 'director' ? (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Director Email
                  </label>
                  <div className="bg-gray-100 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{DIRECTOR_FIXED_EMAIL}</span>
                  </div>
                </div>
              ) : (
                <Input
                  label="Staff Email"
                  type="email"
                  placeholder="name@jantalive.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="w-4 h-4" />}
                  required
                />
              )}

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />

              <Input
                label="4-Digit Security PIN"
                type="password"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                icon={<Lock className="w-4 h-4" />}
              />

              {selectedRole === 'director' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-semibold text-brand-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {resetSent && (
                <p className="text-xs text-emerald-600 font-semibold text-center bg-emerald-50 p-2 rounded-lg">
                  Password reset link sent to Director email.
                </p>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full py-3" loading={loading}>
                Sign In to CMS
              </Button>

              <p className="text-[11px] text-gray-400 font-medium text-center pt-2">
                Secure with Janta Live Setu
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
