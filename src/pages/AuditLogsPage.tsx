import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { FileText, Search, Shield, Filter, Clock } from 'lucide-react';
import { fetchAuditLogs } from '../firebase/services/auditService';
import { AuditLog } from '../types';
import { formatIndianDate } from '../utils/dateUtils';
import { Pagination } from '../components/common/Pagination';
import { useAuth } from '../contexts/AuthContext';

export const AuditLogsPage: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    fetchAuditLogs(100).then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (log.userName || log.userId || '').toLowerCase().includes(term) ||
      (log.recordId || '').toLowerCase().includes(term) ||
      (log.collection || '').toLowerCase().includes(term) ||
      (log.details || '').toLowerCase().includes(term);
    const matchAction = selectedAction === 'ALL' || log.action === selectedAction;
    return matchSearch && matchAction;
  });

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <DashboardLayout title="System Audit Logs">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900">System Security Audit Trail</h2>
            <p className="text-xs text-slate-500 font-medium">
              Immutable timeline of creations, edits, password views, and administrative actions.
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user, record ID, details..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="VIEW_SENSITIVE_DATA">VIEW_SENSITIVE_DATA</option>
              <option value="REVEAL_PASSWORD">REVEAL_PASSWORD</option>
              <option value="ROLE_CHANGE">ROLE_CHANGE</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Performer User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Collection</th>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">Activity Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading audit log trail...
                    </td>
                  </tr>
                ) : paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No audit log records found.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => {
                    let actionBadge = 'bg-slate-100 text-slate-700';
                    if (log.action === 'CREATE') actionBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    else if (log.action === 'UPDATE') actionBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                    else if (log.action === 'DELETE') actionBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                    else if (log.action === 'VIEW_SENSITIVE_DATA' || log.action === 'REVEAL_PASSWORD') actionBadge = 'bg-purple-50 text-purple-700 border-purple-200';

                    const dateObj = log.timestamp ? new Date(log.timestamp) : null;
                    const logDateStr = dateObj && !isNaN(dateObj.getTime()) ? formatIndianDate(dateObj.toISOString()) : 'N/A';
                    const logTimeStr = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600">
                          <div>{logDateStr}</div>
                          <div className="text-[10px] text-slate-400">{logTimeStr}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {log.userName || log.userId}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${actionBadge}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {log.collection}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 font-mono text-[11px]">
                          {log.recordId}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {log.details || 'N/A'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredLogs.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};
