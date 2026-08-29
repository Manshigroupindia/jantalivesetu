// Date and Time Utilities for Asia/Kolkata timezone

export function getCurrentDateISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export const getCurrentMonthKey = getCurrentMonthISO;

export function getCurrentTimeFormatted(): string {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export function formatDateFormatted(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMonthYear(monthStr: string): string {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-');
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Parses time string (e.g. '09:30 AM', '02:01 PM', '14:01') into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const str = timeStr.trim().toUpperCase();
  const isPM = str.includes('PM');
  const isAM = str.includes('AM');
  const clean = str.replace(/(AM|PM)/g, '').trim();
  const parts = clean.split(':').map((p) => parseInt(p.trim(), 10));

  let hours = parts[0] || 0;
  const minutes = parts[1] || 0;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Business Rule: Check-in after 2:00 PM (14:00 / 840 mins) is HALF DAY.
 * Exactly 2:00 PM (840 mins) is FULL DAY. 2:01 PM (841 mins) is HALF DAY.
 */
export function isHalfDayCheckIn(checkInTimeStr?: string): boolean {
  if (!checkInTimeStr) return false;
  const minutes = parseTimeToMinutes(checkInTimeStr);
  return minutes > 840; // > 14:00 (840 minutes)
}
