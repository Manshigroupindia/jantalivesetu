import { describe, it, expect } from 'vitest';
import {
  analyzeSmsText,
  cleanSmsPhone,
  buildSmsUri,
  formatSmsBatchRecipients,
  isGsm7Character,
} from '../utils/smsUtils';
import { splitIntoBroadcastBatches } from '../services/campaignService';
import { Client } from '../types/campaign';

describe('Free SMS Campaign Suite Tests', () => {
  /* =========================================================================
     1. SMS CHARACTER COUNTING, ENCODING & SEGMENT CALCULATION
     ========================================================================= */
  describe('SMS Text Analysis & Segment Calculations (analyzeSmsText)', () => {
    it('handles empty message correctly', () => {
      const res = analyzeSmsText('');
      expect(res.charCount).toBe(0);
      expect(res.segments).toBe(0);
      expect(res.isUnicode).toBe(false);
      expect(res.encoding).toBe('GSM-7');
      expect(res.remainingInSegment).toBe(160);
      expect(res.hasHindi).toBe(false);
      expect(res.hasEmoji).toBe(false);
    });

    it('identifies single-part standard GSM-7 English message (<= 160 chars)', () => {
      const text = 'Hello from Janta Live Setu! This is an important community update for all members.';
      const res = analyzeSmsText(text);

      expect(res.charCount).toBe(text.length);
      expect(res.segments).toBe(1);
      expect(res.isUnicode).toBe(false);
      expect(res.encoding).toBe('GSM-7');
      expect(res.remainingInSegment).toBe(160 - text.length);
      expect(res.hasHindi).toBe(false);
      expect(res.hasEmoji).toBe(false);
    });

    it('calculates multi-part GSM-7 segments (153 chars/segment) when > 160 chars', () => {
      // 165 characters of pure ASCII
      const text = 'A'.repeat(165);
      const res = analyzeSmsText(text);

      expect(res.charCount).toBe(165);
      expect(res.segments).toBe(2); // >160 chars triggers multi-part concatenation (153 per part)
      expect(res.isUnicode).toBe(false);
      expect(res.encoding).toBe('GSM-7');
      // Segment 1 holds 153 chars, Segment 2 holds 12 chars -> 153 - 12 = 141 remaining
      expect(res.remainingInSegment).toBe(153 - 12);
    });

    it('calculates 3-part GSM-7 segments (> 306 chars)', () => {
      // 320 characters
      const text = 'B'.repeat(320);
      const res = analyzeSmsText(text);

      expect(res.charCount).toBe(320);
      expect(res.segments).toBe(3); // 153 * 2 = 306, 320 > 306 -> 3 parts
      expect(res.isUnicode).toBe(false);
      expect(res.remainingInSegment).toBe(153 * 3 - 320);
    });

    it('detects Hindi (Devanagari) and switches to Unicode 70-character limit', () => {
      const hindiText = 'नमस्ते जनता लाइव सेतु की ओर से महत्वपूर्ण सूचना।';
      const res = analyzeSmsText(hindiText);

      expect(res.isUnicode).toBe(true);
      expect(res.hasHindi).toBe(true);
      expect(res.encoding).toBe('Unicode');
      expect(res.segments).toBe(1); // Length is under 70 chars
      expect(res.remainingInSegment).toBe(70 - hindiText.length);
    });

    it('calculates multi-part Unicode segments (67 chars/segment) for long Hindi text', () => {
      // 75 Hindi characters
      const longHindi = 'जनता लाइव सेतु '.repeat(5); // 15 * 5 = 75 chars
      const res = analyzeSmsText(longHindi);

      expect(res.charCount).toBe(longHindi.length);
      expect(res.segments).toBe(2); // > 70 chars -> 67 chars per part -> 2 parts
      expect(res.isUnicode).toBe(true);
      expect(res.hasHindi).toBe(true);
      expect(res.remainingInSegment).toBe(67 * 2 - longHindi.length);
    });

    it('detects emojis and enforces Unicode encoding rules', () => {
      const emojiText = 'Happy Diwali to all our esteemed clients! 🪔✨';
      const res = analyzeSmsText(emojiText);

      expect(res.isUnicode).toBe(true);
      expect(res.hasEmoji).toBe(true);
      expect(res.encoding).toBe('Unicode');
      expect(res.segments).toBe(1);
    });

    it('properly validates individual GSM-7 characters with isGsm7Character', () => {
      expect(isGsm7Character('A')).toBe(true);
      expect(isGsm7Character('z')).toBe(true);
      expect(isGsm7Character('9')).toBe(true);
      expect(isGsm7Character('@')).toBe(true);
      expect(isGsm7Character('$')).toBe(true);
      expect(isGsm7Character('\n')).toBe(true);
      expect(isGsm7Character('?')).toBe(true);

      // Hindi or special unicode is not GSM-7
      expect(isGsm7Character('न')).toBe(false);
      expect(isGsm7Character('🔥')).toBe(false);
      expect(isGsm7Character('₹')).toBe(false);
    });
  });

  /* =========================================================================
     2. PHONE NUMBER CLEANING & SMS URI COMPOSITION
     ========================================================================= */
  describe('SMS Phone Number Cleaning & URI Builders', () => {
    it('cleans phone numbers ensuring uniform E.164 (+91) format', () => {
      expect(cleanSmsPhone('+91 98765 43210')).toBe('+919876543210');
      expect(cleanSmsPhone('09876543210')).toBe('+919876543210');
      expect(cleanSmsPhone('919876543210')).toBe('+919876543210');
      expect(cleanSmsPhone('9876543210')).toBe('+919876543210');
      expect(cleanSmsPhone('+91-(98765)-43210')).toBe('+919876543210');
    });

    it('formats batch numbers into comma and semicolon separated strings', () => {
      const phones = ['+91 98765 43210', '09123456789', '9811122233'];
      const formatted = formatSmsBatchRecipients(phones);

      expect(formatted.cleaned).toEqual(['+919876543210', '+919123456789', '+919811122233']);
      expect(formatted.commaSeparated).toBe('+919876543210,+919123456789,+919811122233');
      expect(formatted.semicolonSeparated).toBe('+919876543210;+919123456789;+919811122233');
    });

    it('builds standard sms: URI for single recipient', () => {
      const uri = buildSmsUri(['9876543210'], 'Hello World');
      expect(uri).toBe('sms:+919876543210?body=Hello%20World');
    });

    it('builds multi-recipient URI separated by comma', () => {
      const uri = buildSmsUri(['9876543210', '9811122233'], 'Test Campaign', ',');
      expect(uri).toBe('sms:+919876543210,+919811122233?body=Test%20Campaign');
    });

    it('builds multi-recipient URI separated by semicolon', () => {
      const uri = buildSmsUri(['9876543210', '9811122233'], 'Test Campaign', ';');
      expect(uri).toBe('sms:+919876543210;+919811122233?body=Test%20Campaign');
    });
  });

  /* =========================================================================
     3. SMS BATCH SPLITTING WITH CONFIGURABLE LIMITS
     ========================================================================= */
  describe('Configurable SMS Batch Splitting (splitIntoBroadcastBatches)', () => {
    const mockClients: Client[] = Array.from({ length: 25 }).map((_, i) => ({
      id: `client_${i + 1}`,
      name: `Client ${i + 1}`,
      phone: `98765432${i < 10 ? '0' + i : i}`,
      normalizedPhone: `+9198765432${i < 10 ? '0' + i : i}`,
      category: 'Corporate',
      whatsappConsent: true,
      status: 'active',
      createdAt: '2026-11-10T00:00:00.000Z',
      updatedAt: '2026-11-10T00:00:00.000Z',
    }));

    it('splits clients into batches of 10 for default SMS size', () => {
      const batches = splitIntoBroadcastBatches(mockClients, 10);
      expect(batches.length).toBe(3); // 10, 10, 5

      expect(batches[0].batchNumber).toBe(1);
      expect(batches[0].recipientCount).toBe(10);
      expect(batches[0].status).toBe('prepared');
      expect(batches[0].recipients[0].name).toBe('Client 1');
      expect(batches[0].recipients[9].name).toBe('Client 10');

      expect(batches[1].batchNumber).toBe(2);
      expect(batches[1].recipientCount).toBe(10);
      expect(batches[1].recipients[0].name).toBe('Client 11');

      expect(batches[2].batchNumber).toBe(3);
      expect(batches[2].recipientCount).toBe(5);
      expect(batches[2].recipients[4].name).toBe('Client 25');
    });

    it('splits clients into batches of 5 for conservative SMS carrier compatibility', () => {
      const batches = splitIntoBroadcastBatches(mockClients, 5);
      expect(batches.length).toBe(5); // 5 * 5 = 25
      batches.forEach((b, idx) => {
        expect(b.batchNumber).toBe(idx + 1);
        expect(b.recipientCount).toBe(5);
      });
    });

    it('defaults to 256 batchLimit when none is specified (WhatsApp Business compatibility)', () => {
      const batches = splitIntoBroadcastBatches(mockClients);
      expect(batches.length).toBe(1);
      expect(batches[0].recipientCount).toBe(25);
    });
  });
});
