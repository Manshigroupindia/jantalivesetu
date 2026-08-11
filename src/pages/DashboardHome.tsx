import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { 
  Globe, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  CreditCard, 
  Server, 
  Share2, 
  Search, 
  Eye, 
  Edit, 
  Plus, 
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { subscribeToWebsites, filterWebsites } from '../firebase/services/websiteService';
import { fetchCategories } from '../firebase/services/categoryService';
import { subscribeToPlatformAccounts } from '../firebase/services/platformService';
import { subscribeToSocialAccounts } from '../firebase/services/socialService';
import { WebsiteClientData, Category, PlatformAccount, SocialAccount } from '../types';
import { calculateDomainExpiry, formatIndianDate } from '../utils/dateUtils';
import { StatusBadge } from '../components/common/StatusBadge';
import { Pagination } from '../components/common/Pagination';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

export const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const { isManage } = useAuth();
  const { expiringIn7Days, expiringIn30Days, expiredWebsites } = useNotifications();

  const [websites, setWebsites] = useState<WebsiteClientData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [platforms, setPlatforms] = useState<PlatformAccount[]>([]);
  const [socials, setSocials] = useState<SocialAccount[]>([]);

  // Table State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const unsubWebsites = subscribeToWebsites((data) => setWebsites(data));
    const unsubPlatforms = subscribeToPlatformAccounts((data) => setPlatforms(data));
    const unsubSocials = subscribeToSocialAccounts((data) => setSocials(data));
    fetchCategories().then(cats => setCategories(cats));

    return () => {
      unsubWebsites();
      unsubPlatforms();
      unsubSocials();
    };
  }, []);

  // Summary Card Metrics
  const totalWebsites = websites.length;
  const completedCount = websites.filter(w => w.websiteStatus === 'Complete').length;
  const uncompletedCount = websites.filter(w => w.websiteStatus === 'Uncomplete').length;
  const activeCount = websites.filter(w => w.active === 'Active').length;
  
  const currentYear = new Date().getFullYear();
  const purchasedThisYear = websites.filter(w => {
    if (!w.domainPurchaseDate) return false;
    return new Date(w.domainPurchaseDate).getFullYear() === currentYear;
  }).length;

  const expiringSoonCount = websites.filter(w => {
    const exp = calculateDomainExpiry(w.domainExpiryDate);
    return exp.daysRemaining >= 0 && exp.daysRemaining <= 60;
  }).length;

  const pendingPaymentsCount = websites.filter(w => w.paymentStatus === 'Pending').length;
  const paidPaymentsCount = websites.filter(w => w.paymentStatus === 'Paid').length;

  // Filtered websites for table
  const filteredList = filterWebsites(
    websites,
    searchTerm,
    {
      category: selectedCategory,
      websiteStatus: selectedStatus,
      paymentStatus: selectedPaymentStatus,
    },
    'newest'
  );

  const paginatedWebsites = filteredList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <DashboardLayout title="Dashboard Home">
      {/* 1. Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Websites</span>
            <Globe className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{totalWebsites}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-emerald-700">{completedCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Uncompleted</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-extrabold text-amber-700">{uncompletedCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Expiring Soon</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-extrabold text-rose-700">{expiringSoonCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Bought {currentYear}</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{purchasedThisYear}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{activeCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending Pay</span>
            <CreditCard className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-extrabold text-rose-600">{pendingPaymentsCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Hosting Accts</span>
            <Server className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-extrabold text-indigo-700">{platforms.length}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Social Accts</span>
            <Share2 className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl font-extrabold text-sky-700">{socials.length}</p>
        </div>
      </div>

      {/* 2. Urgent Domain Expiry Alerts Banner (Section 23) */}
      {(expiringIn7Days.length > 0 || expiredWebsites.length > 0) && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Urgent Domain Expiry Action Required ({expiringIn7Days.length + expiredWebsites.length})</span>
            </div>
            <Link to="/websites?filter=expiring" className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline">
              View All Expiring →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[...expiredWebsites, ...expiringIn7Days].slice(0, 6).map((item) => {
              const exp = calculateDomainExpiry(item.domainExpiryDate);
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/websites/${item.id}`)}
                  className="bg-white p-3 rounded-lg border border-rose-200 hover:border-rose-400 cursor-pointer shadow-2xs transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.clientName}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{item.domain}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${exp.badgeClass}`}>
                      {exp.daysRemaining < 0 ? 'EXPIRED' : `${exp.daysRemaining} days left`}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatIndianDate(item.domainExpiryDate)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Main "Client Data" Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Top Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Client Data Directory</h3>
            <span className="text-xs text-slate-400 font-normal">({filteredList.length} total)</span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search client, domain, name..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Quick Status Filter */}
            <select
              value={selectedPaymentStatus}
              onChange={(e) => {
                setSelectedPaymentStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none"
            >
              <option value="ALL">All Payments</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending Only</option>
            </select>

            {isManage && (
              <button
                type="button"
                onClick={() => navigate('/websites/new')}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center space-x-1 flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
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
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {paginatedWebsites.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No client website data found matching your query.
                  </td>
                </tr>
              ) : (
                paginatedWebsites.map((item) => {
                  const expiryInfo = calculateDomainExpiry(item.domainExpiryDate);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-500">
                        #{item.srNo}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.clientName}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {item.websiteName}
                      </td>
                      <td className="py-3 px-4 font-mono text-brand-600 font-semibold">
                        <a
                          href={item.websiteLink || `https://${item.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
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
                          <span className={`text-[10px] font-bold ${expiryInfo.badgeText}`}>
                            {expiryInfo.status}
                          </span>
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
                          title="View Details"
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
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
    </DashboardLayout>
  );
};
