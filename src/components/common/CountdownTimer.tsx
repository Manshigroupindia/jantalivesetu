import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { formatIndianDate, calculateDomainExpiry } from '../../utils/dateUtils';

interface CountdownTimerProps {
  expiryDateStr?: string;
  renewDateStr?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiryDateStr, renewDateStr }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  const statusInfo = calculateDomainExpiry(expiryDateStr);

  useEffect(() => {
    if (!expiryDateStr) return;

    const calculateTime = () => {
      const target = new Date(expiryDateStr).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (isNaN(target)) return;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [expiryDateStr]);

  if (!expiryDateStr) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs">
        Domain Expiry Date not specified
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (statusInfo.status) {
      case 'Expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Expired
          </span>
        );
      case 'Renew Soon':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Renew Soon
          </span>
        );
      case 'Upcoming Renewal':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3.5 h-3.5 mr-1" /> Upcoming Renewal
          </span>
        );
      case 'Healthy':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Healthy
          </span>
        );
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-700/60 relative overflow-hidden">
      {/* Background Subtle Accent Glow */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4 border-b border-slate-700/80 pb-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-brand-400" />
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">Domain Expiry Countdown</span>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {timeLeft.isExpired ? (
        <div className="text-center py-3">
          <div className="text-2xl font-black text-rose-400 tracking-tight">DOMAIN EXPIRED</div>
          <p className="text-xs text-slate-400 mt-1">Expired on: {formatIndianDate(expiryDateStr)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 text-center my-2">
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5">
            <span className="block text-2xl font-extrabold text-white tracking-tight">{timeLeft.days}</span>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Days</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5">
            <span className="block text-2xl font-extrabold text-white tracking-tight">{timeLeft.hours}</span>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Hours</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5">
            <span className="block text-2xl font-extrabold text-white tracking-tight">{timeLeft.minutes}</span>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Minutes</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5">
            <span className="block text-2xl font-extrabold text-brand-400 tracking-tight">{timeLeft.seconds}</span>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Seconds</span>
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Expires: <strong className="text-slate-200">{formatIndianDate(expiryDateStr)}</strong></span>
        </div>
        {renewDateStr && (
          <div className="text-right">
            <span>Renew Date: <strong className="text-emerald-400">{formatIndianDate(renewDateStr)}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
