import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Globe, ArrowLeft, Save, ShieldAlert } from 'lucide-react';
import { 
  createWebsite, 
  updateWebsite, 
  fetchWebsiteById, 
  getNextSrNo 
} from '../firebase/services/websiteService';
import { fetchCategories } from '../firebase/services/categoryService';
import { WebsiteClientData, Category } from '../types';
import { formatLast4CardDigits } from '../utils/security';
import { ImageUploader } from '../components/common/ImageUploader';
import { PreviewModal } from '../components/common/PreviewModal';
import { useAuth } from '../contexts/AuthContext';
import { useSecurity } from '../contexts/SecurityContext';

export const WebsiteFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { requestSecurityVerification } = useSecurity();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isEditMode);

  // Form Fields
  const [srNo, setSrNo] = useState<number>(1);
  const [clientName, setClientName] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [domain, setDomain] = useState('');
  const [domainPurchaseDate, setDomainPurchaseDate] = useState('');
  const [domainExpiryDate, setDomainExpiryDate] = useState('');
  const [domainBuyPlatform, setDomainBuyPlatform] = useState('GoDaddy');
  const [domainBuyCard, setDomainBuyCard] = useState('');
  const [hostingApp, setHostingApp] = useState('Vercel');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailId, setEmailId] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [websiteStatus, setWebsiteStatus] = useState<'Complete' | 'Uncomplete'>('Complete');
  const [websiteLink, setWebsiteLink] = useState('');
  const [websiteAdminUserId, setWebsiteAdminUserId] = useState('');
  const [websiteAdminPassword, setWebsiteAdminPassword] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online' | 'RTGS' | 'NEFT' | 'UPI'>('Online');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [active, setActive] = useState<'Active' | 'Inactive'>('Active');
  const [renewDate, setRenewDate] = useState('');
  const [feedback, setFeedback] = useState('');
  const [hostingId, setHostingId] = useState('');
  const [hostingPassword, setHostingPassword] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Form & Preview state
  const [formError, setFormError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories().then(cats => {
      setCategories(cats);
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id);
      }
    });

    if (isEditMode && id) {
      // Require security check when editing existing record
      requestSecurityVerification(
        async () => {
          const data = await fetchWebsiteById(id);
          if (data) {
            setSrNo(data.srNo);
            setClientName(data.clientName || '');
            setWebsiteName(data.websiteName || '');
            setCategoryId(data.categoryId || '');
            setDomain(data.domain || '');
            setDomainPurchaseDate(data.domainPurchaseDate || '');
            setDomainExpiryDate(data.domainExpiryDate || '');
            setDomainBuyPlatform(data.domainBuyPlatform || 'GoDaddy');
            setDomainBuyCard(data.domainBuyCard || '');
            setHostingApp(data.hostingApp || '');
            setPhoneNumber(data.phoneNumber || '');
            setEmailId(data.emailId || '');
            setContactPersonName(data.contactPersonName || '');
            setWebsiteStatus(data.websiteStatus || 'Complete');
            setWebsiteLink(data.websiteLink || '');
            setWebsiteAdminUserId(data.websiteAdminUserId || '');
            setWebsiteAdminPassword(data.websiteAdminPassword || '');
            setPaymentMethod(data.paymentMethod || 'Online');
            setPaymentStatus(data.paymentStatus || 'Paid');
            setActive(data.active || 'Active');
            setRenewDate(data.renewDate || '');
            setFeedback(data.feedback || '');
            setHostingId(data.hostingId || '');
            setHostingPassword(data.hostingPassword || '');
            setLogoUrl(data.logoUrl || '');
            setAdditionalNotes(data.additionalNotes || '');
          } else {
            navigate('/websites');
          }
          setLoading(false);
        },
        'Authorize Editing',
        'Please enter Website Access Password to edit existing website record.'
      );
    } else {
      getNextSrNo().then(nextNo => setSrNo(nextNo));
    }
  }, [id, isEditMode]);

  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const formatted = formatLast4CardDigits(val);
    setDomainBuyCard(formatted);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!clientName.trim()) {
      setFormError('Client Name is required.');
      return;
    }
    if (!websiteName.trim()) {
      setFormError('Website Name is required.');
      return;
    }
    if (!domain.trim()) {
      setFormError('Domain Name is required.');
      return;
    }

    // Date Logic Validation: Expiry cannot be before Purchase Date
    if (domainPurchaseDate && domainExpiryDate) {
      const purchaseTime = new Date(domainPurchaseDate).getTime();
      const expiryTime = new Date(domainExpiryDate).getTime();
      if (expiryTime < purchaseTime) {
        setFormError('Domain Expiry Date cannot be earlier than Domain Purchase Date.');
        return;
      }
    }

    // Open Step 2 Preview Screen ("Review Before Saving")
    setPreviewOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    setFormError('');

    try {
      const selectedCat = categories.find(c => c.id === categoryId);
      const payload = {
        srNo,
        clientName,
        websiteName,
        categoryId,
        categoryName: selectedCat ? selectedCat.name : '',
        domain,
        domainPurchaseDate,
        domainExpiryDate,
        domainBuyPlatform,
        domainBuyCard,
        hostingApp,
        phoneNumber,
        emailId,
        contactPersonName,
        websiteStatus,
        websiteLink,
        websiteAdminUserId,
        websiteAdminPassword,
        paymentMethod,
        paymentStatus,
        active,
        renewDate,
        feedback,
        hostingId,
        hostingPassword,
        logoUrl,
        additionalNotes,
      };

      if (isEditMode && id) {
        await updateWebsite(id, payload, currentUser?.uid || 'system');
      } else {
        await createWebsite(payload, currentUser?.uid || 'system');
      }

      setPreviewOpen(false);
      navigate('/websites');
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to save website record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCatObj = categories.find(c => c.id === categoryId);

  const previewFields = [
    { label: 'Sr. No.', value: `#${srNo}` },
    { label: 'Client Name', value: clientName },
    { label: 'Website Name', value: websiteName },
    { label: 'Category', value: selectedCatObj?.name || 'Uncategorized' },
    { label: 'Domain', value: domain },
    { label: 'Purchase Date', value: domainPurchaseDate },
    { label: 'Expiry Date', value: domainExpiryDate },
    { label: 'Purchase Platform', value: domainBuyPlatform },
    { label: 'Card (Last 4)', value: domainBuyCard || 'N/A' },
    { label: 'Hosting App', value: hostingApp },
    { label: 'Client Phone', value: phoneNumber },
    { label: 'Client Email', value: emailId },
    { label: 'Contact Person', value: contactPersonName },
    { label: 'Website Status', value: websiteStatus },
    { label: 'Payment Method', value: paymentMethod },
    { label: 'Payment Status', value: paymentStatus },
    { label: 'Active Status', value: active },
    { label: 'Renew Date', value: renewDate },
    { label: 'Admin User ID', value: websiteAdminUserId },
    { label: 'Admin Password', value: websiteAdminPassword, isPassword: true },
    { label: 'Hosting ID', value: hostingId },
    { label: 'Hosting Password', value: hostingPassword, isPassword: true },
    { label: 'Feedback', value: feedback, isFullWidth: true },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Website Form">
        <div className="py-20 text-center text-slate-400 text-xs font-medium">Loading website form...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={isEditMode ? 'Edit Website Record' : 'Add New Website Record'}>
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/websites')}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEditMode ? `Edit Website Record #${srNo}` : 'Add Website / Client Data'}
            </h2>
            <p className="text-xs text-slate-500">
              Fill all relevant fields below. Step 2 will let you preview before saving to Firestore.
            </p>
          </div>
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* SECTION 1: CLIENT & WEBSITE BASIC INFO */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
            1. Client & Website Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sr. No.</label>
              <input
                type="number"
                value={srNo}
                onChange={(e) => setSrNo(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website Name *</label>
              <input
                type="text"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                placeholder="e.g. Acme E-Commerce Portal"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person Name</label>
              <input
                type="text"
                value={contactPersonName}
                onChange={(e) => setContactPersonName(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email ID</label>
              <input
                type="email"
                value={emailId}
                onChange={(e) => setEmailId(e.target.value)}
                placeholder="client@acme.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website Link / URL</label>
              <input
                type="url"
                value={websiteLink}
                onChange={(e) => setWebsiteLink(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website Status</label>
              <select
                value={websiteStatus}
                onChange={(e) => setWebsiteStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              >
                <option value="Complete">Complete</option>
                <option value="Uncomplete">Uncomplete</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: DOMAIN DETAILS */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
            2. Domain Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Domain Name *</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Domain Purchase Date</label>
              <input
                type="date"
                value={domainPurchaseDate}
                onChange={(e) => setDomainPurchaseDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Domain Expiry Date</label>
              <input
                type="date"
                value={domainExpiryDate}
                onChange={(e) => setDomainExpiryDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Domain Buy Platform</label>
              <input
                type="text"
                value={domainBuyPlatform}
                onChange={(e) => setDomainBuyPlatform(e.target.value)}
                placeholder="Domain India, GoDaddy, Namecheap..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Domain Buy Card <span className="text-[10px] text-amber-600 font-normal">(Last 4 digits only)</span>
              </label>
              <input
                type="text"
                value={domainBuyCard}
                onChange={handleCardInputChange}
                placeholder="**** 4821"
                maxLength={9}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Renew Date</label>
              <input
                type="date"
                value={renewDate}
                onChange={(e) => setRenewDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: HOSTING & ADMIN CREDENTIALS */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
            3. Hosting & Website Credentials (Protected)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hosting App / Provider</label>
              <input
                type="text"
                value={hostingApp}
                onChange={(e) => setHostingApp(e.target.value)}
                placeholder="Vercel, Hostinger, AWS..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hosting ID / Username</label>
              <input
                type="text"
                value={hostingId}
                onChange={(e) => setHostingId(e.target.value)}
                placeholder="Hosting ID..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hosting Password</label>
              <input
                type="password"
                value={hostingPassword}
                onChange={(e) => setHostingPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website Admin User ID</label>
              <input
                type="text"
                value={websiteAdminUserId}
                onChange={(e) => setWebsiteAdminUserId(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website Admin Password</label>
              <input
                type="password"
                value={websiteAdminPassword}
                onChange={(e) => setWebsiteAdminPassword(e.target.value)}
                placeholder="Admin password..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: PAYMENT & ASSETS */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
            4. Payment & Image Assets
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              >
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
                <option value="RTGS">RTGS</option>
                <option value="NEFT">NEFT</option>
                <option value="UPI">UPI</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Active Status</label>
              <select
                value={active}
                onChange={(e) => setActive(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <ImageUploader
                value={logoUrl}
                onChange={(url) => setLogoUrl(url)}
                label="Website / Client Logo (Cloudinary)"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
                placeholder="Client feedback notes..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-medium"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Notes</label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/websites')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-md transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Proceed to Preview →</span>
          </button>
        </div>
      </form>

      {/* Step 2 Review Modal */}
      <PreviewModal
        isOpen={previewOpen}
        title="Review Before Saving"
        subtitle="Check all entered client data carefully before committing to Firestore."
        fields={previewFields}
        onConfirm={handleConfirmSave}
        onEdit={() => setPreviewOpen(false)}
        onCancel={() => setPreviewOpen(false)}
        isSubmitting={isSubmitting}
      />
    </DashboardLayout>
  );
};
