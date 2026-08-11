import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, UserCheck, KeyRound, Mail, AlertCircle, ArrowRight, Lock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginDirector, loginStaff, currentUser, securityVerified } = useAuth();

  const [activeTab, setActiveTab] = useState<'DIRECTOR' | 'STAFF'>('DIRECTOR');

  // Form inputs
  const [directorPassword, setDirectorPassword] = useState('');
  const [staffEmailOrId, setStaffEmailOrId] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already Firebase authenticated, redirect to Step 2 or Dashboard
  React.useEffect(() => {
    if (currentUser) {
      if (securityVerified) {
        navigate('/dashboard');
      } else {
        navigate('/security-verification');
      }
    }
  }, [currentUser, securityVerified, navigate]);

  const handleDirectorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directorPassword.trim()) {
      setError('Director password is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await loginDirector(directorPassword);
      navigate('/security-verification');
    } catch (err: any) {
      console.error('Director Login Error:', err);
      setError(err.message || 'Authentication failed. Invalid Director password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmailOrId.trim() || !staffPassword.trim()) {
      setError('Please enter both Staff ID / Email and Password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await loginStaff(staffEmailOrId, staffPassword);
      navigate('/security-verification');
    } catch (err: any) {
      console.error('Staff Login Error:', err);
      setError(err.message || 'Authentication failed. Invalid staff credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-xl border border-brand-400/30">
          WD
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Website & Client Data Manager
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          Internal Secure Office Dashboard & Credential Repository
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
          
          {/* Tab Bar */}
          <div className="grid grid-cols-2 bg-slate-100 p-1.5 border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('DIRECTOR');
                setError('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'DIRECTOR'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span>Director Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('STAFF');
                setError('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'STAFF'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Staff Login</span>
            </button>
          </div>

          {/* Form Area */}
          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2.5">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* DIRECTOR LOGIN FORM */}
            {activeTab === 'DIRECTOR' ? (
              <form onSubmit={handleDirectorSubmit} className="space-y-5">
                <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-xs text-brand-900 flex items-start space-x-2.5">
                  <Lock className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-medium">
                    Super Admin Authentication Mode. Step 1 of 2-Step Verification.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={directorPassword}
                      onChange={(e) => setDirectorPassword(e.target.value)}
                      placeholder="Enter Director Password"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                      autoFocus
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Continue to Step 2'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* STAFF LOGIN FORM */
              <form onSubmit={handleStaffSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Staff ID or Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={staffEmailOrId}
                      onChange={(e) => setStaffEmailOrId(e.target.value)}
                      placeholder="e.g. STF-102 or staff@company.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                      autoFocus
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Staff Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Enter staff password..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Continue to Step 2'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-6 font-medium">
          Protected System — Restricted Internal Office Access Only
        </p>
      </div>
    </div>
  );
};
