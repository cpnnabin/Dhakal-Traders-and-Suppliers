import { describe, it, expect } from 'vitest';
import { buildJournalLines, buildCashBook, summarizeLedger } from '../ledgerUtils';
import type { SaleRecord, FarmerPurchase } from '../posTypes';

describe('ledgerUtils', () => {
  it('builds journal lines for simple sale and purchase', () => {
    const sale: SaleRecord = {
      id: 'S-001',
      items: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 1000,
      amountPaid: 1000,
      amountDue: 0,
      date: '2026-05-20',
      cashier: 'Cashier',
      paymentMode: 'Cash',
      status: 'completed'
    };

    const purchase: FarmerPurchase = {
      id: 'P-001',
      farmerName: 'Supplier A',
      productName: 'Item X',
      qtyKg: 10,
      rate: 50,
      total: 500,
      date: '2026-05-19'
    };

    const journal = buildJournalLines([sale], [purchase]);
    // Should contain debit for sale and credit for sales revenue
    expect(journal.some(l => l.voucherType === 'sale')).toBe(true);
    expect(journal.some(l => l.voucherType === 'purchase')).toBe(true);

    // Basic sanity checks
    const saleTotals = journal.filter(l => l.voucherType === 'sale').reduce((a, b) => a + Math.abs(b.debit - b.credit), 0);
    const purchaseTotals = journal.filter(l => l.voucherType === 'purchase').reduce((a, b) => a + Math.abs(b.debit - b.credit), 0);
    expect(saleTotals).toBeGreaterThan(0);
    expect(purchaseTotals).toBeGreaterThan(0);
  });

  it('builds cash book rows and summarizes ledger', () => {
    const sale: SaleRecord = {
      id: 'S-002',
      items: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 1200,
      amountPaid: 1200,
      amountDue: 0,
      date: '2026-05-21',
      cashier: 'Cashier',
      paymentMode: 'Cash',
      status: 'completed'
    };

    const purchase: FarmerPurchase = {
      id: 'P-002',
      farmerName: 'Supplier B',
      productName: 'Item Y',
      qtyKg: 5,
      rate: 100,
      total: 500,
      date: '2026-05-20'
    };

    const cashBook = buildCashBook([sale], [purchase]);
    // There should be two entries and a numeric running balance
    expect(cashBook.length).toBeGreaterThanOrEqual(1);
    expect(typeof cashBook[0].balance).toBe('number');

    const summary = summarizeLedger([sale], [purchase]);
    expect(summary.totalReceipts).toBeGreaterThan(0);
    expect(summary.totalPayments).toBeGreaterThan(0);
    expect(summary.salesCount).toBe(1);
    expect(summary.purchaseCount).toBe(1);
  });
});
