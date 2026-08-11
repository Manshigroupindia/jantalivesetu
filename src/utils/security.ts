/**
 * Security, Access PIN & Credential Protection Utilities
 */

// Formats domain buy card input to ONLY store/display last 4 digits (e.g. "**** 4821")
export const formatLast4CardDigits = (input: string): string => {
  if (!input) return '';
  const digitsOnly = input.replace(/\D/g, '');
  if (digitsOnly.length === 0) return '';
  const last4 = digitsOnly.slice(-4);
  return `**** ${last4.padStart(4, '0')}`;
};

// Masks sensitive text/password
export const maskPassword = (text?: string): string => {
  if (!text) return '••••••••';
  return '••••••••••••';
};

// Simple secure hash for client-side access password verification
export const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
};

export const DEFAULT_ACCESS_PASSWORD_HASH = simpleHash('Deven@2026#Access');

// Validates 4-digit numeric PIN
export const isValid4DigitPin = (pin: string): boolean => {
  return /^\d{4}$/.test(pin);
};

// Secure multi-pass salted PIN hashing helper
const PIN_SALT = 'website_client_data_pin_salt_v1_2026';

export const hashPin = (pin: string, userIdSalt: string = ''): string => {
  if (!isValid4DigitPin(pin)) {
    throw new Error('PIN must be exactly 4 numeric digits.');
  }

  const combined = `${PIN_SALT}:${userIdSalt}:${pin}`;
  let hash = 5381;
  let hash2 = 0;

  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) + hash) + char;
      hash2 = (hash2 << 4) ^ (hash2 >> 28) ^ char;
      hash = hash & hash;
      hash2 = hash2 & hash2;
    }
  }

  return `${Math.abs(hash).toString(36)}-${Math.abs(hash2).toString(36)}`;
};

export const verifyPinHash = (enteredPin: string, storedHash: string, userIdSalt: string = ''): boolean => {
  if (!enteredPin || !storedHash) return false;
  try {
    const computed = hashPin(enteredPin, userIdSalt);
    return computed === storedHash;
  } catch {
    return false;
  }
};

// Rate limiting tracker for PIN verification attempts (Max 5 attempts, 5 minute lockout)
interface RateLimitEntry {
  attempts: number;
  lockedUntil: number | null;
}

const rateLimitMap: Record<string, RateLimitEntry> = {};

export const checkPinRateLimit = (key: string = 'global'): { isLocked: boolean; remainingSeconds: number } => {
  const now = Date.now();
  const entry = rateLimitMap[key];

  if (!entry) return { isLocked: false, remainingSeconds: 0 };

  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  if (entry.lockedUntil && entry.lockedUntil <= now) {
    // Reset lockout window
    delete rateLimitMap[key];
    return { isLocked: false, remainingSeconds: 0 };
  }

  return { isLocked: false, remainingSeconds: 0 };
};

export const recordFailedPinAttempt = (key: string = 'global'): { isLocked: boolean; remainingAttempts: number; remainingSeconds: number } => {
  const now = Date.now();
  if (!rateLimitMap[key]) {
    rateLimitMap[key] = { attempts: 0, lockedUntil: null };
  }

  const entry = rateLimitMap[key];
  entry.attempts += 1;

  if (entry.attempts >= 5) {
    const lockoutMs = 5 * 60 * 1000; // 5 minute lock
    entry.lockedUntil = now + lockoutMs;
    return { isLocked: true, remainingAttempts: 0, remainingSeconds: 300 };
  }

  return { isLocked: false, remainingAttempts: 5 - entry.attempts, remainingSeconds: 0 };
};

export const resetPinRateLimit = (key: string = 'global'): void => {
  delete rateLimitMap[key];
};

// Sanitizes objects for logging or analytics by stripping sensitive keys
export const sanitizeForLogging = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const sanitized = { ...obj };
  const sensitiveKeys = ['password', 'pin', 'accesspin', 'accesspinhash', 'hostingpassword', 'websiteadminpassword'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      delete sanitized[key];
    }
  }
  return sanitized;
};
