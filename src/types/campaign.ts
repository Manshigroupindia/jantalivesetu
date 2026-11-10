export type ClientStatus = 'active' | 'inactive';

export interface Client {
  id: string;
  name: string; // Full Name
  phone: string; // Mobile Number as entered (e.g. +91 98765 43210)
  normalizedPhone: string; // E.164 formatted (e.g. +919876543210)
  company?: string; // Company Name
  email?: string; // Email Address
  category: string; // Category (e.g. Corporate, Individual, etc.)
  whatsappConsent: boolean; // Explicit WhatsApp marketing consent
  consentSource?: string; // e.g. 'Manual Entry', 'CSV Import', 'Website'
  consentDate?: string; // ISO timestamp
  optedOut?: boolean; // Client opted out
  status: ClientStatus; // 'active' | 'inactive'
  notes?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string; // Date Added
  updatedAt: string;
}

export type DeliveryMethod = 'whatsapp' | 'sms';

export type CampaignType =
  | 'Festival Wishes'
  | 'Event Invitation'
  | 'Company Announcement'
  | 'Important Notice'
  | 'Promotional Offer'
  | 'General Update'
  | 'Custom';

export type CampaignStatus =
  | 'draft'
  | 'prepared'
  | 'partially_sent'
  | 'manually_sent'
  | 'cancelled';

export interface BatchRecipient {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  company?: string;
}

export interface CampaignBatch {
  id: string;
  batchNumber: number;
  recipientIds: string[];
  recipients: BatchRecipient[];
  recipientCount: number;
  status: 'prepared' | 'opened_in_messages' | 'manually_sent';
  preparedAt: string;
  openedInMessagesAt?: string;
  manuallySentAt?: string;
  markedSentBy?: string;
  markedSentByName?: string;
}

export interface Campaign {
  id: string;
  campaignName: string;
  campaignType: CampaignType;
  deliveryMethod?: DeliveryMethod; // 'whatsapp' (default) | 'sms'
  description?: string;
  imageUrl?: string;
  imagePublicId?: string;
  message: string;
  websiteUrl?: string;
  contactDetails?: string;
  audienceType: 'all' | 'selected' | 'category';
  selectedCategories?: string[];
  selectedClientIds?: string[];
  totalSelected: number;
  totalEligible: number;
  totalExcluded: number;
  batchSize?: number;
  totalBatches: number;
  batches: CampaignBatch[];
  status: CampaignStatus;
  smsMetadata?: {
    charCount: number;
    segments: number;
    isUnicode: boolean;
    encoding: 'GSM-7' | 'Unicode';
    hasHindi: boolean;
    hasEmoji: boolean;
  };
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  manuallySentAt?: string;
  partiallySentAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface CampaignLog {
  id: string;
  campaignId: string;
  batchId?: string;
  action:
    | 'created'
    | 'draft_saved'
    | 'prepared'
    | 'batch_opened_in_sms'
    | 'batch_sent'
    | 'all_sent'
    | 'cancelled'
    | 'reopened'
    | 'duplicated';
  description: string;
  performedBy: string;
  performedByName?: string;
  timestamp: string;
}

export interface ClientCategory {
  id: string;
  name: string;
  isDefault?: boolean;
  createdAt?: string;
}

export const DEFAULT_CLIENT_CATEGORIES: string[] = [
  'Corporate',
  'Individual',
  'Existing Client',
  'New Client',
  'VIP Client',
  'Other',
];

export const CAMPAIGN_TYPES: CampaignType[] = [
  'Festival Wishes',
  'Event Invitation',
  'Company Announcement',
  'Important Notice',
  'Promotional Offer',
  'General Update',
  'Custom',
];

export interface ClientImportRecord {
  name: string;
  phone: string;
  normalizedPhone: string;
  company?: string;
  email?: string;
  category: string;
  whatsappConsent: boolean;
  status: ClientStatus;
  notes?: string;
  isValid: boolean;
  isDuplicateInFile: boolean;
  isExistingInDb: boolean;
  existingClientId?: string;
  validationError?: string;
}

export interface RecipientFilterResult {
  allClientsCount: number;
  selectedCount: number;
  eligibleClients: Client[];
  excludedInactive: Client[];
  excludedNoConsent: Client[];
  excludedInvalidPhone: Client[];
  excludedDuplicatePhone: Client[];
}

