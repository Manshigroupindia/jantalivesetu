import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Client,
  ClientCategory,
  DEFAULT_CLIENT_CATEGORIES,
  Campaign,
  CampaignBatch,
  CampaignLog,
  CampaignStatus,
} from '../types/campaign';
import { normalizePhone } from '../utils/phoneUtils';

// Helper to recursively remove all undefined fields and undefined array elements
export function cleanData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanData(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = cleanData(value);
      }
    }
    return clean as T;
  }
  return obj;
}

/* =========================================================================
   CLIENT MANAGEMENT SERVICES
   ========================================================================= */

export async function fetchClients(): Promise<Client[]> {
  const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client));
}

export function subscribeToClients(
  onUpdate: (clients: Client[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const clients = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client));
      onUpdate(clients);
    },
    (err) => {
      console.error('Error subscribing to clients:', err);
      if (onError) onError(err);
    }
  );
}

export async function createClient(
  data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'normalizedPhone'>,
  userId?: string,
  userName?: string
): Promise<string> {
  const phoneRes = normalizePhone(data.phone);
  if (!phoneRes.isValid) {
    throw new Error(phoneRes.error || 'Invalid phone number.');
  }

  // Duplicate phone check
  const dupQ = query(collection(db, 'clients'), where('normalizedPhone', '==', phoneRes.normalized), limit(1));
  const dupSnap = await getDocs(dupQ);
  if (!dupSnap.empty) {
    const existing = dupSnap.docs[0].data() as Client;
    throw new Error(`A client with mobile number ${phoneRes.formatted} already exists (${existing.name}).`);
  }

  const now = new Date().toISOString();
  const payload: Omit<Client, 'id'> = {
    name: data.name.trim(),
    phone: data.phone.trim(),
    normalizedPhone: phoneRes.normalized,
    company: data.company?.trim() || '',
    email: data.email?.trim() || '',
    category: data.category || 'Other',
    whatsappConsent: Boolean(data.whatsappConsent),
    consentSource: data.consentSource || 'Manual Entry',
    consentDate: data.whatsappConsent ? data.consentDate || now : undefined,
    optedOut: Boolean(data.optedOut),
    status: data.status || 'active',
    notes: data.notes?.trim() || '',
    createdById: userId || '',
    createdByName: userName || '',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, 'clients'), cleanData(payload));
  return docRef.id;
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<void> {
  const docRef = doc(db, 'clients', id);

  const payload: Record<string, any> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (updates.phone) {
    const phoneRes = normalizePhone(updates.phone);
    if (!phoneRes.isValid) {
      throw new Error(phoneRes.error || 'Invalid phone number.');
    }
    payload.normalizedPhone = phoneRes.normalized;

    // Check duplicate if phone is modified
    const dupQ = query(collection(db, 'clients'), where('normalizedPhone', '==', phoneRes.normalized), limit(2));
    const dupSnap = await getDocs(dupQ);
    const hasOther = dupSnap.docs.some((d) => d.id !== id);
    if (hasOther) {
      throw new Error(`Another client already has the mobile number ${phoneRes.formatted}.`);
    }
  }

  if (updates.whatsappConsent !== undefined) {
    payload.whatsappConsent = Boolean(updates.whatsappConsent);
    if (updates.whatsappConsent && !updates.consentDate) {
      payload.consentDate = new Date().toISOString();
    }
  }

  await updateDoc(docRef, cleanData(payload));
}

export async function deleteClient(id: string): Promise<void> {
  const docRef = doc(db, 'clients', id);
  await deleteDoc(docRef);
}

export async function bulkUpdateClientsStatus(
  clientIds: string[],
  status: 'active' | 'inactive'
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  clientIds.forEach((id) => {
    const ref = doc(db, 'clients', id);
    batch.update(ref, { status, updatedAt: now });
  });

  await batch.commit();
}

