import React from 'react';
import { Card } from '../../components/ui/Card';
import { Lock, Shield, Calendar, User } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { AuditLog } from '../../types';
import { orderBy } from 'firebase/firestore';

export const AuditLogsPage: React.FC = () => {
  const { data: logs, loading } = useRealtimeCollection<AuditLog>('auditLogs', [
    orderBy('timestamp', 'desc'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Lock className="w-7 h-7 text-brand-600" />
          Executive Audit Trail Logs
        </h1>
        <p className="text-xs text-gray-500 font-medium">
          Director-only immutable audit trail recording all sensitive operations, PIN authorizations, and payroll actions.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading audit logs...</p>
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 text-xs italic">
          No audit log events recorded yet.
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Module</th>
                <th className="py-3.5 px-4">Record ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4 text-gray-500">{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 font-bold text-gray-900">{log.userName} ({log.userRole})</td>
                  <td className="py-3 px-4 font-extrabold text-brand-600">{log.action}</td>
                  <td className="py-3 px-4 text-gray-600">{log.module}</td>
                  <td className="py-3 px-4 text-gray-400">{log.recordId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
