import { describe, it, expect } from 'vitest';
import { TeaSnackLog } from '../types';

// Helper under test (mirrored from firestoreService to unit test pure logic)
function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
      clean[key] = removeUndefinedFields(value);
    } else {
      clean[key] = value;
    }
  }
  return clean as T;
}

// Monthly summary calculation logic from TeaSnacksPage
function calculateMonthlySummary(monthLogs: Partial<TeaSnackLog>[]) {
  let teaCups = 0;
  let teaAmount = 0;
  let coffeeCups = 0;
  let coffeeAmount = 0;
  let snacksAmount = 0;

  monthLogs.forEach((l) => {
    const type = (l.itemType || l.type || 'tea').toLowerCase();
    const qty = l.quantity || l.count || 1;
    const total = l.totalPrice !== undefined ? l.totalPrice : (l.amount !== undefined ? l.amount : 0);

    if (type === 'tea') {
      teaCups += qty;
      teaAmount += total;
    } else if (type === 'coffee') {
      coffeeCups += qty;
      coffeeAmount += total;
    } else {
      snacksAmount += total;
    }
  });

  const grandTotal = teaAmount + coffeeAmount + snacksAmount;
  return {
    teaCups,
    teaAmount,
    coffeeCups,
    coffeeAmount,
    snacksAmount,
    grandTotal,
  };
}