export async function bulkImportClients(
  records: Array<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>,
  userId?: string,
  userName?: string
): Promise<{ added: number; updated: number }> {
  let added = 0;
  let updated = 0;
  const now = new Date().toISOString();

  // Firestore batch allows max 500 writes per batch
  const BATCH_SIZE = 450;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const rec of chunk) {
      const phoneRes = normalizePhone(rec.phone);
      const normalizedPhone = phoneRes.isValid ? phoneRes.normalized : rec.normalizedPhone;

      // Check if client exists
      const q = query(collection(db, 'clients'), where('normalizedPhone', '==', normalizedPhone), limit(1));
      const snap = await getDocs(q);

      if (!snap.empty) {
        // Update existing
        const existingDoc = snap.docs[0];
        batch.update(existingDoc.ref, cleanData({
          name: rec.name || existingDoc.data().name,
          company: rec.company || existingDoc.data().company || '',
          email: rec.email || existingDoc.data().email || '',
          category: rec.category || existingDoc.data().category || 'Other',
          whatsappConsent: rec.whatsappConsent,
          status: rec.status,
          notes: rec.notes || existingDoc.data().notes || '',
          updatedAt: now,
        }));
        updated++;
      } else {
        // Add new
        const newRef = doc(collection(db, 'clients'));
        batch.set(newRef, cleanData({
          name: rec.name,
          phone: rec.phone,
          normalizedPhone,
          company: rec.company || '',
          email: rec.email || '',
          category: rec.category || 'Other',
          whatsappConsent: rec.whatsappConsent,
          consentSource: 'CSV Import',
          consentDate: rec.whatsappConsent ? now : undefined,
          optedOut: false,
          status: rec.status,
          notes: rec.notes || '',
          createdById: userId || '',
          createdByName: userName || '',
          createdAt: now,
          updatedAt: now,
        }));
        added++;
      }
    }

    await batch.commit();
  }

  return { added, updated };
}

/* =========================================================================
   CATEGORY MANAGEMENT SERVICES
   ========================================================================= */

export async function fetchCategories(): Promise<ClientCategory[]> {
  try {
    const q = query(collection(db, 'clientCategories'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    const customs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClientCategory));

    // Combine default categories with custom categories without duplicates
    const combined: ClientCategory[] = [
      ...DEFAULT_CLIENT_CATEGORIES.map((cat) => ({
        id: `default_${cat.toLowerCase().replace(/\s+/g, '_')}`,
        name: cat,
        isDefault: true,
      })),
      ...customs.filter(
        (c) => !DEFAULT_CLIENT_CATEGORIES.map((dc) => dc.toLowerCase()).includes(c.name.toLowerCase())
      ),
    ];

    return combined;
  } catch (err) {
    console.warn('Failed to load custom categories, returning defaults:', err);
    return DEFAULT_CLIENT_CATEGORIES.map((cat) => ({
      id: `default_${cat.toLowerCase().replace(/\s+/g, '_')}`,
      name: cat,
      isDefault: true,
    }));
  }
}

export async function addCategory(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');

  // Case insensitive check against defaults
  if (DEFAULT_CLIENT_CATEGORIES.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error('This category already exists as a default category.');
  }

  const docRef = await addDoc(collection(db, 'clientCategories'), {
    name: trimmed,
    isDefault: false,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'clientCategories', id));
}

/* =========================================================================
   CAMPAIGN MANAGEMENT SERVICES (WHATSAPP BUSINESS BROADCAST PREPARATION)
   ========================================================================= */

const BROADCAST_BATCH_LIMIT = 256;

