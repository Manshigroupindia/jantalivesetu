import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSecurity } from '../../contexts/SecurityContext';
import { getCurrentDateISO, getCurrentTimeFormatted } from '../../utils/dateUtils';
import { Lock, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { userDoc, staffProfile } = useAuth();
  const { lockPinSession } = useSecurity();
  const [timeStr, setTimeStr] = useState(getCurrentTimeFormatted());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(getCurrentTimeFormatted());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm hidden md:flex">
      {/* LEFT: TIME & DATE */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
          <Clock className="w-4 h-4 text-brand-600 animate-pulse" />
          <span className="text-xs font-bold text-gray-800 font-mono">{timeStr}</span>
          <span className="text-gray-300">|</span>
          <span className="text-xs font-semibold text-gray-500">{getCurrentDateISO()}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Active Session</span>
        </div>
      </div>

      {/* RIGHT: ACTIONS & LOCK */}
      <div className="flex items-center gap-3">
        {userDoc?.pinHash && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Lock className="w-4 h-4 text-gray-500" />}
            onClick={lockPinSession}
            title="Lock Session with PIN"
          >
            Lock Session
          </Button>
        )}

        <div
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 pl-3 border-l border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
          title="View My Profile"
        >
          <div className="text-right">
            <p className="text-xs font-extrabold text-gray-900 leading-tight">
              {staffProfile?.fullName || userDoc?.name || 'User'}
            </p>
            <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider">
              {staffProfile?.designation || userDoc?.role}
            </p>
          </div>
          <img
            src={
              staffProfile?.photoUrl ||
              userDoc?.photoUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
            }
            alt="User Avatar"
            className="w-9 h-9 rounded-xl object-cover border-2 border-brand-500 shadow-sm"
          />
        </div>
      </div>
    </header>
  );
};
