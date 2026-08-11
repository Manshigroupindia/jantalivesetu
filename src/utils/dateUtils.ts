/**
 * Date formatting and domain expiry calculation utilities.
 */

// Formats a date string or object to DD MMM YYYY (e.g. 11 Aug 2026)
export const formatIndianDate = (dateInput?: string | Date | number | null): string => {
  if (!dateInput) return 'N/A';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'N/A';
    
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch {
    return 'N/A';
  }
};

export interface ExpiryStatus {
  status: 'Healthy' | 'Upcoming Renewal' | 'Renew Soon' | 'Expired';
  daysRemaining: number;
  badgeClass: string;
  badgeBg: string;
  badgeText: string;
}

// Calculate Domain Expiry status and remaining days
export const calculateDomainExpiry = (expiryDateStr?: string): ExpiryStatus => {
  if (!expiryDateStr) {
    return {
      status: 'Healthy',
      daysRemaining: 999,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-700',
    };
  }

  const now = new Date();
  const expiry = new Date(expiryDateStr);
  
  if (isNaN(expiry.getTime())) {
    return {
      status: 'Healthy',
      daysRemaining: 999,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-700',
    };
  }

  // Clear time component for pure day difference comparison
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryUtc = Date.UTC(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  
  const diffMs = expiryUtc - nowUtc;
  const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      status: 'Expired',
      daysRemaining,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-700',
    };
  } else if (daysRemaining <= 30) {
    return {
      status: 'Renew Soon',
      daysRemaining,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-700',
    };
  } else if (daysRemaining <= 90) {
    return {
      status: 'Upcoming Renewal',
      daysRemaining,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700',
    };
  } else {
    return {
      status: 'Healthy',
      daysRemaining,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-700',
    };
  }
};

export const MONTH_NAMES = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export const getAvailableYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 10; y++) {
    years.push(y);
  }
  return years;
};
