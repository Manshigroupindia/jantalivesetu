/**
 * SMS Encoding, Segment Calculation, and Intent Utilities
 * Supports GSM-7 and Unicode (UCS-2) segment calculations with detection
 * for Hindi (Devanagari) characters and emojis.
 */

// GSM-7 Standard character set (3GPP TS 23.038)
const GSM_7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

// GSM-7 Extended characters (each counts as 2 characters in GSM-7)
const GSM_7_EXTENDED = '|^{}\\[~]€';

// Devanagari (Hindi) Unicode range: U+0900 to U+097F
const HINDI_REGEX = /[\u0900-\u097F]/;

// Emoji detection regex covering common emoji Unicode blocks
const EMOJI_REGEX =
  /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/;

export interface SmsAnalysis {
  charCount: number;
  isUnicode: boolean;
  encoding: 'GSM-7' | 'Unicode';
  segments: number;
  maxPerSingleSegment: number;
  maxPerConcatSegment: number;
  remainingInSegment: number;
  hasHindi: boolean;
  hasEmoji: boolean;
  explanation: string;
}

/**
 * Checks if a given character is within the GSM 7-bit alphabet.
 */
export function isGsm7Char(char: string): boolean {
  return GSM_7_BASIC.includes(char) || GSM_7_EXTENDED.includes(char);
}

export const isGsm7Character = isGsm7Char;

/**
 * Analyzes SMS message text and calculates character count, encoding type,
 * segment count, and remaining characters in the current segment.
 */
export function analyzeSmsText(text: string): SmsAnalysis {
  if (!text) {
    return {
      charCount: 0,
      isUnicode: false,
      encoding: 'GSM-7',
      segments: 0,
      maxPerSingleSegment: 160,
      maxPerConcatSegment: 153,
      remainingInSegment: 160,
      hasHindi: false,
      hasEmoji: false,
      explanation: 'Empty message. Standard GSM-7 allows up to 160 characters per segment.',
    };
  }

  const hasHindi = HINDI_REGEX.test(text);
  const hasEmoji = EMOJI_REGEX.test(text);

  // Check if any character falls outside the GSM 7-bit character sets
  let isUnicode = hasHindi || hasEmoji;
  let gsmCharCount = 0;

  if (!isUnicode) {
    for (const char of text) {
      if (GSM_7_EXTENDED.includes(char)) {
        gsmCharCount += 2; // Extended characters count as 2
      } else if (GSM_7_BASIC.includes(char)) {
        gsmCharCount += 1;
      } else {
        isUnicode = true;
        break;
      }
    }
  }

  const charCount = isUnicode ? Array.from(text).length : gsmCharCount;

  let segments = 1;
  let maxPerSingle = 160;
  let maxPerConcat = 153;
  let remaining = 0;

  if (isUnicode) {
    maxPerSingle = 70;
    maxPerConcat = 67;

    if (charCount <= 70) {
      segments = charCount === 0 ? 0 : 1;
      remaining = 70 - charCount;
    } else {
      segments = Math.ceil(charCount / 67);
      const usedInLast = charCount % 67 === 0 ? 67 : charCount % 67;
      remaining = 67 - usedInLast;
    }
  } else {
    maxPerSingle = 160;
    maxPerConcat = 153;

    if (charCount <= 160) {
      segments = charCount === 0 ? 0 : 1;
      remaining = 160 - charCount;
    } else {
      segments = Math.ceil(charCount / 153);
      const usedInLast = charCount % 153 === 0 ? 153 : charCount % 153;
      remaining = 153 - usedInLast;
    }
  }

  let explanation = '';
  if (hasHindi) {
    explanation = `Unicode encoding (Hindi detected). Segment limit is 70 characters (or 67 chars/segment when multi-part).`;
  } else if (hasEmoji) {
    explanation = `Unicode encoding (Emoji detected). Segment limit is 70 characters (or 67 chars/segment when multi-part).`;
  } else if (isUnicode) {
    explanation = `Unicode encoding (Special characters detected). Segment limit is 70 characters.`;
  } else {
    explanation = `Standard GSM-7 encoding. Segment limit is 160 characters (or 153 chars/segment when multi-part).`;
  }

  return {
    charCount,
    isUnicode,
    encoding: isUnicode ? 'Unicode' : 'GSM-7',
    segments,
    maxPerSingleSegment: maxPerSingle,
    maxPerConcatSegment: maxPerConcat,
    remainingInSegment: remaining,
    hasHindi,
    hasEmoji,
    explanation,
  };
}

/**
 * Cleans phone numbers to ensure uniform E.164 format (+91XXXXXXXXXX) for SMS intents.
 */
export function cleanSmsPhone(phone: string): string {
  const digits = phone.replace(/[\s\-\(\)\.]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+91${digits.slice(1)}`;
  if (digits.length === 10) return `+91${digits}`;
  return digits;
}

/**
 * Formats a list of recipients for multi-recipient SMS dispatch.
 */
export function formatSmsBatchRecipients(phones: string[]): {
  cleaned: string[];
  commaSeparated: string;
  semicolonSeparated: string;
} {
  const cleaned = phones.map(cleanSmsPhone).filter(Boolean);
  return {
    cleaned,
    commaSeparated: cleaned.join(','),
    semicolonSeparated: cleaned.join(';'),
  };
}

/**
 * Builds standard SMS URI for web or native deep link
 */
export function buildSmsUri(recipients: string[], message: string, separator: ',' | ';' = ','): string {
  const cleanedRecipients = recipients.map(cleanSmsPhone).filter(Boolean);
  const joinedNumbers = cleanedRecipients.join(separator);
  const encodedBody = encodeURIComponent(message || '');

  // Detect iOS vs Android/Desktop
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    return `sms:${joinedNumbers}&body=${encodedBody}`;
  }

  return `sms:${joinedNumbers}?body=${encodedBody}`;
}
