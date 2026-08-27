import React from 'react';
import { Badge } from '../../components/ui/Badge';
import { LiveClockCard } from './components/LiveClockCard';
import { DutyCard } from './components/DutyCard';
import { TodaysWorkWidget } from './components/TodaysWorkWidget';
import { NoticeBoardWidget } from './components/NoticeBoardWidget';
import { HolidayCalendarWidget } from './components/HolidayCalendarWidget';
import { ProfileWidget } from './components/ProfileWidget';
import { useAuth } from '../../contexts/AuthContext';
import { getGreeting } from '../../utils/dateUtils';

export const StaffDashboard: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();

  return (
    <div className="space-y-6">
      {/* HERO WELCOME BANNER */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-gray-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10 text-center md:text-left">
          <Badge variant="brand" className="bg-white/20 text-white border-white/30">
            Staff Workstation
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {getGreeting()}, {staffProfile?.fullName || userDoc?.name || 'Staff Member'}
          </h1>
          <p className="text-xs sm:text-sm text-brand-100 font-medium">
            Designation: <span className="font-bold text-white">{staffProfile?.designation || 'Reporter'}</span> | Area: <span className="font-bold text-white">{staffProfile?.workingArea || 'New Delhi'}</span>
          </p>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COL 1 & 2 */}
        <div className="lg:col-span-2 space-y-6">
          <DutyCard />
          <TodaysWorkWidget />
          <NoticeBoardWidget />
        </div>

        {/* COL 3 */}
        <div className="space-y-6">
          <LiveClockCard />
          <ProfileWidget />
          <HolidayCalendarWidget />
        </div>
      </div>
    </div>
  );
};
