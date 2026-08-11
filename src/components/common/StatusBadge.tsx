import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  type: 'websiteStatus' | 'paymentStatus' | 'activeStatus' | 'role' | 'general';
  value: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  if (!value) return null;

  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let icon: React.ReactNode = null;

  if (type === 'websiteStatus') {
    if (value === 'Complete') {
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
      icon = <CheckCircle2 className="w-3 h-3 mr-1" />;
    } else {
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
      icon = <Clock className="w-3 h-3 mr-1" />;
    }
  } else if (type === 'paymentStatus') {
    if (value === 'Paid') {
      bgClass = 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
      icon = <CheckCircle2 className="w-3 h-3 mr-1" />;
    } else {
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      icon = <AlertCircle className="w-3 h-3 mr-1" />;
    }
  } else if (type === 'activeStatus') {
    if (value === 'Active') {
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
      icon = <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />;
    } else {
      bgClass = 'bg-slate-100 text-slate-600 border-slate-300 font-medium';
      icon = <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />;
    }
  } else if (type === 'role') {
    if (value === 'SUPER_ADMIN') {
      bgClass = 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
    } else if (value === 'MANAGE') {
      bgClass = 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
    } else {
      bgClass = 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${bgClass}`}>
      {icon}
      <span>{value}</span>
    </span>
  );
};