describe('Tea Records Firestore Data Handling & Calculations', () => {
  it('1. Save a tea record with notes: preserves actual string notes without undefined', () => {
    const rawInput: Omit<TeaSnackLog, 'id'> = {
      date: '2026-10-28',
      itemType: 'tea',
      type: 'tea',
      quantity: 5,
      count: 5,
      unitPrice: 10,
      amount: 10,
      totalPrice: 50,
      loggedById: 'user_1',
      loggedByUserId: 'user_1',
      loggedByName: 'Deven Jha',
      loggedByUserName: 'Deven Jha',
      notes: 'Special morning tea for client meet',
      createdAt: '2026-10-28T10:00:00.000Z',
    };

    const payload = removeUndefinedFields({
      ...rawInput,
      notes: rawInput.notes ?? '',
    });

    expect(payload.notes).toBe('Special morning tea for client meet');
    expect(Object.values(payload as Record<string, unknown>).includes(undefined)).toBe(false);
  });

  it('2. Save a tea record without notes: saves "" and NEVER passes undefined to Firestore', () => {
    const rawInput: any = {
      date: '2026-10-28',
      itemType: 'tea',
      type: 'tea',
      quantity: 4,
      count: 4,
      unitPrice: 10,
      amount: 10,
      totalPrice: 40,
      loggedById: 'user_1',
      loggedByUserId: 'user_1',
      loggedByName: 'Deven Jha',
      loggedByUserName: 'Deven Jha',
      notes: undefined, // Simulates empty notes input
      createdAt: '2026-10-28T10:00:00.000Z',
    };

    const payload = removeUndefinedFields({
      ...rawInput,
      notes: rawInput.notes ?? '',
    });

    expect(payload.notes).toBe('');
    expect(payload.notes).not.toBeUndefined();
    expect(Object.values(payload as Record<string, unknown>).includes(undefined)).toBe(false);
  });

  it('3. Edit an existing record with missing notes: previousValues and updates do not contain undefined', () => {
    // Older record in Firestore missing the notes field
    const legacyDoc: Partial<TeaSnackLog> = {
      id: 'tea_2026-10-28',
      date: '2026-10-28',
      itemType: 'tea',
      quantity: 3,
      unitPrice: 10,
      totalPrice: 30,
      // notes is missing (undefined)
    };

    const editNotesInput = ''; // user left edit notes blank

    const updates: Partial<TeaSnackLog> = {
      date: legacyDoc.date!,
      itemType: 'tea',
      type: 'tea',
      quantity: 6,
      count: 6,
      unitPrice: 10,
      amount: 10,
      totalPrice: 60,
      notes: (editNotesInput || '').trim(),
      updatedById: 'user_1',
      updatedByName: 'Deven Jha',
      updateReason: 'Added 3 more cups for afternoon',
      previousValues: {
        itemType: legacyDoc.itemType || legacyDoc.type || 'tea',
        quantity: legacyDoc.quantity || legacyDoc.count || 1,
        unitPrice: legacyDoc.unitPrice || legacyDoc.amount || 0,
        totalPrice: legacyDoc.totalPrice !== undefined ? legacyDoc.totalPrice : (legacyDoc.amount !== undefined ? legacyDoc.amount : 0),
        notes: legacyDoc.notes || '',
      },
    };

    const safeUpdates = removeUndefinedFields({
      ...updates,
      updatedAt: '2026-10-28T14:00:00.000Z',
      notes: updates.notes ?? '',
    });

    expect(safeUpdates.notes).toBe('');
    expect(safeUpdates.previousValues?.notes).toBe('');
    expect(safeUpdates.previousValues?.quantity).toBe(3);
    expect(safeUpdates.previousValues?.totalPrice).toBe(30);
    expect(Object.values(safeUpdates as Record<string, unknown>).includes(undefined)).toBe(false);
    expect(Object.values(safeUpdates.previousValues as Record<string, unknown>).includes(undefined)).toBe(false);
  });

  it('4. Update an existing record with new notes: updates correctly', () => {
    const existingDoc: TeaSnackLog = {
      id: 'tea_2026-10-28',
      date: '2026-10-28',
      itemType: 'tea',
      type: 'tea',
      quantity: 2,
      count: 2,
      unitPrice: 10,
      amount: 10,
      totalPrice: 20,
      notes: 'Morning tea',
      createdAt: '2026-10-28T09:00:00.000Z',
    };

    const editNotesInput = 'Updated note: morning tea plus evening tea';

    const updates: Partial<TeaSnackLog> = {
      quantity: 4,
      count: 4,
      totalPrice: 40,
      notes: (editNotesInput || '').trim(),
      updateReason: 'Evening tea added',
      previousValues: {
        itemType: existingDoc.itemType || existingDoc.type || 'tea',
        quantity: existingDoc.quantity || existingDoc.count || 1,
        unitPrice: existingDoc.unitPrice || existingDoc.amount || 0,
        totalPrice: existingDoc.totalPrice !== undefined ? existingDoc.totalPrice : (existingDoc.amount !== undefined ? existingDoc.amount : 0),
        notes: existingDoc.notes || '',
      },
    };

    const safeUpdates = removeUndefinedFields({
      ...updates,
      updatedAt: '2026-10-28T18:00:00.000Z',
      notes: updates.notes ?? '',
    });

    expect(safeUpdates.notes).toBe('Updated note: morning tea plus evening tea');
    expect(safeUpdates.previousValues?.notes).toBe('Morning tea');
    expect(safeUpdates.previousValues?.quantity).toBe(2);
    expect(safeUpdates.quantity).toBe(4);
    expect(safeUpdates.totalPrice).toBe(40);
  });

  it('5. Verify monthly tea, coffee & snacks totals and calculations', () => {
    const logs: Partial<TeaSnackLog>[] = [
      {
        date: '2026-10-01',
        itemType: 'tea',
        quantity: 10,
        unitPrice: 10,
        totalPrice: 100,
        notes: 'Morning tea',
      },
      {
        date: '2026-10-02',
        itemType: 'coffee',
        quantity: 5,
        unitPrice: 20,
        totalPrice: 100,
        notes: '', // Empty notes
      },
      {
        date: '2026-10-03',
        itemType: 'snacks',
        quantity: 2,
        unitPrice: 50,
        totalPrice: 100,
        // Missing notes field (legacy format)
      },
      {
        // Legacy record using type and count and amount instead of itemType, quantity, totalPrice
        date: '2026-10-04',
        type: 'tea',
        count: 5,
        amount: 50,
      },
    ];

    const summary = calculateMonthlySummary(logs);

    // Tea: 10 cups (100) + 5 cups (50) = 15 cups, ₹150
    expect(summary.teaCups).toBe(15);
    expect(summary.teaAmount).toBe(150);

    // Coffee: 5 cups, ₹100
    expect(summary.coffeeCups).toBe(5);
    expect(summary.coffeeAmount).toBe(100);

    // Snacks: ₹100
    expect(summary.snacksAmount).toBe(100);

    // Grand Total: 150 + 100 + 100 = ₹350
    expect(summary.grandTotal).toBe(350);
  });
});