export function splitIntoBroadcastBatches(
  eligibleClients: Client[],
  batchLimit: number = BROADCAST_BATCH_LIMIT
): CampaignBatch[] {
  const batches: CampaignBatch[] = [];
  const limit = Math.max(1, batchLimit);
  const total = eligibleClients.length;

  for (let i = 0; i < total; i += limit) {
    const chunk = eligibleClients.slice(i, i + limit);
    const batchNumber = Math.floor(i / limit) + 1;

    batches.push({
      id: `batch_${batchNumber}`,
      batchNumber,
      recipientIds: chunk.map((c) => c.id),
      recipients: chunk.map((c) => {
        const item: {
          id: string;
          name: string;
          phone: string;
          normalizedPhone: string;
          company?: string;
        } = {
          id: c.id,
          name: c.name,
          phone: c.phone,
          normalizedPhone: c.normalizedPhone || c.phone,
        };
        if (c.company) {
          item.company = c.company;
        }
        return item;
      }),
      recipientCount: chunk.length,
      status: 'prepared',
      preparedAt: new Date().toISOString(),
    });
  }

  return batches;
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));
}

export function subscribeToCampaigns(
  onUpdate: (campaigns: Campaign[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const campaigns = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));
      onUpdate(campaigns);
    },
    (err) => {
      console.error('Error subscribing to campaigns:', err);
      if (onError) onError(err);
    }
  );
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const docRef = doc(db, 'campaigns', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Campaign;
}

export async function createCampaign(
  campaignData: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'batches' | 'totalBatches' | 'totalEligible'>,
  eligibleClients: Client[],
  userId?: string,
  userName?: string
): Promise<string> {
  const now = new Date().toISOString();

  // Divide eligible recipients into batches based on delivery method and batchSize
  const deliveryMethod = campaignData.deliveryMethod || 'whatsapp';
  const batchLimit = campaignData.batchSize || (deliveryMethod === 'sms' ? 10 : BROADCAST_BATCH_LIMIT);
  const batches = splitIntoBroadcastBatches(eligibleClients, batchLimit);

  const payload: Omit<Campaign, 'id'> = {
    ...campaignData,
    deliveryMethod,
    batchSize: batchLimit,
    totalEligible: eligibleClients.length,
    totalBatches: batches.length,
    batches,
    status: campaignData.status || 'prepared',
    createdBy: userId || '',
    createdByName: userName || 'Admin',
    createdAt: now,
    updatedAt: now,
  };

  const cleanedPayload = cleanData(payload);

  let docRef;
  try {
    docRef = await addDoc(collection(db, 'campaigns'), cleanedPayload);
  } catch (err: any) {
    console.error('[CampaignService] Error creating campaign in Firestore:', err);
    throw new Error(err?.message || 'Failed to save campaign to Firestore database.');
  }

  const methodLabel = deliveryMethod === 'sms' ? 'SMS Messages' : 'WhatsApp Broadcast';

  // Log creation activity (safe, non-blocking)
  try {
    await logCampaignActivity({
      campaignId: docRef.id,
      action: payload.status === 'draft' ? 'draft_saved' : 'prepared',
      description:
        payload.status === 'draft'
          ? `${methodLabel} Campaign "${payload.campaignName}" saved as draft.`
          : `${methodLabel} Campaign "${payload.campaignName}" prepared with ${eligibleClients.length} recipients across ${batches.length} batches.`,
      performedBy: userId || '',
      performedByName: userName || 'Admin',
      timestamp: now,
    });
  } catch (logErr) {
    console.warn('[CampaignService] Non-blocking warning: failed to log campaign activity:', logErr);
  }

  return docRef.id;
}

