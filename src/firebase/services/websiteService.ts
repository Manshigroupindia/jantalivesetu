import { db } from '../config';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { WebsiteClientData, DomainExpiryFilter } from '../../types';
import { formatLast4CardDigits } from '../../utils/security';

const WEBSITES_COLLECTION = 'websites';

export const fetchAllWebsites = async (): Promise<WebsiteClientData[]> => {
  try {
    const q = query(collection(db, WEBSITES_COLLECTION), orderBy('srNo', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as WebsiteClientData[];
  } catch (error) {
    console.error('Error fetching websites:', error);
    return [];
  }
};

export const fetchWebsiteById = async (id: string): Promise<WebsiteClientData | null> => {
  try {
    const docRef = doc(db, WEBSITES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as WebsiteClientData;
  } catch (error) {
    console.error(`Error fetching website ${id}:`, error);
    return null;
  }
};

export const getNextSrNo = async (): Promise<number> => {
  try {
    const q = query(collection(db, WEBSITES_COLLECTION), orderBy('srNo', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 1;
    const topDoc = snapshot.docs[0].data() as WebsiteClientData;
    return (topDoc.srNo || 0) + 1;
  } catch {
    return 1;
  }
};

export const createWebsite = async (
  data: Omit<WebsiteClientData, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  userId: string
): Promise<string> => {
  const now = new Date().toISOString();
  
  // Format card number to strictly store last 4 digits only
  const formattedCard = formatLast4CardDigits(data.domainBuyCard);

  const docRef = await addDoc(collection(db, WEBSITES_COLLECTION), {
    ...data,
    domainBuyCard: formattedCard,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  });

  return docRef.id;
};

export const updateWebsite = async (
  id: string,
  updates: Partial<WebsiteClientData>,
  userId: string
): Promise<void> => {
  const ref = doc(db, WEBSITES_COLLECTION, id);
  const now = new Date().toISOString();

  const formattedUpdates = { ...updates, updatedAt: now, updatedBy: userId };
  if (updates.domainBuyCard) {
    formattedUpdates.domainBuyCard = formatLast4CardDigits(updates.domainBuyCard);
  }

  await updateDoc(ref, formattedUpdates);
};

export const deleteWebsite = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, WEBSITES_COLLECTION, id));
};

// Realtime subscriber for dashboard summary updates
export const subscribeToWebsites = (callback: (data: WebsiteClientData[]) => void) => {
  const q = query(collection(db, WEBSITES_COLLECTION), orderBy('srNo', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as WebsiteClientData[];
    callback(list);
  }, (error) => {
    console.error('Error in realtime website subscription:', error);
  });
};

// Filter & Search Helper
export const filterWebsites = (
  websites: WebsiteClientData[],
  searchTerm: string,
  filters: {
    category?: string;
    websiteStatus?: string;
    paymentStatus?: string;
    activeStatus?: string;
    domainPlatform?: string;
    hostingPlatform?: string;
    paymentMethod?: string;
    dateFilter?: DomainExpiryFilter;
  },
  sortBy: string = 'newest'
): WebsiteClientData[] => {
  let result = [...websites];

  // 1. Text Search (Client, Website, Domain, Email, Contact Person)
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    result = result.filter(item => 
      item.clientName?.toLowerCase().includes(term) ||
      item.websiteName?.toLowerCase().includes(term) ||
      item.domain?.toLowerCase().includes(term) ||
      item.emailId?.toLowerCase().includes(term) ||
      item.contactPersonName?.toLowerCase().includes(term) ||
      item.websiteAdminUserId?.toLowerCase().includes(term)
    );
  }

  // 2. Category Filter
  if (filters.category && filters.category !== 'ALL') {
    result = result.filter(item => item.categoryId === filters.category || item.categoryName === filters.category);
  }

  // 3. Website Status (Complete / Uncomplete)
  if (filters.websiteStatus && filters.websiteStatus !== 'ALL') {
    result = result.filter(item => item.websiteStatus === filters.websiteStatus);
  }

  // 4. Payment Status (Paid / Pending)
  if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
    result = result.filter(item => item.paymentStatus === filters.paymentStatus);
  }

  // 5. Active Status (Active / Inactive)
  if (filters.activeStatus && filters.activeStatus !== 'ALL') {
    result = result.filter(item => item.active === filters.activeStatus);
  }

  // 6. Domain Buy Platform
  if (filters.domainPlatform && filters.domainPlatform !== 'ALL') {
    result = result.filter(item => item.domainBuyPlatform?.toLowerCase() === filters.domainPlatform?.toLowerCase());
  }

  // 7. Hosting Platform
  if (filters.hostingPlatform && filters.hostingPlatform !== 'ALL') {
    result = result.filter(item => item.hostingApp?.toLowerCase() === filters.hostingPlatform?.toLowerCase());
  }

  // 8. Payment Method
  if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
    result = result.filter(item => item.paymentMethod === filters.paymentMethod);
  }

  // 9. Domain Purchase / Expiry Month and Year Filter
  if (filters.dateFilter) {
    const { purchaseMonth, purchaseYear, expiryMonth, expiryYear } = filters.dateFilter;
    
    if (purchaseMonth || purchaseYear) {
      result = result.filter(item => {
        if (!item.domainPurchaseDate) return false;
        const d = new Date(item.domainPurchaseDate);
        if (isNaN(d.getTime())) return false;
        const matchMonth = purchaseMonth ? (d.getMonth() + 1) === purchaseMonth : true;
        const matchYear = purchaseYear ? d.getFullYear() === purchaseYear : true;
        return matchMonth && matchYear;
      });
    }

    if (expiryMonth || expiryYear) {
      result = result.filter(item => {
        if (!item.domainExpiryDate) return false;
        const d = new Date(item.domainExpiryDate);
        if (isNaN(d.getTime())) return false;
        const matchMonth = expiryMonth ? (d.getMonth() + 1) === expiryMonth : true;
        const matchYear = expiryYear ? d.getFullYear() === expiryYear : true;
        return matchMonth && matchYear;
      });
    }
  }

  // 10. Sorting
  result.sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.domainPurchaseDate || 0).getTime() - new Date(b.domainPurchaseDate || 0).getTime();
      case 'newest':
        return new Date(b.domainPurchaseDate || 0).getTime() - new Date(a.domainPurchaseDate || 0).getTime();
      case 'expiring_soon':
        return new Date(a.domainExpiryDate || '9999-12-31').getTime() - new Date(b.domainExpiryDate || '9999-12-31').getTime();
      case 'client_asc':
        return (a.clientName || '').localeCompare(b.clientName || '');
      case 'client_desc':
        return (b.clientName || '').localeCompare(a.clientName || '');
      case 'recently_renewed':
        return new Date(b.renewDate || 0).getTime() - new Date(a.renewDate || 0).getTime();
      default:
        return (b.srNo || 0) - (a.srNo || 0);
    }
  });

  return result;
};
