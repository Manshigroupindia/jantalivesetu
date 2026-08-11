import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { 
  Globe, 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  RotateCcw,
  LayoutGrid,
  List
} from 'lucide-react';
import { subscribeToWebsites, filterWebsites, deleteWebsite } from '../firebase/services/websiteService';
import { fetchCategories } from '../firebase/services/categoryService';
import { WebsiteClientData, Category } from '../types';
import { calculateDomainExpiry, formatIndianDate, MONTH_NAMES, getAvailableYears } from '../utils/dateUtils';
import { StatusBadge } from '../components/common/StatusBadge';
import { Pagination } from '../components/common/Pagination';
import { SecurityPinModal } from '../components/common/SecurityPinModal';
import { useAuth } from '../contexts/AuthContext';
import { logAuditEvent } from '../firebase/services/auditService';

export const WebsitesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSuperAdmin, isManage, profile } = useAuth();

  const [websites, setWebsites] = useState<WebsiteClientData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'ALL');
  const [selectedWebsiteStatus, setSelectedWebsiteStatus] = useState('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('ALL');
  const [selectedActiveStatus, setSelectedActiveStatus] = useState('ALL');
  const [selectedDomainPlatform, setSelectedDomainPlatform] = useState('ALL');
  const [selectedHostingPlatform, setSelectedHostingPlatform] = useState('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('ALL');

  // Date filters
  const [purchaseMonth, setPurchaseMonth] = useState<number | undefined>(undefined);
  const [purchaseYear, setPurchaseYear] = useState<number | undefined>(undefined);
  const [expiryMonth, setExpiryMonth] = useState<number | undefined>(undefined);
  const [expiryYear, setExpiryYear] = useState<number | undefined>(undefined);

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState(searchParams.get('filter') === 'expiring' ? 'expiring_soon' : 'newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<WebsiteClientData | null>(null);

  useEffect(() => {
    const unsub = subscribeToWebsites(data => setWebsites(data));
    fetchCategories().then(cats => setCategories(cats));
    return () => unsub();
  }, []);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedWebsiteStatus('ALL');
    setSelectedPaymentStatus('ALL');
    setSelectedActiveStatus('ALL');
    setSelectedDomainPlatform('ALL');
    setSelectedHostingPlatform('ALL');
    setSelectedPaymentMethod('ALL');
    setPurchaseMonth(undefined);
    setPurchaseYear(undefined);
    setExpiryMonth(undefined);
    setExpiryYear(undefined);
    setSortBy('newest');
    setCurrentPage(1);
  };

  const filteredList = filterWebsites(
    websites,
    searchTerm,
    {
      category: selectedCategory,
      websiteStatus: selectedWebsiteStatus,
      paymentStatus: selectedPaymentStatus,
      activeStatus: selectedActiveStatus,
      domainPlatform: selectedDomainPlatform,
      hostingPlatform: selectedHostingPlatform,
      paymentMethod: selectedPaymentMethod,
      dateFilter: {
        purchaseMonth,
        purchaseYear,
        expiryMonth,
        expiryYear,
      },
    },
    sortBy
  );

  const paginatedList = filteredList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWebsite(deleteTarget.id);
      await logAuditEvent(
        profile?.uid || '',
        profile?.displayName || 'User',
        profile?.role || 'SUPER_ADMIN',
        'DELETE_VERIFIED',
        'websites',
        deleteTarget.id,
        `Deleted website record: ${deleteTarget.websiteName} (${deleteTarget.domain})`
      );
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete website:', err);
    }
  };

  return (
    <DashboardLayout title="Website & Client Data">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Website Directory</h2>
          <p className="text-xs text-slate-500">Manage client websites, domains, expiry dates, and hosting details.</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {isManage && (
            <button
              onClick={() => navigate('/websites/new')}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Website</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        {/* Search & Core Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="relative col-span-1 sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Client, website, domain, contact person..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Website Status</label>
            <select
              value={selectedWebsiteStatus}
              onChange={(e) => {
                setSelectedWebsiteStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="Complete">Complete</option>
              <option value="Uncomplete">Uncomplete</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Payment Status</label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => {
                setSelectedPaymentStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="ALL">All Payment</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Status</label>
            <select
              value={selectedActiveStatus}
              onChange={(e) => {
                setSelectedActiveStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="ALL">All Active/Inactive</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Date Filters & Sort */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Purchase Month/Year</label>
            <div className="grid grid-cols-2 gap-1">
              <select
                value={purchaseMonth || ''}
                onChange={(e) => {
                  setPurchaseMonth(e.target.value ? Number(e.target.value) : undefined);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
              >
                <option value="">Month</option>
                {MONTH_NAMES.map(m => (
                  <option key={m.value} value={m.value}>{m.label.slice(0, 3)}</option>
                ))}
              </select>

              <select
                value={purchaseYear || ''}
                onChange={(e) => {
                  setPurchaseYear(e.target.value ? Number(e.target.value) : undefined);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
              >
                <option value="">Year</option>
                {getAvailableYears().map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Month/Year</label>
            <div className="grid grid-cols-2 gap-1">
              <select
                value={expiryMonth || ''}
                onChange={(e) => {
                  setExpiryMonth(e.target.value ? Number(e.target.value) : undefined);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
              >
                <option value="">Month</option>
                {MONTH_NAMES.map(m => (
                  <option key={m.value} value={m.value}>{m.label.slice(0, 3)}</option>
                ))}
              </select>

              <select
                value={expiryYear || ''}
                onChange={(e) => {
                  setExpiryYear(e.target.value ? Number(e.target.value) : undefined);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
              >
                <option value="">Year</option>
                {getAvailableYears().map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="newest">Newest Purchase</option>
              <option value="oldest">Oldest Purchase</option>
              <option value="expiring_soon">Expiring Soonest</option>
              <option value="recently_renewed">Recently Renewed</option>
              <option value="client_asc">Client Name (A-Z)</option>
              <option value="client_desc">Client Name (Z-A)</option>
            </select>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Records Display */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-14">Sr. No.</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Website Name</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Domain Expiry</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Renew Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No website records found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => {
                    const expiry = calculateDomainExpiry(item.domainExpiryDate);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-500">#{item.srNo}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{item.clientName}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{item.websiteName}</td>
                        <td className="py-3 px-4 font-mono text-brand-600 font-semibold">
                          <a href={item.websiteLink || `https://${item.domain}`} target="_blank" rel="noreferrer" className="hover:underline">
                            {item.domain}
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                            {item.categoryName || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge type="websiteStatus" value={item.websiteStatus} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{formatIndianDate(item.domainExpiryDate)}</span>
                            <span className={`text-[10px] font-bold ${expiry.badgeText}`}>{expiry.status}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge type="paymentStatus" value={item.paymentStatus} />
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">
                          {formatIndianDate(item.renewDate)}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => navigate(`/websites/${item.id}`)}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                            title="View Detail Card"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isManage && (
                            <button
                              onClick={() => navigate(`/websites/${item.id}/edit`)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                              title="Edit Record"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Record (Requires PIN)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
            totalItems={filteredList.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      ) : (
        /* Grid Cards View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedList.map(item => {
              const exp = calculateDomainExpiry(item.domainExpiryDate);
              return (
                <div key={item.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-400">#{item.srNo}</span>
                      <StatusBadge type="websiteStatus" value={item.websiteStatus} />
                    </div>
                    <div className="flex items-center space-x-3">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm">
                          {item.clientName?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">{item.clientName}</h3>
                        <p className="text-xs text-slate-500 font-medium">{item.websiteName}</p>
                      </div>
                    </div>
                    <div className="pt-2 text-xs font-mono text-brand-600 font-semibold break-all">
                      {item.domain}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Category:</span>
                      <strong className="text-slate-800">{item.categoryName || 'General'}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Domain Expiry:</span>
                      <strong className={exp.badgeText}>{formatIndianDate(item.domainExpiryDate)} ({exp.status})</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Payment:</span>
                      <StatusBadge type="paymentStatus" value={item.paymentStatus} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/websites/${item.id}`)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                    {isManage && (
                      <button
                        onClick={() => navigate(`/websites/${item.id}/edit`)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredList.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Delete PIN Verification Modal */}
      <SecurityPinModal
        isOpen={!!deleteTarget}
        title="Delete Website Client Record"
        description="Deleting a website client record requires valid 4-digit Access PIN verification."
        actionName="Verify & Delete Record"
        targetCollection="websites"
        targetId={deleteTarget?.id}
        targetName={deleteTarget?.websiteName || deleteTarget?.domain}
        onVerified={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardLayout>
  );
};
