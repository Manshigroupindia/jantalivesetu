import { describe, it, expect } from 'vitest';
import { normalizePhone, generateVCard } from '../utils/phoneUtils';
import { parseCSV, generateCSV, detectColumnMapping } from '../utils/csvUtils';
import { splitIntoBroadcastBatches, cleanData } from '../services/campaignService';
import { Client, CampaignBatch, CampaignStatus } from '../types/campaign';

describe('WhatsApp Campaigns & Broadcast Preparation Module Tests', () => {
  /* =========================================================================
     1. PHONE NORMALIZATION & VALIDATION
     ========================================================================= */
  describe('Phone Number Normalization & Validation', () => {
    it('normalizes standard 10-digit Indian numbers starting with 6-9', () => {
      const res = normalizePhone('9876543210');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
      expect(res.formatted).toBe('+91 98765 43210');
    });

    it('handles +91 prefix, spaces, dashes, and parentheses', () => {
      const res = normalizePhone('+91 (98765) 43-210');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
    });

    it('handles leading 0 or 91 country code without +', () => {
      const res1 = normalizePhone('09876543210');
      expect(res1.isValid).toBe(true);
      expect(res1.normalized).toBe('+919876543210');

      const res2 = normalizePhone('919876543210');
      expect(res2.isValid).toBe(true);
      expect(res2.normalized).toBe('+919876543210');
    });

    it('rejects invalid numbers (not 10 digits or invalid starting digit)', () => {
      const res1 = normalizePhone('1234567890'); // doesn't start with 6-9
      expect(res1.isValid).toBe(false);

      const res2 = normalizePhone('98765'); // too short
      expect(res2.isValid).toBe(false);

      const res3 = normalizePhone('');
      expect(res3.isValid).toBe(false);
    });
  });

  /* =========================================================================
     2. CSV PARSING & EXPORTING
     ========================================================================= */
  describe('CSV Parser, Column Detection & Generator', () => {
    it('parses standard RFC 4180 CSV with quotes and commas', () => {
      const csvText = `Name,Mobile,Company\n"Sharma, Ramesh",9876543210,"Sharma Traders, Delhi"\nSunita Verma,8765432109,Media Works`;
      const rows = parseCSV(csvText);
      expect(rows.length).toBe(3);
      expect(rows[0]).toEqual(['Name', 'Mobile', 'Company']);
      expect(rows[1]).toEqual(['Sharma, Ramesh', '9876543210', 'Sharma Traders, Delhi']);
      expect(rows[2]).toEqual(['Sunita Verma', '8765432109', 'Media Works']);
    });

    it('detects standard client columns intelligently', () => {
      const headers = ['Full Name', 'Contact Number', 'Organization', 'Email Address', 'Group', 'Consent'];
      const mapping = detectColumnMapping(headers);

      expect(mapping.name).toBe('Full Name');
      expect(mapping.phone).toBe('Contact Number');
      expect(mapping.company).toBe('Organization');
      expect(mapping.email).toBe('Email Address');
      expect(mapping.category).toBe('Group');
      expect(mapping.whatsappConsent).toBe('Consent');
    });

    it('generates well-escaped CSV output', () => {
      const data = [
        { name: 'Ramesh Sharma', phone: '+919876543210', company: 'ABC, Pvt Ltd' },
        { name: 'Anil Kumar', phone: '+918765432109', company: 'XYZ' },
      ];
      const csv = generateCSV(data, [
        { key: 'name', label: 'Client Name' },
        { key: 'phone', label: 'Mobile' },
        { key: 'company', label: 'Company' },
      ]);

      expect(csv).toContain('Client Name,Mobile,Company');
      expect(csv).toContain('"ABC, Pvt Ltd"');
    });
  });

  /* =========================================================================
     3. 256-RECIPIENT BATCH SPLITTING
     ========================================================================= */
  describe('WhatsApp Business 256-Recipient Batch Splitting', () => {
    it('creates 1 batch for <= 256 recipients', () => {
      const dummyClients: Client[] = Array.from({ length: 150 }).map((_, idx) => ({
        id: `c_${idx}`,
        name: `Client ${idx + 1}`,
        phone: `98765432${String(idx).padStart(2, '0')}`,
        normalizedPhone: `+9198765432${String(idx).padStart(2, '0')}`,
        category: 'Corporate',
        whatsappConsent: true,
        status: 'active',
        createdAt: '2026-11-10T00:00:00.000Z',
        updatedAt: '2026-11-10T00:00:00.000Z',
      }));

      const batches = splitIntoBroadcastBatches(dummyClients);
      expect(batches.length).toBe(1);
      expect(batches[0].batchNumber).toBe(1);
      expect(batches[0].recipientCount).toBe(150);
      expect(batches[0].status).toBe('prepared');
    });

    it('correctly divides 500 recipients into Batch 1 (256) and Batch 2 (244)', () => {
      const dummyClients: Client[] = Array.from({ length: 500 }).map((_, idx) => ({
        id: `c_${idx}`,
        name: `Client ${idx + 1}`,
        phone: `98765432${String(idx).padStart(2, '0')}`,
        normalizedPhone: `+9198765432${String(idx).padStart(2, '0')}`,
        category: 'Corporate',
        whatsappConsent: true,
        status: 'active',
        createdAt: '2026-11-10T00:00:00.000Z',
        updatedAt: '2026-11-10T00:00:00.000Z',
      }));

      const batches = splitIntoBroadcastBatches(dummyClients);
      expect(batches.length).toBe(2);

      // Batch 1: exactly 256
      expect(batches[0].batchNumber).toBe(1);
      expect(batches[0].recipientCount).toBe(256);
      expect(batches[0].recipients.length).toBe(256);

      // Batch 2: remaining 244
      expect(batches[1].batchNumber).toBe(2);
      expect(batches[1].recipientCount).toBe(244);
      expect(batches[1].recipients.length).toBe(244);
    });

    it('correctly divides 600 recipients into Batch 1 (256), Batch 2 (256), Batch 3 (88)', () => {
      const dummyClients: Client[] = Array.from({ length: 600 }).map((_, idx) => ({
        id: `c_${idx}`,
        name: `Client ${idx + 1}`,
        phone: `98765432${String(idx).padStart(2, '0')}`,
        normalizedPhone: `+9198765432${String(idx).padStart(2, '0')}`,
        category: 'Corporate',
        whatsappConsent: true,
        status: 'active',
        createdAt: '2026-11-10T00:00:00.000Z',
        updatedAt: '2026-11-10T00:00:00.000Z',
      }));

      const batches = splitIntoBroadcastBatches(dummyClients);
      expect(batches.length).toBe(3);
      expect(batches[0].recipientCount).toBe(256);
      expect(batches[1].recipientCount).toBe(256);
      expect(batches[2].recipientCount).toBe(88);
    });
  });

  /* =========================================================================
     4. RECIPIENT ELIGIBILITY & AUTO-EXCLUSIONS
     ========================================================================= */
  describe('Audience Filtering & Exclusions', () => {
    it('excludes inactive clients and clients without WhatsApp consent', () => {
      const mixedClients: Client[] = [
        {
          id: '1',
          name: 'Active Consented',
          phone: '9876543210',
          normalizedPhone: '+919876543210',
          category: 'Corporate',
          whatsappConsent: true,
          status: 'active',
          createdAt: '2026-11-10',
          updatedAt: '2026-11-10',
        },
        {
          id: '2',
          name: 'Inactive Client',
          phone: '9876543211',
          normalizedPhone: '+919876543211',
          category: 'Corporate',
          whatsappConsent: true,
          status: 'inactive', // Should be excluded
          createdAt: '2026-11-10',
          updatedAt: '2026-11-10',
        },
        {
          id: '3',
          name: 'No Consent Client',
          phone: '9876543212',
          normalizedPhone: '+919876543212',
          category: 'Corporate',
          whatsappConsent: false, // Should be excluded
          status: 'active',
          createdAt: '2026-11-10',
          updatedAt: '2026-11-10',
        },
        {
          id: '4',
          name: 'Opted Out Client',
          phone: '9876543213',
          normalizedPhone: '+919876543213',
          category: 'Corporate',
          whatsappConsent: true,
          optedOut: true, // Should be excluded
          status: 'active',
          createdAt: '2026-11-10',
          updatedAt: '2026-11-10',
        },
      ];

      const eligible = mixedClients.filter(
        (c) => c.status === 'active' && c.whatsappConsent && !c.optedOut
      );

      expect(eligible.length).toBe(1);
      expect(eligible[0].name).toBe('Active Consented');
    });
  });

  /* =========================================================================
     5. VCARD (.VCF) 1-CLICK IMPORT GENERATOR
     ========================================================================= */
  describe('vCard Generator for 1-Click Phone Broadcast List Setup', () => {
    it('generates standard vCard 3.0 entries with clean labels', () => {
      const recipients = [
        { name: 'Ramesh Sharma', phone: '+919876543210', company: 'Sharma Traders' },
        { name: 'Sunita Verma', phone: '+918765432109', company: 'Media Works' },
      ];

      const vcf = generateVCard('Diwali_B1', recipients);

      expect(vcf).toContain('BEGIN:VCARD');
      expect(vcf).toContain('VERSION:3.0');
      expect(vcf).toContain('FN:JL Diwali_B1 - Ramesh Sharma');
      expect(vcf).toContain('TEL;TYPE=CELL:+919876543210');
      expect(vcf).toContain('ORG:Sharma Traders');
      expect(vcf).toContain('FN:JL Diwali_B1 - Sunita Verma');
      expect(vcf).toContain('TEL;TYPE=CELL:+918765432109');
      expect(vcf).toContain('END:VCARD');
    });
  });

  /* =========================================================================
     6. STATUS TRANSITION LOGIC
     ========================================================================= */
  describe('Batch & Campaign Status Transitions', () => {
    it('transitions from prepared -> partially_sent -> manually_sent as batches are confirmed', () => {
      const batches: CampaignBatch[] = [
        {
          id: 'b1',
          batchNumber: 1,
          recipientIds: ['c1'],
          recipients: [{ id: 'c1', name: 'A', phone: '9876543210', normalizedPhone: '+919876543210' }],
          recipientCount: 1,
          status: 'prepared',
          preparedAt: '2026-11-10',
        },
        {
          id: 'b2',
          batchNumber: 2,
          recipientIds: ['c2'],
          recipients: [{ id: 'c2', name: 'B', phone: '9876543211', normalizedPhone: '+919876543211' }],
          recipientCount: 1,
          status: 'prepared',
          preparedAt: '2026-11-10',
        },
      ];

      // Initial status: prepared
      let status: CampaignStatus = 'prepared';

      // After 1 batch sent
      batches[0].status = 'manually_sent';
      const allSent1 = batches.every((b) => b.status === 'manually_sent');
      const someSent1 = batches.some((b) => b.status === 'manually_sent');
      status = allSent1 ? 'manually_sent' : someSent1 ? 'partially_sent' : 'prepared';
      expect(status).toBe('partially_sent');

      // After 2nd batch sent
      batches[1].status = 'manually_sent';
      const allSent2 = batches.every((b) => b.status === 'manually_sent');
      status = allSent2 ? 'manually_sent' : 'partially_sent';
      expect(status).toBe('manually_sent');
    });
  });

  /* =========================================================================
     7. FIRESTORE PAYLOAD SANITIZER (cleanData)
     ========================================================================= */
  describe('Firestore Payload Sanitizer (cleanData)', () => {
    it('removes undefined fields at top level', () => {
      const input = {
        name: 'Festive Campaign',
        notes: undefined,
        status: 'prepared',
      };
      const cleaned = cleanData(input);
      expect(cleaned).toEqual({
        name: 'Festive Campaign',
        status: 'prepared',
      });
      expect('notes' in cleaned).toBe(false);
    });

    it('recursively removes undefined fields inside nested objects', () => {
      const input = {
        campaign: {
          title: 'Diwali',
          meta: {
            author: 'Admin',
            deletedAt: undefined,
          },
        },
      };
      const cleaned = cleanData(input);
      expect(cleaned).toEqual({
        campaign: {
          title: 'Diwali',
          meta: {
            author: 'Admin',
          },
        },
      });
      expect('deletedAt' in cleaned.campaign.meta).toBe(false);
    });

    it('recursively sanitizes array elements and objects inside arrays', () => {
      const input = {
        batches: [
          {
            batchNumber: 1,
            recipients: [
              { id: '1', name: 'Ramesh', company: undefined },
              { id: '2', name: 'Suresh', company: 'Tech Corp' },
            ],
            manuallySentAt: undefined,
          },
        ],
      };
      const cleaned = cleanData(input);
      expect(cleaned).toEqual({
        batches: [
          {
            batchNumber: 1,
            recipients: [
              { id: '1', name: 'Ramesh' },
              { id: '2', name: 'Suresh', company: 'Tech Corp' },
            ],
          },
        ],
      });
      expect('company' in cleaned.batches[0].recipients[0]).toBe(false);
      expect('manuallySentAt' in cleaned.batches[0]).toBe(false);
    });

    it('preserves null, booleans, empty strings, and numbers', () => {
      const input = {
        zero: 0,
        emptyStr: '',
        nullVal: null,
        boolFalse: false,
        undefVal: undefined,
      };
      const cleaned = cleanData(input);
      expect(cleaned).toEqual({
        zero: 0,
        emptyStr: '',
        nullVal: null,
        boolFalse: false,
      });
      expect('undefVal' in cleaned).toBe(false);
    });
  });
});
