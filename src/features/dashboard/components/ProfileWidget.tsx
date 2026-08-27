import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

export const ProfileWidget: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-4">
        <img
          src={
            staffProfile?.photoUrl ||
            userDoc?.photoUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
          }
          alt="Avatar"
          className="w-14 h-14 rounded-2xl object-cover border-2 border-brand-500 shadow-md shrink-0"
        />
        <div className="truncate">
          <h3 className="text-base font-extrabold text-gray-900 truncate">
            {staffProfile?.fullName || userDoc?.name || 'Director'}
          </h3>
          <p className="text-xs font-bold text-brand-600 uppercase tracking-wider">
            {staffProfile?.designation || userDoc?.role}
          </p>
          <Badge variant="success" size="sm" className="mt-1">
            Authorized Account
          </Badge>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{staffProfile?.workingArea || 'Headquarters'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{staffProfile?.email || userDoc?.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>{staffProfile?.contactNumber || '+91 98765 43210'}</span>
        </div>
      </div>
    </Card>
  );
};
