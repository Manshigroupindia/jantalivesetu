import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Bell, Pin, Calendar } from 'lucide-react';
import { useRealtimeCollection } from '../../../hooks/useRealtime';
import { Notice } from '../../../types';
import { orderBy, limit } from 'firebase/firestore';

export const NoticeBoardWidget: React.FC = () => {
  const { data: notices, loading } = useRealtimeCollection<Notice>('notices', [
    orderBy('createdAt', 'desc'),
    limit(5),
  ]);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between border-b pb-3 border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand-600" />
          <h3 className="text-base font-extrabold text-gray-900">Notice Board</h3>
        </div>
        <span className="text-xs text-gray-400 font-semibold">{notices.length} Active</span>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse py-4 text-center">Loading notices...</p>
      ) : notices.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center italic">No official notices published.</p>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <div
              key={n.id}
              className={`p-3 rounded-xl border transition-all ${
                n.isPinned ? 'bg-brand-50/50 border-brand-200' : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  {n.isPinned && <Pin className="w-3.5 h-3.5 text-brand-600 fill-current shrink-0" />}
                  <h4 className="text-xs font-extrabold text-gray-900 truncate">{n.title}</h4>
                </div>
                <Badge
                  variant={
                    n.priority === 'urgent'
                      ? 'danger'
                      : n.priority === 'high'
                      ? 'warning'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {n.priority.toUpperCase()}
                </Badge>
              </div>

              <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{n.description}</p>

              <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200/50 text-[10px] text-gray-400 font-medium">
                <span>By {n.createdByName || 'Director'}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {n.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
