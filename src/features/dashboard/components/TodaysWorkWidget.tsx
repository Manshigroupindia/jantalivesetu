import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Briefcase, ArrowRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useRealtimeCollection } from '../../../hooks/useRealtime';
import { WorkAssignment } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { where } from 'firebase/firestore';

export const TodaysWorkWidget: React.FC = () => {
  const navigate = useNavigate();
  const { userDoc } = useAuth();
  const { data: works, loading } = useRealtimeCollection<WorkAssignment>('workAssignments', [
    where('assignedTo', '==', userDoc?.uid || 'none'),
  ]);

  const pendingCount = works.filter((w) => w.status === 'pending' || w.status === 'in_progress').length;
  const completedCount = works.filter((w) => w.status === 'completed' || w.status === 'reviewed').length;
  const highPriorityCount = works.filter((w) => w.priority === 'high' || w.priority === 'urgent').length;

  return (
    <Card hoverable className="p-5 space-y-4" onClick={() => navigate('/work')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900">Today's Work</h3>
            <p className="text-[11px] text-gray-400 font-medium">Assigned Tasks Summary</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-transform">
          <span>Open Work</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse py-2">Loading tasks...</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
            <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <span className="text-lg font-black text-amber-900 block leading-tight">{pendingCount}</span>
            <span className="text-[10px] font-bold text-amber-700 uppercase">Pending</span>
          </div>

          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <span className="text-lg font-black text-emerald-900 block leading-tight">{completedCount}</span>
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Done</span>
          </div>

          <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-center">
            <AlertCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
            <span className="text-lg font-black text-red-900 block leading-tight">{highPriorityCount}</span>
            <span className="text-[10px] font-bold text-red-700 uppercase">Urgent</span>
          </div>
        </div>
      )}
    </Card>
  );
};
