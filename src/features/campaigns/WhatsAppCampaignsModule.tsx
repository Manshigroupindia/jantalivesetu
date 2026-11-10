import React from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  History
} from 'lucide-react';
import { CampaignDashboard } from './CampaignDashboard';
import { ClientManagement } from './ClientManagement';
import { CreateCampaign } from './CreateCampaign';
import { CampaignHistory } from './CampaignHistory';
import { CampaignPreparation } from './CampaignPreparation';

export const WhatsAppCampaignsModule: React.FC = () => {
  const location = useLocation();

  const isPreparationRoute = location.pathname.includes('/campaigns/prepare/');

  const navTabs = [
    {
      to: '/campaigns',
      exact: true,
      label: 'Campaign Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/campaigns/clients',
      label: 'Client Management',
      icon: Users,
    },
    {
      to: '/campaigns/create',
      label: 'Create Campaign',
      icon: PlusCircle,
    },
    {
      to: '/campaigns/history',
      label: 'Campaign History',
      icon: History,
    },
  ];

  return (
    <div className="space-y-6">
      {/* SUB-NAVIGATION TABS (Hidden on full-screen preparation route for focus) */}
      {!isPreparationRoute && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.exact
              ? location.pathname === tab.to
              : location.pathname.startsWith(tab.to);

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}

      {/* MODULE ROUTES */}
      <Routes>
        <Route index element={<CampaignDashboard />} />
        <Route path="clients" element={<ClientManagement />} />
        <Route path="create" element={<CreateCampaign />} />
        <Route path="history" element={<CampaignHistory />} />
        <Route path="prepare/:id" element={<CampaignPreparation />} />
        <Route path="*" element={<Navigate to="/campaigns" replace />} />
      </Routes>
    </div>
  );
};