export async function updateBatchStatus(
  campaignId: string,
  batchNumber: number,
  status: 'prepared' | 'opened_in_messages' | 'manually_sent',
  userId?: string,
  userName?: string
): Promise<Campaign> {
  const docRef = doc(db, 'campaigns', campaignId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Campaign not found.');

  const campaign = { id: snap.id, ...snap.data() } as Campaign;
  const now = new Date().toISOString();

  const updatedBatches = campaign.batches.map((b) => {
    if (b.batchNumber === batchNumber) {
      return {
        ...b,
        status,
        ...(status === 'manually_sent'
          ? { manuallySentAt: now, markedSentBy: userId || '', markedSentByName: userName || 'Admin' }
          : {}),
        ...(status === 'opened_in_messages' ? { openedInMessagesAt: now } : {}),
      };
    }
    return b;
  });

  const allSent = updatedBatches.every((b) => b.status === 'manually_sent');
  const someSent = updatedBatches.some((b) => b.status === 'manually_sent' || b.status === 'opened_in_messages');

  const newStatus: CampaignStatus = allSent
    ? 'manually_sent'
    : someSent
    ? 'partially_sent'
    : 'prepared';

  const updates: Partial<Campaign> = {
    batches: updatedBatches,
    status: newStatus,
    updatedAt: now,
    partiallySentAt: campaign.partiallySentAt || (someSent ? now : undefined),
    ...(allSent ? { manuallySentAt: now } : {}),
  };

  await updateDoc(docRef, cleanData(updates));

  const isSms = campaign.deliveryMethod === 'sms';
  const methodLabel = isSms ? 'SMS Messages' : 'WhatsApp Business';
  let action: CampaignLog['action'] = 'batch_sent';
  let logDesc = `Batch #${batchNumber} marked as ${status} in ${methodLabel} by ${userName || 'Admin'}.`;

  if (status === 'opened_in_messages') {
    action = 'batch_opened_in_sms';
    logDesc = `Batch #${batchNumber} opened in SMS Messages application.`;
  } else if (allSent) {
    action = 'all_sent';
    logDesc = `All batches in campaign "${campaign.campaignName}" manually marked as sent via ${methodLabel}.`;
  }

  await logCampaignActivity({
    campaignId,
    batchId: `batch_${batchNumber}`,
    action,
    description: logDesc,
    performedBy: userId || '',
    performedByName: userName || 'Admin',
    timestamp: now,
  });

  return { ...campaign, ...updates };
}

export async function markBatchAsSent(
  campaignId: string,
  batchNumber: number,
  userId?: string,
  userName?: string
): Promise<Campaign> {
  return updateBatchStatus(campaignId, batchNumber, 'manually_sent', userId, userName);
}

export async function cancelCampaign(
  campaignId: string,
  reason: string,
  userId?: string,
  userName?: string
): Promise<void> {
  const docRef = doc(db, 'campaigns', campaignId);
  const now = new Date().toISOString();

  await updateDoc(docRef, cleanData({
    status: 'cancelled',
    cancelledAt: now,
    cancelReason: reason.trim(),
    updatedAt: now,
  }));

  await logCampaignActivity({
    campaignId,
    action: 'cancelled',
    description: `Campaign cancelled by ${userName || 'Admin'}. Reason: "${reason.trim()}"`,
    performedBy: userId || '',
    performedByName: userName || 'Admin',
    timestamp: now,
  });
}

export async function deleteCampaignDraft(campaignId: string): Promise<void> {
  const docRef = doc(db, 'campaigns', campaignId);
  const snap = await getDoc(docRef);
  if (snap.exists() && snap.data().status !== 'draft') {
    throw new Error('Only draft campaigns can be permanently deleted. Prepared or sent campaigns must be kept for audit records.');
  }
  await deleteDoc(docRef);
}

export async function logCampaignActivity(log: Omit<CampaignLog, 'id'>): Promise<void> {
  try {
    await addDoc(collection(db, 'campaignLogs'), cleanData(log));
  } catch (err) {
    console.warn('Failed to record campaign activity log:', err);
  }
}

export async function fetchCampaignLogs(campaignId: string): Promise<CampaignLog[]> {
  try {
    const q = query(
      collection(db, 'campaignLogs'),
      where('campaignId', '==', campaignId),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CampaignLog));
  } catch (err) {
    console.warn('Failed to fetch campaign logs:', err);
    return [];
  }
}
