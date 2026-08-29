import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Users,
  Clock,
  Briefcase,
  Receipt,
  DollarSign,
  Zap,
  Droplet,
  Coffee,
  Building,
  Sparkles,
  UserCheck,
  ArrowUpRight
} from 'lucide-react';
import { LiveClockCard } from './components/LiveClockCard';
import { NoticeBoardWidget } from './components/NoticeBoardWidget';
import { HolidayCalendarWidget } from './components/HolidayCalendarWidget';
import { ProfileWidget } from './components/ProfileWidget';
import { useAuth } from '../../contexts/AuthContext';
import { getGreeting } from '../../utils/dateUtils';
import { formatINR } from '../../utils/formatters';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { User, AttendanceRecord, ExpenseItem, WorkAssignment } from '../../types';
import { getCurrentDateISO } from '../../utils/dateUtils';
import { useNavigate } from 'react-router-dom';

export const ExecutiveDashboard: React.FC = () => {
  const { userDoc } = useAuth();
  const navigate = useNavigate();
  const todayStr = getCurrentDateISO();

  // Metrics Data
  const { data: users } = useRealtimeCollection<User>('users');
  const { data: todayAttendance } = useRealtimeCollection<AttendanceRecord>('attendance');
  const { data: expenses } = useRealtimeCollection<ExpenseItem>('expenses');
  const { data: works } = useRealtimeCollection<WorkAssignment>('workAssignments');

  const activeUsers = users.filter((u) => u.role !== 'director' && u.status?.toLowerCase() !== 'deleted');
  const totalStaffCount = activeUsers.length;
  const pendingApprovalsCount = activeUsers.filter((u) => u.status === 'under_review' || !u.approved).length;
  const presentTodayCount = todayAttendance.filter((a) => a.date === todayStr && (a.status === 'present' || a.status === 'on_duty')).length;
  
  const totalPendingExpenses = expenses
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + e.amount, 0);

  const pendingWorksCount = works.filter((w) => w.status === 'pending' || w.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* HERO WELCOME BANNER */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-gray-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10 text-center md:text-left">
          <Badge variant="brand" className="bg-white/20 text-white border-white/30">
            Executive Portal
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {getGreeting()}, {userDoc?.name || 'Director'}
          </h1>
          <p className="text-xs sm:text-sm text-brand-100 max-w-xl font-medium">
            Janta Live Setu Corporate CMS — Executive Operations & Oversight Dashboard.
          </p>
        </div>

        {pendingApprovalsCount > 0 && (
          <div className="z-10 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-amber-300 animate-bounce" />
            <div>
              <p className="text-xs font-bold text-white">{pendingApprovalsCount} Pending Staff Approvals</p>
              <button
                onClick={() => navigate('/staff')}
                className="text-[11px] font-bold text-brand-200 hover:underline flex items-center gap-1 mt-0.5"
              >
                Review Applications <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* METRICS STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverable onClick={() => navigate('/staff')} className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Staff</span>
            <Users className="w-5 h-5 text-brand-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{totalStaffCount}</p>
          <p className="text-[11px] text-emerald-600 font-semibold">{presentTodayCount} Present Today</p>
        </Card>

        <Card hoverable onClick={() => navigate('/attendance')} className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">On Duty Today</span>
            <Clock className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{presentTodayCount}</p>
          <p className="text-[11px] text-gray-400 font-medium">Recorded via GPS</p>
        </Card>

        <Card hoverable onClick={() => navigate('/work')} className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Pending Work</span>
            <Briefcase className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{pendingWorksCount}</p>
          <p className="text-[11px] text-amber-600 font-semibold">Active Assignments</p>
        </Card>

        <Card hoverable onClick={() => navigate('/expenses')} className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Pending Expenses</span>
            <Receipt className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{formatINR(totalPendingExpenses)}</p>
          <p className="text-[11px] text-blue-600 font-semibold">Awaiting Approval</p>
        </Card>
      </div>

      {/* QUICK UTILITY OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div onClick={() => navigate('/salary')} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-brand-500 transition-all text-center">
          <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
          <span className="text-[11px] font-bold text-gray-500 block">Salary Engine</span>
          <span className="text-xs font-black text-gray-900">Payroll</span>
        </div>

        <div onClick={() => navigate('/electricity')} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-brand-500 transition-all text-center">
          <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <span className="text-[11px] font-bold text-gray-500 block">Electricity</span>
          <span className="text-xs font-black text-gray-900">Meter Log</span>
        </div>

        <div onClick={() => navigate('/water')} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-brand-500 transition-all text-center">
          <Droplet className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <span className="text-[11px] font-bold text-gray-500 block">Water Bills</span>
          <span className="text-xs font-black text-gray-900">Bottles</span>
        </div>

        <div onClick={() => navigate('/tea-snacks')} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-brand-500 transition-all text-center">
          <Coffee className="w-5 h-5 text-brand-600 mx-auto mb-1" />
          <span className="text-[11px] font-bold text-gray-500 block">Tea & Snacks</span>
          <span className="text-xs font-black text-gray-900">Daily Log</span>
        </div>

        <div onClick={() => navigate('/office/rent')} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-brand-500 transition-all text-center">
          <Building className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <span className="text-[11px] font-bold text-gray-500 block">Office Rent</span>
          <span className="text-xs font-black text-gray-900">Monthly</span>
        </div>

        <div onClick={() => navigate('/office/cleanliness')} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-brand-500 transition-all text-center">
          <Sparkles className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
          <span className="text-[11px] font-bold text-gray-500 block">Cleanliness</span>
          <span className="text-xs font-black text-gray-900">Staff Pay</span>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COL 1 & 2 */}
        <div className="lg:col-span-2 space-y-6">
          <NoticeBoardWidget />
          <HolidayCalendarWidget />
        </div>

        {/* COL 3 */}
        <div className="space-y-6">
          <LiveClockCard />
          <ProfileWidget />
        </div>
      </div>
    </div>
  );
};
