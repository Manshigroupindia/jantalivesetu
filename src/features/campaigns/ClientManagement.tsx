import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Users,
  Plus,
  Search,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  Building,
  Edit3,
  Trash2,
  Eye,
  Tag,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square
} from 'lucide-react';
import { Client, ClientCategory } from '../../types/campaign';
import {
  fetchClients,
  createClient,
  updateClient,
  deleteClient,
  bulkUpdateClientsStatus,
  fetchCategories,
} from '../../services/campaignService';
import { formatPhone, downloadFile } from '../../utils/phoneUtils';
import { generateCSV } from '../../utils/csvUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { ClientImportWizard } from './ClientImportWizard';
import { CategoryManagerModal } from './CategoryManagerModal';

export const ClientManagement: React.FC = () => {
  const { userDoc } = useAuth();
  const { showToast, showConfirm } = useNotification();

  // Data states
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<ClientCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');
  const [consentFilter, setConsentFilter] = useState<'ALL' | 'yes' | 'no'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc'>('newest');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Selection states for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCategory, setFormCategory] = useState('Corporate');
  const [formConsent, setFormConsent] = useState(true);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formNotes, setFormNotes] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);

  // Load clients & categories
  const loadData = async () => {
    setLoading(true);
    try {
      const [clientData, catData] = await Promise.all([
        fetchClients(),
        fetchCategories(),
      ]);
      setClients(clientData);
      setCategories(catData);
    } catch (err: any) {
      console.error('Error loading client data:', err);
      showToast('Failed to load clients database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter and Sort logic
  const filteredClients = useMemo(() => {
    return clients
      .filter((c) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = c.name.toLowerCase().includes(q);
          const matchPhone = c.phone.includes(q) || c.normalizedPhone.includes(q);
          const matchCompany = (c.company || '').toLowerCase().includes(q);
          if (!matchName && !matchPhone && !matchCompany) return false;
        }

        // Category filter
        if (categoryFilter !== 'ALL' && c.category !== categoryFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'ALL' && c.status !== statusFilter) {
          return false;
        }

        // Consent filter
        if (consentFilter === 'yes' && !c.whatsappConsent) return false;
        if (consentFilter === 'no' && c.whatsappConsent) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [clients, searchQuery, categoryFilter, statusFilter, consentFilter, sortBy]);

  // Pagination calculation
  const totalRecords = filteredClients.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, page, pageSize]);

  // Adjust page if filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, statusFilter, consentFilter, sortBy]);

  // Bulk select toggles
  const handleSelectAllOnPage = () => {
    const next = new Set(selectedIds);
    const allPageSelected = paginatedClients.every((c) => next.has(c.id));

    if (allPageSelected) {
      paginatedClients.forEach((c) => next.delete(c.id));
    } else {
      paginatedClients.forEach((c) => next.add(c.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Bulk actions
  const handleBulkStatusChange = async (status: 'active' | 'inactive') => {
    if (selectedIds.size === 0) return;

    showConfirm({
      title: `Bulk ${status === 'active' ? 'Activate' : 'Deactivate'} Clients`,
      message: `Are you sure you want to change status to "${status.toUpperCase()}" for ${selectedIds.size} selected client(s)?`,
      confirmText: `Confirm (${selectedIds.size})`,
      onConfirm: async () => {
        try {
          await bulkUpdateClientsStatus(Array.from(selectedIds), status);
          showToast(`Successfully updated ${selectedIds.size} client(s).`, 'success');
          setSelectedIds(new Set());
          loadData();
        } catch (err: any) {
          showToast(err?.message || 'Failed to update clients.', 'error');
        }
      },
    });
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormName('');
    setFormPhone('');
    setFormCompany('');
    setFormEmail('');
    setFormCategory(categories[0]?.name || 'Corporate');
    setFormConsent(true);
    setFormStatus('active');
    setFormNotes('');
    setAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c: Client) => {
    setEditingClient(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormCompany(c.company || '');
    setFormEmail(c.email || '');
    setFormCategory(c.category);
    setFormConsent(c.whatsappConsent);
    setFormStatus(c.status);
    setFormNotes(c.notes || '');
    setAddEditModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      showToast('Client Name and Mobile Number are required.', 'warning');
      return;
    }

    setSubmittingForm(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: formName.trim(),
          phone: formPhone.trim(),
          company: formCompany.trim(),
          email: formEmail.trim(),
          category: formCategory,
          whatsappConsent: formConsent,
          status: formStatus,
          notes: formNotes.trim(),
        });
        showToast('Client details updated successfully.', 'success');
      } else {
        await createClient(
          {
            name: formName.trim(),
            phone: formPhone.trim(),
            company: formCompany.trim(),
            email: formEmail.trim(),
            category: formCategory,
            whatsappConsent: formConsent,
            status: formStatus,
            notes: formNotes.trim(),
          },
          userDoc?.uid,
          userDoc?.name
        );
        showToast('Client added to database.', 'success');
      }
      setAddEditModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save client.', 'error');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Delete single client
  const handleDeleteClient = (c: Client) => {
    showConfirm({
      title: 'Delete Client',
      message: `Are you sure you want to permanently delete "${c.name}" (${c.phone})? This client will no longer receive WhatsApp campaigns.`,
      isDanger: true,
      confirmText: 'Delete Client',
      onConfirm: async () => {
        try {
          await deleteClient(c.id);
          showToast(`Client "${c.name}" deleted.`, 'success');
          loadData();
        } catch (err: any) {
          showToast(err?.message || 'Failed to delete client.', 'error');
        }
      },
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (clients.length === 0) {
      showToast('No clients available to export.', 'warning');
      return;
    }

    const csvData = generateCSV(filteredClients, [
      { key: 'name', label: 'Full Name' },
      { key: 'phone', label: 'Mobile Number' },
      { key: 'normalizedPhone', label: 'Normalized Phone (E.164)' },
      { key: 'company', label: 'Company' },
      { key: 'email', label: 'Email' },
      { key: 'category', label: 'Category' },
      { key: 'whatsappConsent', label: 'WhatsApp Consent' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Date Added' },
      { key: 'notes', label: 'Notes' },
    ]);

    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(csvData, `JantaLive_Clients_${timestamp}.csv`, 'text/csv;charset=utf-8;');
    showToast(`Exported ${filteredClients.length} client(s) to CSV.`, 'success');
  };

  // Metrics
  const activeCount = useMemo(() => clients.filter((c) => c.status === 'active').length, [clients]);
  const consentCount = useMemo(
    () => clients.filter((c) => c.status === 'active' && c.whatsappConsent).length,
    [clients]
  );

  return (
    <div className="space-y-6">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            Client Directory & Segmentation
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Manage your verified contact database for native WhatsApp Business Broadcast campaigns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Tag className="w-3.5 h-3.5" />}
            onClick={() => setCategoryModalOpen(true)}
          >
            Categories ({categories.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setImportWizardOpen(true)}
          >
            Import CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenAdd}
          >
            Add Client
          </Button>
        </div>
      </div>

      {/* METRICS TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider block">
            Total Clients
          </span>
          <span className="text-2xl font-black text-gray-900 font-mono mt-1 block">{clients.length}</span>
          <span className="text-[10px] text-gray-400 font-semibold">in database</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider block">
            Active Clients
          </span>
          <span className="text-2xl font-black text-emerald-700 font-mono mt-1 block">{activeCount}</span>
          <span className="text-[10px] text-emerald-600 font-semibold">eligible for broadcasts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-extrabold text-brand-600 uppercase tracking-wider block">
            WhatsApp Opted-in
          </span>
          <span className="text-2xl font-black text-brand-700 font-mono mt-1 block">{consentCount}</span>
          <span className="text-[10px] text-brand-600 font-semibold">with marketing consent</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-extrabold text-purple-600 uppercase tracking-wider block">
            Broadcast Batches
          </span>
          <span className="text-2xl font-black text-purple-700 font-mono mt-1 block">
            {Math.ceil(consentCount / 256) || 0}
          </span>
          <span className="text-[10px] text-purple-600 font-semibold">max 256 contacts/list</span>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-4">
            <Input
              placeholder="Search by name, mobile, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-gray-400" />}
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* WhatsApp Consent Filter */}
          <div className="md:col-span-2">
            <select
              value={consentFilter}
              onChange={(e) => setConsentFilter(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Consent</option>
              <option value="yes">Consented (Yes)</option>
              <option value="no">No Consent (No)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="newest">Sort: Newest Added</option>
              <option value="oldest">Sort: Oldest Added</option>
              <option value="name_asc">Sort: Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* BULK ACTIONS STRIP */}
        {selectedIds.size > 0 && (
          <div className="p-3 bg-brand-50/80 rounded-xl border border-brand-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-brand-900">
              {selectedIds.size} client(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => handleBulkStatusChange('active')}
              >
                Mark Active
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                onClick={() => handleBulkStatusChange('inactive')}
              >
                Mark Inactive
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Deselect All
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* CLIENTS TABLE */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 animate-pulse text-xs">
            Loading clients database...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <Users className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-bold text-gray-600">No client records found</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || consentFilter !== 'ALL'
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Get started by adding your first client or importing from a CSV.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="p-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllOnPage}
                      className="text-gray-400 hover:text-brand-600"
                    >
                      {paginatedClients.length > 0 && paginatedClients.every((c) => selectedIds.has(c.id)) ? (
                        <CheckSquare className="w-4 h-4 text-brand-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">Client & Company</th>
                  <th className="p-3">Mobile Number</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-center">WhatsApp Consent</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Date Added</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedClients.map((client) => {
                  const isSelected = selectedIds.has(client.id);
                  return (
                    <tr
                      key={client.id}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        isSelected ? 'bg-brand-50/40' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(client.id)}
                          className="text-gray-400 hover:text-brand-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Name & Company */}
                      <td className="p-3">
                        <div className="font-bold text-gray-900 text-sm">{client.name}</div>
                        {client.company && (
                          <div className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Building className="w-3 h-3 text-gray-400" />
                            {client.company}
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="p-3 font-mono font-medium text-gray-700">
                        {formatPhone(client.phone)}
                      </td>

                      {/* Category */}
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold text-[11px]">
                          {client.category || 'Other'}
                        </span>
                      </td>

                      {/* WhatsApp Consent */}
                      <td className="p-3 text-center">
                        {client.whatsappConsent ? (
                          <Badge variant="success" size="sm" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Consented
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="sm" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            No Consent
                          </Badge>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <Badge
                          variant={client.status === 'active' ? 'brand' : 'neutral'}
                          size="sm"
                        >
                          {client.status.toUpperCase()}
                        </Badge>
                      </td>

                      {/* Date Added */}
                      <td className="p-3 text-gray-500 text-[11px]">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setViewingClient(client)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"
                            title="View Client Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(client)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"
                            title="Edit Client"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete Client"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {!loading && filteredClients.length > 0 && (
          <div className="p-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-gray-50/50">
            <span className="text-gray-500">
              Showing <span className="font-bold">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold">
                {Math.min(page * pageSize, filteredClients.length)}
              </span>{' '}
              of <span className="font-bold">{filteredClients.length}</span> clients
            </span>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="text-xs p-1.5 rounded-lg border border-gray-200 bg-white font-medium"
              >
                <option value={15}>15 per page</option>
                <option value={30}>30 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="px-2 font-bold text-gray-700">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ADD / EDIT CLIENT MODAL */}
      <Modal
        isOpen={addEditModalOpen}
        onClose={() => setAddEditModalOpen(false)}
        title={editingClient ? 'Edit Client Record' : 'Add New Client'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveClient} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Ramesh Sharma"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mobile Number (with country code) *"
              placeholder="e.g. +91 98765 43210"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              helperText="Indian 10-digit mobile number starting with 6, 7, 8, or 9"
              required
            />

            <Input
              label="Company Name (Optional)"
              placeholder="e.g. Sharma Traders"
              value={formCompany}
              onChange={(e) => setFormCompany(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address (Optional)"
              type="email"
              placeholder="e.g. ramesh@example.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Client Category *
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                WhatsApp Marketing Consent *
              </label>
              <select
                value={formConsent ? 'yes' : 'no'}
                onChange={(e) => setFormConsent(e.target.value === 'yes')}
                className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white font-semibold"
              >
                <option value="yes">Yes (Opted In / Consented)</option>
                <option value="no">No (Not Consented)</option>
              </select>
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Required to receive WhatsApp Broadcast campaigns
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Client Status *
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white font-semibold"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Inactive clients are automatically excluded
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Key advertiser, preferred festival greeting recipient"
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setAddEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingForm}>
              {editingClient ? 'Save Changes' : 'Create Client'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW CLIENT DETAILS MODAL */}
      {viewingClient && (
        <Modal
          isOpen={Boolean(viewingClient)}
          onClose={() => setViewingClient(null)}
          title="Client Information"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-brand-50/50 border border-brand-100">
              <div className="w-12 h-12 rounded-xl bg-brand-600 text-white font-black text-lg flex items-center justify-center shrink-0">
                {viewingClient.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <h4 className="text-base font-extrabold text-gray-900 truncate">
                  {viewingClient.name}
                </h4>
                <p className="text-gray-500 font-medium">
                  {viewingClient.company || 'Individual Client'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Mobile</span>
                <span className="text-sm font-black font-mono text-gray-900 block mt-0.5">
                  {formatPhone(viewingClient.phone)}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  E.164: {viewingClient.normalizedPhone}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Email</span>
                <span className="text-xs font-semibold text-gray-800 block mt-0.5 truncate">
                  {viewingClient.email || 'None'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Category</span>
                <span className="text-xs font-bold text-brand-700 block mt-0.5">
                  {viewingClient.category}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Status</span>
                <span className="mt-0.5 block">
                  <Badge variant={viewingClient.status === 'active' ? 'success' : 'neutral'} size="sm">
                    {viewingClient.status.toUpperCase()}
                  </Badge>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">
                WhatsApp Marketing Consent
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {viewingClient.whatsappConsent ? (
                  <Badge variant="success" size="sm" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Consent Given ({viewingClient.consentSource || 'Direct'})
                  </Badge>
                ) : (
                  <Badge variant="danger" size="sm" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    No Consent Recorded
                  </Badge>
                )}
                {viewingClient.consentDate && (
                  <span className="text-[10px] text-gray-400">
                    since {new Date(viewingClient.consentDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {viewingClient.notes && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Notes / Remarks
                </span>
                <p className="text-gray-700">{viewingClient.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t text-[11px] text-gray-400">
              <span>Added: {new Date(viewingClient.createdAt).toLocaleDateString()}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const c = viewingClient;
                    setViewingClient(null);
                    handleOpenEdit(c);
                  }}
                >
                  Edit Client
                </Button>
                <Button variant="primary" size="sm" onClick={() => setViewingClient(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* IMPORT WIZARD */}
      <ClientImportWizard
        isOpen={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        existingClients={clients}
        onImportComplete={loadData}
      />

      {/* CATEGORY MANAGER */}
      <CategoryManagerModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        onRefresh={loadData}
      />
    </div>
  );
};
