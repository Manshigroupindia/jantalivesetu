import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Clock, ShieldCheck, LogOut, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { signOutUser } from '../../services/authService';

export const PendingApprovalPage: React.FC = () => {
  const { userDoc, staffProfile, refreshUserDoc } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userDoc?.approved && userDoc?.status === 'approved') {
      navigate('/dashboard', { replace: true });
    }
  }, [userDoc, navigate]);

  const isRejected = userDoc?.status === 'rejected';

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-bg via-white to-gray-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <Card className="max-w-md w-full shadow-2xl border-gray-100 p-8 text-center space-y-6">
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-md ${
            isRejected ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse'
          }`}
        >
          {isRejected ? <AlertTriangle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
        </div>

        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {isRejected ? 'Profile Action Required' : 'Your Profile is Under Review'}
          </h2>
          <p className="text-sm font-medium text-gray-600 mt-2 leading-relaxed">
            {isRejected
              ? 'The Director has requested changes to your staff profile.'
              : 'Your profile has been submitted and is awaiting official Director verification.'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Applicant:</span>
            <span className="font-bold text-gray-900">{staffProfile?.fullName || userDoc?.name || 'Staff Member'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Official Email:</span>
            <span className="font-bold text-gray-900">{userDoc?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Designation:</span>
            <span className="font-bold text-gray-900">{staffProfile?.designation || userDoc?.designation || 'Staff'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-medium">Review Status:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full border text-[11px] ${
                isRejected
                  ? 'text-red-700 bg-red-50 border-red-200'
                  : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}
            >
              {isRejected ? 'REJECTED / CHANGES NEEDED' : 'UNDER DIRECTOR REVIEW'}
            </span>
          </div>

          {isRejected && staffProfile?.rejectionReason && (
            <div className="pt-2 border-t border-gray-200">
              <span className="text-xs font-bold text-red-600 block">Director Feedback:</span>
              <p className="text-xs text-gray-800 bg-white p-2.5 rounded-xl border border-red-100 mt-1 italic">
                "{staffProfile.rejectionReason}"
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {isRejected ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/setup/staff')}
            >
              Update Staff Profile & Resubmit
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => refreshUserDoc()}>
              Check Approval Status
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            icon={<LogOut className="w-4 h-4 text-red-500" />}
            onClick={() => signOutUser()}
          >
            Sign Out
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-medium pt-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Secure with Janta Live Setu</span>
        </div>
      </Card>
    </div>
  );
};
