import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Clock, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { signOutUser } from '../../services/authService';

export const PendingApprovalPage: React.FC = () => {
  const { staffProfile, refreshUserDoc } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <Card className="max-w-md w-full shadow-2xl border-gray-100 p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-sm animate-pulse">
          <Clock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Your profile is under process</h2>
          <p className="text-sm font-medium text-gray-600 mt-2 leading-relaxed">
            You can access Janta Live Setu after Director approval.
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Applicant:</span>
            <span className="font-bold text-gray-900">{staffProfile?.fullName || 'Staff Member'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Designation:</span>
            <span className="font-bold text-gray-900">{staffProfile?.designation}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Status:</span>
            <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Pending Director Review
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => refreshUserDoc()}>
            Check Approval Status
          </Button>

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
