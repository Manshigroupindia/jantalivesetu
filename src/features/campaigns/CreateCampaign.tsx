import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Send,
  Image as ImageIcon,
  MessageSquare,
  Users,
  CheckCircle2,
  Upload,
  Trash2,
  Copy,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info,
  Eye,
  Check,
  Radio
} from 'lucide-react';
import {
  Campaign,
  CampaignType,
  CAMPAIGN_TYPES,
  Client,
  ClientCategory,
} from '../../types/campaign';
import {
  fetchClients,
  fetchCategories,
  createCampaign,
} from '../../services/campaignService';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { normalizePhone, formatPhone } from '../../utils/phoneUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useNotification } from '../../contexts/NotificationContext';

const QUICK_EMOJIS = ['🎉', '🙏', '✨', '🪔', '📢', '📌', '💼', '📞', '🌐', '👍', '💐', '🔔'];

interface CreateCampaignProps {
  initialCampaign?: Campaign | null;
  onCampaignCreated?: (campaignId: string) => void;
}

export const CreateCampaign: React.FC<CreateCampaignProps> = ({
  initialCampaign,
  onCampaignCreated,
}) => {
  const navigate = useNavigate();
  const { userDoc } = useAuth();
  const { companySettings } = useCompany();
  const { showToast } = useNotification();

  // Wizard Step: 1 to 5
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<ClientCategory[]>([]);
  // STEP 1: Campaign Information
  const [campaignName, setCampaignName] = useState(initialCampaign?.campaignName || '');
  const [campaignType, setCampaignType] = useState<CampaignType>(
    initialCampaign?.campaignType || 'Festival Wishes'
  );
  const [description, setDescription] = useState(initialCampaign?.description || '');

  // STEP 2: Upload Image
  const [imageUrl, setImageUrl] = useState(initialCampaign?.imageUrl || '');
  const [imagePublicId, setImagePublicId] = useState(initialCampaign?.imagePublicId || '');
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // STEP 3: Compose Message
  const [message, setMessage] = useState(
    initialCampaign?.message ||
      `Dear {{name}},\n\nWishing you and your family a very joyful occasion!\nMay success and prosperity be with you.\n\nWarm Regards,\n${
        companySettings?.companyName || 'Janta Live'
      }`
  );
  const [websiteUrl, setWebsiteUrl] = useState(initialCampaign?.websiteUrl || '');
  const [contactDetails, setContactDetails] = useState(
    initialCampaign?.contactDetails || companySettings?.helplineNumber || companySettings?.phoneNumbers?.[0] || ''
  );
  const [previewClientId, setPreviewClientId] = useState<string>('');

  // STEP 4: Select Recipients
  const [audienceType, setAudienceType] = useState<'all' | 'selected' | 'category'>(
    initialCampaign?.audienceType || 'all'
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCampaign?.selectedCategories || []
  );
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(
    new Set(initialCampaign?.selectedClientIds || [])
  );
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientCatFilter, setRecipientCatFilter] = useState('ALL');

  // STEP 5: Confirmation Modal & Submitting
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load clients and categories
  useEffect(() => {
    const load = async () => {
      try {
        const [cData, catData] = await Promise.all([fetchClients(), fetchCategories()]);
        setClients(cData);
        setCategories(catData);
        if (cData.length > 0 && !previewClientId) {
          setPreviewClientId(cData[0].id);
        }
      } catch (err: any) {
        showToast('Failed to load clients list.', 'error');
      }
    };
    load();
  }, []);

  // Handle Image Upload to Cloudinary
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format
    const validFormats = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validFormats.includes(file.type)) {
      showToast('Please upload an image in JPG, PNG, or WebP format.', 'warning');
      return;
    }

    // Validate size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      showToast('Image size exceeds 8MB. Please choose a smaller image.', 'warning');
      return;
    }

    setImageUploading(true);
    setUploadProgress(10);

    try {
      const res = await uploadToCloudinary(
        file,
        'janta-live-setu/campaigns',
        'image',
        (pct) => setUploadProgress(pct)
      );

      setImageUrl(res.secureUrl);
      setImagePublicId(res.publicId);
      showToast('Campaign image uploaded to Cloudinary.', 'success');
    } catch (err: any) {
      console.error('Cloudinary upload error:', err);
      showToast('Failed to upload image. Please try again.', 'error');
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImagePublicId('');
  };

  // Insert Variable into Message
  const handleInsertVariable = (variable: string) => {
    setMessage((prev) => `${prev} {{${variable}}}`);
  };

  const handleInsertEmoji = (emoji: string) => {
    setMessage((prev) => `${prev} ${emoji}`);
  };

  // Preview target client
  const previewClient = useMemo(() => {
    return clients.find((c) => c.id === previewClientId) || clients[0];
  }, [clients, previewClientId]);

  // Render Personalized Message Preview
  const personalizedPreview = useMemo(() => {
    let text = message;
    const clientName = previewClient?.name || 'Valued Client';
    const clientCompany = previewClient?.company || 'Your Esteemed Company';

    text = text.replace(/\{\{name\}\}/gi, clientName);
    text = text.replace(/\{\{company\}\}/gi, clientCompany);

    if (websiteUrl.trim()) {
      text += `\n\n🌐 Visit: ${websiteUrl.trim()}`;
    }
    if (contactDetails.trim()) {
      text += `\n📞 Contact: ${contactDetails.trim()}`;
    }

    return text;
  }, [message, websiteUrl, contactDetails, previewClient]);

  // Copy Preview Caption
  const handleCopyCaption = () => {
    navigator.clipboard.writeText(personalizedPreview);
    showToast('Message caption copied to clipboard!', 'success');
  };

  // Filter and Segment Recipients
  const {
    eligibleClients,
    totalSelectedCount,
    excludedInactiveCount,
    excludedNoConsentCount,
    excludedInvalidPhoneCount,
    excludedDuplicatePhoneCount,
  } = useMemo(() => {
    // 1. Gather raw selected based on audienceType
    let rawPool: Client[] = [];

    if (audienceType === 'all') {
      rawPool = clients;
    } else if (audienceType === 'category') {
      rawPool = clients.filter((c) => selectedCategories.includes(c.category));
    } else {
      rawPool = clients.filter((c) => selectedClientIds.has(c.id));
    }

    const totalSelectedCount = rawPool.length;
    let excludedInactiveCount = 0;
    let excludedNoConsentCount = 0;
    let excludedInvalidPhoneCount = 0;
    let excludedDuplicatePhoneCount = 0;

    const seenPhones = new Set<string>();
    const eligible: Client[] = [];

    rawPool.forEach((c) => {
      // Must be Active
      if (c.status !== 'active') {
        excludedInactiveCount++;
        return;
      }

      // Must have WhatsApp Consent and not opted out
      if (!c.whatsappConsent || c.optedOut) {
        excludedNoConsentCount++;
        return;
      }

      // Must have valid phone
      const phoneRes = normalizePhone(c.phone);
      if (!phoneRes.isValid) {
        excludedInvalidPhoneCount++;
        return;
      }

      // Check duplicates
      if (seenPhones.has(phoneRes.normalized)) {
        excludedDuplicatePhoneCount++;
        return;
      }

      seenPhones.add(phoneRes.normalized);
      eligible.push(c);
    });

    return {
      eligibleClients: eligible,
      totalSelectedCount,
      excludedInactiveCount,
      excludedNoConsentCount,
      excludedInvalidPhoneCount,
      excludedDuplicatePhoneCount,
    };
  }, [clients, audienceType, selectedCategories, selectedClientIds]);

  // Estimated Batches (max 256 recipients per batch)
  const batchCount = Math.ceil(eligibleClients.length / 256) || 1;

  // STEP 4 Recipient Table Filtering (for 'selected' audience mode)
  const searchableClientsForSelection = useMemo(() => {
    return clients.filter((c) => {
      if (recipientCatFilter !== 'ALL' && c.category !== recipientCatFilter) return false;
      if (recipientSearch.trim()) {
        const q = recipientSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.company || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [clients, recipientCatFilter, recipientSearch]);

  const handleToggleClientSelection = (id: string) => {
    const next = new Set(selectedClientIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedClientIds(next);
  };

  const handleSelectAllFilteredClients = () => {
    const next = new Set(selectedClientIds);
    const allSelected = searchableClientsForSelection.every((c) => next.has(c.id));
    if (allSelected) {
      searchableClientsForSelection.forEach((c) => next.delete(c.id));
    } else {
      searchableClientsForSelection.forEach((c) => next.add(c.id));
    }
    setSelectedClientIds(next);
  };

  const handleToggleCategory = (catName: string) => {
    if (selectedCategories.includes(catName)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== catName));
    } else {
      setSelectedCategories([...selectedCategories, catName]);
    }
  };

  // Validation before advancing steps
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!campaignName.trim()) {
        showToast('Please enter a Campaign Name.', 'warning');
        return;
      }
    }
    if (currentStep === 3) {
      if (!message.trim()) {
        showToast('Please write your campaign message.', 'warning');
        return;
      }
    }
    if (currentStep === 4) {
      if (eligibleClients.length === 0) {
        showToast(
          'No eligible recipients found. Please select active clients with WhatsApp marketing consent.',
          'warning'
        );
        return;
      }
    }
    setCurrentStep((s) => Math.min(5, s + 1) as any);
  };

  // Submit Save as Draft
  const handleSaveAsDraft = async () => {
    setSubmitting(true);
    try {
      const campId = await createCampaign(
        {
          campaignName: campaignName.trim(),
          campaignType,
          description: description.trim(),
          imageUrl,
          imagePublicId,
          message: message.trim(),
          websiteUrl: websiteUrl.trim(),
          contactDetails: contactDetails.trim(),
          audienceType,
          selectedCategories,
          selectedClientIds: Array.from(selectedClientIds),
          totalSelected: totalSelectedCount,
          totalExcluded: totalSelectedCount - eligibleClients.length,
          status: 'draft',
          createdBy: userDoc?.uid || '',
          createdByName: userDoc?.name || 'Admin',
        },
        eligibleClients,
        userDoc?.uid,
        userDoc?.name
      );

      showToast('Campaign successfully saved as Draft.', 'success');
      if (onCampaignCreated) onCampaignCreated(campId);
      navigate(`/campaigns/prepare/${campId}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to save draft.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit and Prepare WhatsApp Campaign
  const handleConfirmPrepare = async () => {
    setSubmitting(true);
    try {
      const campId = await createCampaign(
        {
          campaignName: campaignName.trim(),
          campaignType,
          description: description.trim(),
          imageUrl,
          imagePublicId,
          message: message.trim(),
          websiteUrl: websiteUrl.trim(),
          contactDetails: contactDetails.trim(),
          audienceType,
          selectedCategories,
          selectedClientIds: Array.from(selectedClientIds),
          totalSelected: totalSelectedCount,
          totalExcluded: totalSelectedCount - eligibleClients.length,
          status: 'prepared',
          createdBy: userDoc?.uid || '',
          createdByName: userDoc?.name || 'Admin',
        },
        eligibleClients,
        userDoc?.uid,
        userDoc?.name
      );

      setConfirmModalOpen(false);
      showToast(
        `Campaign prepared! Formatted into ${batchCount} WhatsApp Broadcast batch(es).`,
        'success'
      );
      if (onCampaignCreated) onCampaignCreated(campId);
      navigate(`/campaigns/prepare/${campId}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to prepare campaign.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* HEADER & STEPPER */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Send className="w-6 h-6 text-brand-600" />
            Create WhatsApp Client Campaign
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Draft, customize, segment, and prepare zero-cost WhatsApp Business Broadcast campaigns.
          </p>
        </div>

        {/* STEP PROGRESS PILLS */}
        <div className="grid grid-cols-5 gap-2 text-xs font-bold">
          {[
            { num: 1, label: 'Info' },
            { num: 2, label: 'Image' },
            { num: 3, label: 'Message' },
            { num: 4, label: 'Recipients' },
            { num: 5, label: 'Review' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num < currentStep) setCurrentStep(s.num as any);
              }}
              className={`p-2.5 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                currentStep === s.num
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : currentStep > s.num
                  ? 'bg-brand-50 text-brand-800 border-brand-200'
                  : 'bg-white text-gray-400 border-gray-200'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep === s.num
                    ? 'bg-white text-brand-700'
                    : currentStep > s.num
                    ? 'bg-brand-200 text-brand-900'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: CAMPAIGN INFO */}
      {currentStep === 1 && (
        <Card className="p-6 space-y-4 animate-in fade-in duration-150">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            Step 1: Campaign Information
          </h3>

          <div className="space-y-4">
            <Input
              label="Campaign Name *"
              placeholder="e.g. Diwali Festival Wishes 2026, Annual Expo Invitation"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              helperText="Internal name for tracking and audit logs"
              required
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Campaign Type *
              </label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value as any)}
                className="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Campaign Description / Internal Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Targeted at VIP clients and advertisers for festive goodwill"
                className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </Card>
      )}

      {/* STEP 2: UPLOAD IMAGE */}
      {currentStep === 2 && (
        <Card className="p-6 space-y-4 animate-in fade-in duration-150">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-brand-600" />
            Step 2: Upload Campaign Image (Cloudinary)
          </h3>

          <p className="text-xs text-gray-500">
            Upload promotional banners, greeting cards, or flyers. Supports JPG, JPEG, PNG, and WebP.
            Images are securely synced and hosted via the company's Cloudinary storage.
          </p>

          {imageUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center p-2 max-h-96">
                <img
                  src={imageUrl}
                  alt="Campaign Preview"
                  className="max-h-80 w-auto object-contain rounded-xl shadow-sm"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border text-xs">
                <span className="text-gray-600 font-mono truncate max-w-xs">{imageUrl}</span>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 font-bold hover:bg-gray-100 cursor-pointer">
                      Replace Image
                    </span>
                  </label>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={handleRemoveImage}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-brand-500 transition-colors bg-gray-50/50 space-y-3">
              <Upload className="w-12 h-12 text-brand-600 mx-auto" />
              <div>
                <h4 className="text-sm font-extrabold text-gray-900">Upload Campaign Creative</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  JPG, PNG, or WebP up to 8MB. Recommended aspect ratio: 1:1 or 4:5 for optimal mobile WhatsApp view.
                </p>
              </div>

              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageSelect}
                  disabled={imageUploading}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all">
                  {imageUploading ? `Uploading (${uploadProgress}%)...` : 'Browse Image File'}
                </span>
              </label>

              <div className="pt-2">
                <span className="text-[11px] text-gray-400 italic">
                  (Optional: You can also skip this step to send a text-only announcement)
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* STEP 3: COMPOSE MESSAGE */}
      {currentStep === 3 && (
        <Card className="p-6 space-y-4 animate-in fade-in duration-150">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-600" />
            Step 3: Compose Message Caption & Variables
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: EDITOR */}
            <div className="space-y-3">
              {/* Variable pills */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Insert Personalization Variable:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('name')}
                    className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold hover:bg-brand-100 transition-colors"
                  >
                    + {'{{name}}'} (Client Name)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('company')}
                    className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold hover:bg-brand-100 transition-colors"
                  >
                    + {'{{company}}'} (Company)
                  </button>
                </div>
              </div>

              {/* Quick Emojis */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Quick Emojis:</label>
                <div className="flex flex-wrap gap-1">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleInsertEmoji(emoji)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Textarea */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700">Message Text *</label>
                  <span className="text-[11px] font-mono text-gray-400">
                    {message.length} characters
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your WhatsApp greeting or announcement..."
                  className="w-full text-xs p-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Website URL (Optional)"
                  placeholder="e.g. https://jantalive.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
                <Input
                  label="Contact Phone (Optional)"
                  placeholder="e.g. +91 98765 43210"
                  value={contactDetails}
                  onChange={(e) => setContactDetails(e.target.value)}
                />
              </div>

              {/* Broadcast explanation notice */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  Native WhatsApp Broadcast Notice:
                </p>
                <p className="text-[11px] text-amber-800 leading-normal">
                  WhatsApp Business Broadcast lists send a <b>single unified caption</b> to all recipients in each list. Variables (such as {'{{name}}'}) provide personalized previews, but the native broadcast will send the finalized text.
                </p>
              </div>
            </div>

            {/* RIGHT: LIVE WHATSAPP CHAT PREVIEW */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-brand-600" /> Live WhatsApp Preview
                </label>

                {clients.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400">Preview as:</span>
                    <select
                      value={previewClientId}
                      onChange={(e) => setPreviewClientId(e.target.value)}
                      className="text-[11px] p-1 rounded-lg border border-gray-200 bg-white font-medium max-w-xs"
                    >
                      {clients.slice(0, 10).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Chat bubble mock */}
              <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-gray-200 shadow-inner min-h-[360px] flex flex-col justify-end">
                <div className="max-w-sm ml-auto bg-[#DCF8C6] rounded-2xl p-3 shadow-md space-y-2 text-xs text-gray-900 border border-emerald-100">
                  {imageUrl && (
                    <div className="rounded-xl overflow-hidden bg-white/50 border border-emerald-200/50">
                      <img src={imageUrl} alt="Creative" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-900 break-words">
                    {personalizedPreview}
                  </div>

                  <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 pt-1">
                    <span>10:30 AM</span>
                    <Check className="w-3 h-3 text-brand-600" />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white text-gray-700 border-gray-300 shadow-sm hover:bg-gray-50"
                    icon={<Copy className="w-3.5 h-3.5" />}
                    onClick={handleCopyCaption}
                  >
                    Copy Caption
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 4: SELECT RECIPIENTS */}
      {currentStep === 4 && (
        <Card className="p-6 space-y-5 animate-in fade-in duration-150">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            Step 4: Select Target Audience & Exclusions
          </h3>

          {/* AUDIENCE MODE TABS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setAudienceType('all')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                audienceType === 'all'
                  ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-sm text-gray-900">All Clients</span>
                <Radio className={`w-4 h-4 ${audienceType === 'all' ? 'text-brand-600' : 'text-gray-300'}`} />
              </div>
              <p className="text-xs text-gray-500">
                Target the entire client directory ({clients.length} total contacts).
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAudienceType('category')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                audienceType === 'category'
                  ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-sm text-gray-900">By Category</span>
                <Radio className={`w-4 h-4 ${audienceType === 'category' ? 'text-brand-600' : 'text-gray-300'}`} />
              </div>
              <p className="text-xs text-gray-500">
                Segment by Corporate, VIP, Media, etc. ({categories.length} categories).
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAudienceType('selected')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                audienceType === 'selected'
                  ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-sm text-gray-900">Specific Clients</span>
                <Radio className={`w-4 h-4 ${audienceType === 'selected' ? 'text-brand-600' : 'text-gray-300'}`} />
              </div>
              <p className="text-xs text-gray-500">
                Manually pick specific clients from directory list.
              </p>
            </button>
          </div>

          {/* CATEGORY PICKER (when category mode is active) */}
          {audienceType === 'category' && (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
              <span className="text-xs font-bold text-gray-700 block">
                Choose Categories to Target:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const isChecked = selectedCategories.includes(cat.name);
                  const countInCat = clients.filter((c) => c.category === cat.name).length;
                  return (
                    <label
                      key={cat.id}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'bg-brand-100/70 border-brand-300 font-bold text-brand-900'
                          : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCategory(cat.name)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span className="truncate flex-1">{cat.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">({countInCat})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* SPECIFIC CLIENTS PICKER TABLE (when selected mode is active) */}
          {audienceType === 'selected' && (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-700">
                  Pick Clients ({selectedClientIds.size} selected):
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={recipientCatFilter}
                    onChange={(e) => setRecipientCatFilter(e.target.value)}
                    className="text-xs p-2 rounded-xl border border-gray-200 bg-white"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Filter clients..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="py-1 text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={handleSelectAllFilteredClients}>
                    Toggle All
                  </Button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y text-xs">
                {searchableClientsForSelection.map((c) => {
                  const isChecked = selectedClientIds.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className="p-2.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleClientSelection(c.id)}
                          className="rounded text-brand-600 focus:ring-brand-500"
                        />
                        <div>
                          <p className="font-bold text-gray-900">{c.name}</p>
                          <p className="text-[11px] text-gray-500">
                            {formatPhone(c.phone)} {c.company ? `• ${c.company}` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {c.category}
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* LIVE AUDIENCE & EXCLUSION BREAKDOWN TILES */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Automated Exclusion & Recipient Verification Summary:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">Total Selected</span>
                <p className="text-xl font-black font-mono text-gray-800 mt-0.5">{totalSelectedCount}</p>
                <span className="text-[10px] text-gray-400">raw audience</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300">
                <span className="text-[10px] font-black text-emerald-800 uppercase block">Eligible Recipients</span>
                <p className="text-xl font-black font-mono text-emerald-950 mt-0.5">{eligibleClients.length}</p>
                <span className="text-[10px] text-emerald-700 font-bold">100% verified</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Excluded Inactive</span>
                <p className="text-xl font-black font-mono text-amber-950 mt-0.5">{excludedInactiveCount}</p>
                <span className="text-[10px] text-amber-700">status = inactive</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">Excluded No Consent</span>
                <p className="text-xl font-black font-mono text-rose-950 mt-0.5">{excludedNoConsentCount}</p>
                <span className="text-[10px] text-rose-700">consent = no / opted out</span>
              </div>

              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
                <span className="text-[10px] font-bold text-orange-800 uppercase block">Invalid Numbers</span>
                <p className="text-xl font-black font-mono text-orange-950 mt-0.5">{excludedInvalidPhoneCount}</p>
                <span className="text-[10px] text-orange-700">malformed phone</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] font-bold text-blue-800 uppercase block">Duplicate Numbers</span>
                <p className="text-xl font-black font-mono text-blue-950 mt-0.5">{excludedDuplicatePhoneCount}</p>
                <span className="text-[10px] text-blue-700">auto-deduplicated</span>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <span className="text-[10px] font-bold text-purple-800 uppercase block">Broadcast Batches</span>
                <p className="text-xl font-black font-mono text-purple-950 mt-0.5">{batchCount}</p>
                <span className="text-[10px] text-purple-700">max 256 per batch</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 5: REVIEW & PREPARE */}
      {currentStep === 5 && (
        <Card className="p-6 space-y-6 animate-in fade-in duration-150">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Step 5: Review & Prepare Broadcast
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CAMPAIGN SPECS */}
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Campaign Name</span>
                  <p className="text-base font-black text-gray-900">{campaignName}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="brand" size="sm">
                    {campaignType}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    Audience: {audienceType.toUpperCase()}
                  </Badge>
                </div>
                {description && (
                  <p className="text-gray-500 pt-1 italic">{description}</p>
                )}
              </div>

              {/* BATCH BREAKDOWN CARD */}
              <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-200 space-y-2">
                <span className="text-xs font-black text-brand-900 uppercase tracking-wider block">
                  WhatsApp Business Broadcast Distribution
                </span>
                <p className="text-xs text-brand-800">
                  <b>{eligibleClients.length} verified recipients</b> will be organized into{' '}
                  <b>{batchCount} broadcast batch(es)</b> adhering to native WhatsApp limits (max 256 contacts/list):
                </p>

                <div className="space-y-1 pt-1 font-mono text-xs">
                  {Array.from({ length: batchCount }).map((_, idx) => {
                    const start = idx * 256 + 1;
                    const end = Math.min((idx + 1) * 256, eligibleClients.length);
                    const count = end - start + 1;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-brand-100"
                      >
                        <span className="font-bold text-gray-800">Batch #{idx + 1}</span>
                        <span className="text-brand-700 font-semibold">
                          {count} recipients ({start} to {end})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* PREVIEW CREATIVE & MESSAGE */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-700 block">Preview Creative & Message:</span>
              <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-gray-200 shadow-inner">
                <div className="max-w-sm ml-auto bg-[#DCF8C6] rounded-2xl p-3 shadow-md space-y-2 text-xs text-gray-900 border border-emerald-100">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Creative"
                      className="w-full h-auto object-cover rounded-xl"
                    />
                  )}
                  <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-900">
                    {personalizedPreview}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={handleSaveAsDraft}
              loading={submitting}
            >
              Save as Draft
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(4)}
              >
                Back to Edit
              </Button>
              <Button
                variant="primary"
                icon={<Send className="w-4 h-4" />}
                onClick={() => setConfirmModalOpen(true)}
              >
                Prepare WhatsApp Campaign
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* FOOTER NAVIGATION PREV/NEXT */}
      {currentStep < 5 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1) as any)}
            icon={<ChevronLeft className="w-4 h-4" />}
          >
            Previous
          </Button>

          <Button
            variant="primary"
            onClick={handleNextStep}
            icon={<ChevronRight className="w-4 h-4" />}
          >
            Next Step
          </Button>
        </div>
      )}

      {/* PREPARATION CONFIRMATION MODAL */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm WhatsApp Broadcast Preparation"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-brand-50 border border-brand-200 space-y-2 text-brand-950">
            <p className="font-extrabold text-sm text-brand-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-brand-600 shrink-0" />
              Native Broadcast Preparation
            </p>
            <p className="leading-relaxed">
              This action will prepare your campaign and recipient list into{' '}
              <b>{batchCount} broadcast batch(es)</b>. It will <b>NOT</b> automatically send WhatsApp
              messages. You must use <b>WhatsApp Business Broadcast</b> to send them.
            </p>
          </div>

          <div className="space-y-1.5 text-gray-600">
            <p>✓ <b>{eligibleClients.length}</b> verified opted-in recipients will be locked in.</p>
            <p>✓ You can copy caption, download images, and export batch contacts (vCard/CSV).</p>
            <p>✓ You can track and mark each batch as manually sent as you complete them.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmPrepare}
              loading={submitting}
            >
              Yes, Prepare Campaign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
