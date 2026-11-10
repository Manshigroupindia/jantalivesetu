/**
 * Phone number normalization, validation, and vCard utilities
 * Optimized for Indian mobile numbers (+91) with graceful support for international formats.
 */

export interface PhoneValidationResult {
  raw: string;
  normalized: string;
  isValid: boolean;
  formatted: string;
  error?: string;
}

/**
 * Normalizes phone numbers to standard E.164 format (+91XXXXXXXXXX).
 * Strips whitespace, hyphens, brackets, and prefixes (0, 91, +91).
 */
export function normalizePhone(input: string | undefined | null): PhoneValidationResult {
  const raw = (input || '').trim();

  if (!raw) {
    return {
      raw: '',
      normalized: '',
      isValid: false,
      formatted: '',
      error: 'Phone number is required',
    };
  }

  // Remove whitespace, dashes, parentheses, dots
  let cleaned = raw.replace(/[\s\-\(\)\.]/g, '');

  let isIndian = false;
  let nationalNumber = '';

  if (cleaned.startsWith('+91')) {
    isIndian = true;
    nationalNumber = cleaned.slice(3);
  } else if (cleaned.startsWith('0091')) {
    isIndian = true;
    nationalNumber = cleaned.slice(4);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    isIndian = true;
    nationalNumber = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    isIndian = true;
    nationalNumber = cleaned.slice(1);
  } else if (/^\d{10}$/.test(cleaned)) {
    isIndian = true;
    nationalNumber = cleaned;
  } else if (cleaned.startsWith('+')) {
    // Non-Indian international number with country code
    const digitsOnly = cleaned.slice(1).replace(/\D/g, '');
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return {
        raw,
        normalized: `+${digitsOnly}`,
        isValid: true,
        formatted: `+${digitsOnly}`,
      };
    }
  }

  if (isIndian) {
    // Indian mobile numbers must be 10 digits and start with 6, 7, 8, or 9
    if (/^[6-9]\d{9}$/.test(nationalNumber)) {
      const normalized = `+91${nationalNumber}`;
      const formatted = `+91 ${nationalNumber.slice(0, 5)} ${nationalNumber.slice(5)}`;
      return {
        raw,
        normalized,
        isValid: true,
        formatted,
      };
    } else if (nationalNumber.length !== 10) {
      return {
        raw,
        normalized: cleaned,
        isValid: false,
        formatted: raw,
        error: `Must be a 10-digit mobile number (found ${nationalNumber.length} digits)`,
      };
    } else {
      return {
        raw,
        normalized: cleaned,
        isValid: false,
        formatted: raw,
        error: 'Indian mobile number must start with 6, 7, 8, or 9',
      };
    }
  }

  // Generic fallback check
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 15) {
    const normalized = cleaned.startsWith('+') ? cleaned : `+${digits}`;
    return {
      raw,
      normalized,
      isValid: true,
      formatted: normalized,
    };
  }

  return {
    raw,
    normalized: cleaned,
    isValid: false,
    formatted: raw,
    error: 'Invalid phone number format',
  };
}

/**
 * Quick boolean check if a phone number is valid
 */
export function isValidPhone(phone: string): boolean {
  return normalizePhone(phone).isValid;
}

/**
 * Formats a phone number for user-friendly UI display
 */
export function formatPhone(phone: string): string {
  const res = normalizePhone(phone);
  return res.isValid ? res.formatted : phone;
}

/**
 * Generates a clean standard vCard (.vcf) file contents for a batch of contacts.
 * Users can import this vCard directly into Android / iPhone Google Contacts / Apple Contacts,
 * making native WhatsApp Business Broadcast list creation effortless.
 */
export function generateVCard(
  batchLabel: string,
  recipients: Array<{ name: string; phone: string; company?: string }>
): string {
  let vcard = '';
  recipients.forEach((r, idx) => {
    const norm = normalizePhone(r.phone).normalized || r.phone;
    const cleanName = r.name.replace(/[\n\r;]/g, ' ').trim() || `Client ${idx + 1}`;
    const org = (r.company || '').replace(/[\n\r;]/g, ' ').trim();

    vcard += 'BEGIN:VCARD\r\n';
    vcard += 'VERSION:3.0\r\n';
    vcard += `FN:JL ${batchLabel} - ${cleanName}\r\n`;
    vcard += `N:${cleanName};;;;\r\n`;
    if (org) {
      vcard += `ORG:${org}\r\n`;
    }
    vcard += `TEL;TYPE=CELL:${norm}\r\n`;
    vcard += `NOTE:Imported for WhatsApp Broadcast ${batchLabel}\r\n`;
    vcard += 'END:VCARD\r\n';
  });
  return vcard;
}

/**
 * Triggers a client-side browser file download for text/blob
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

