// ─── Accounting ledger & journal builders (from sales + purchases) ───────────

import { FarmerPurchase, SaleRecord } from './posTypes';

export type LedgerView = 'cashbook' | 'journal';

export interface AccountDef {
  code: string;
  nameNe: string;
  nameEn: string;
}

export const ACCOUNTS: Record<string, AccountDef> = {
  '1001': { code: '1001', nameNe: 'नगद / बैंक', nameEn: 'Cash & Bank' },
  '1002': { code: '1002', nameNe: 'प्राप्य रकम', nameEn: 'Accounts Receivable' },
  '2001': { code: '2001', nameNe: 'भ्याट देय', nameEn: 'VAT Payable' },
  '2002': { code: '2002', nameNe: 'देय रकम', nameEn: 'Accounts Payable' },
  '4001': { code: '4001', nameNe: 'बिक्री आम्दानी', nameEn: 'Sales Revenue' },
  '4002': { code: '4002', nameNe: 'बिक्री छुट', nameEn: 'Sales Discount' },
  '6001': { code: '6001', nameNe: 'किसान खरिद (COGS)', nameEn: 'Farmer Purchase (COGS)' },
};

export interface JournalLine {
  lineId: string;
  voucherId: string;
  voucherType: 'sale' | 'purchase';
  date: string;
  sortKey: number;
  accountCode: string;
  partyName: string;
  paymentMode: string;
  particulars: string;
  debit: number;
  credit: number;
}

export interface CashBookRow {
  id: string;
  date: string;
  sortKey: number;
  ref: string;
  type: 'sale' | 'purchase';
  partyName: string;
  paymentMode: string;
  particulars: string;
  receipt: number;
  payment: number;
  balance: number;
}

export interface LedgerSummary {
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  salesCount: number;
  purchaseCount: number;
  journalLines: number;
}

function parseSortKey(dateStr: string, fallbackIndex: number): number {
  const parsed = Date.parse(dateStr.replace(/(\d{2}):(\d{2})\s*(AM|PM)/i, (_, h, m, ap) => {
    let hour = parseInt(h, 10);
    if (ap.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (ap.toUpperCase() === 'AM' && hour === 12) hour = 0;
    return `${hour}:${m}`;
  }));
  return Number.isNaN(parsed) ? fallbackIndex : parsed;
}

function isCreditSale(s: SaleRecord): boolean {
  return String(s.paymentMode || '').trim().toLowerCase() === 'credit';
}

function isCreditPurchase(p: FarmerPurchase): boolean {
  return String(p.paymentMode || '').trim().toLowerCase() === 'credit';
}

function accountSortKey(code: string): number {
  const parsed = Number.parseInt(code, 10);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

/** Double-entry journal lines per voucher */
export function buildJournalLines(sales: SaleRecord[], purchases: FarmerPurchase[]): JournalLine[] {
  const lines: JournalLine[] = [];

  sales.forEach((s, i) => {
    const sortKey = parseSortKey(s.date, i);
    const revenue = Math.max(0, s.subtotal - s.discount);
    const partyName = s.customerName || s.customerLoginId || s.customerPhone || 'Walk-in sale';
    const paymentMode = s.paymentMode || 'Cash';
    const particulars = s.customerName
      ? `${s.id} — ${s.customerName}`
      : `${s.id} — ${paymentMode}`;

    if (s.total > 0) {
      lines.push({
        lineId: `${s.id}-d-receivable`,
        voucherId: s.id,
        voucherType: 'sale',
        date: s.date,
        sortKey,
        accountCode: isCreditSale(s) ? '1002' : '1001',
        partyName,
        paymentMode,
        particulars,
        debit: s.total,
        credit: 0,
      });
    }
    if (revenue > 0) {
      lines.push({
        lineId: `${s.id}-c-sales`,
        voucherId: s.id,
        voucherType: 'sale',
        date: s.date,
        sortKey,
        accountCode: '4001',
        partyName,
        paymentMode,
        particulars,
        debit: 0,
        credit: revenue,
      });
    }
    if (s.tax > 0) {
      lines.push({
        lineId: `${s.id}-c-vat`,
        voucherId: s.id,
        voucherType: 'sale',
        date: s.date,
        sortKey,
        accountCode: '2001',
        partyName,
        paymentMode,
        particulars,
        debit: 0,
        credit: s.tax,
      });
    }
    if (s.discount > 0) {
      lines.push({
        lineId: `${s.id}-d-disc`,
        voucherId: s.id,
        voucherType: 'sale',
        date: s.date,
        sortKey,
        accountCode: '4002',
        partyName,
        paymentMode,
        particulars,
        debit: s.discount,
        credit: 0,
      });
    }
  });

  purchases.forEach((p, i) => {
    const sortKey = parseSortKey(p.date, 10000 + i);
    const partyName = p.farmerName;
    const paymentMode = p.paymentMode || 'Cash';
    const particulars = `${p.id} — ${p.farmerName} (${p.productName}, ${p.qtyKg} kg)`;

    if (p.total > 0) {
      lines.push({
        lineId: `${p.id}-d-pur`,
        voucherId: p.id,
        voucherType: 'purchase',
        date: p.date,
        sortKey,
        accountCode: '6001',
        partyName,
        paymentMode,
        particulars,
        debit: p.total,
        credit: 0,
      });
      lines.push({
        lineId: `${p.id}-c-cash`,
        voucherId: p.id,
        voucherType: 'purchase',
        date: p.date,
        sortKey,
        accountCode: isCreditPurchase(p) ? '2002' : '1001',
        partyName,
        paymentMode,
        particulars,
        debit: 0,
        credit: p.total,
      });
    }
  });

  return lines.sort((a, b) => b.sortKey - a.sortKey);
}

/** Single-column cash book with running balance */
export function buildCashBook(sales: SaleRecord[], purchases: FarmerPurchase[]): CashBookRow[] {
  const rows: Omit<CashBookRow, 'balance'>[] = [];

  sales.forEach((s, i) => {
    if (isCreditSale(s)) return;
    rows.push({
      id: `cb-${s.id}`,
      date: s.date,
      sortKey: parseSortKey(s.date, i),
      ref: s.id,
      type: 'sale',
      partyName: s.customerName || s.customerLoginId || s.customerPhone || 'Walk-in sale',
      paymentMode: s.paymentMode || 'Cash',
      particulars: `${tSaleLabel(s)} — NRS ${s.total.toLocaleString()}`,
      receipt: s.total,
      payment: 0,
    });
  });

  purchases.forEach((p, i) => {
    if (isCreditPurchase(p)) return;
    rows.push({
      id: `cb-${p.id}`,
      date: p.date,
      sortKey: parseSortKey(p.date, 10000 + i),
      ref: p.id,
      type: 'purchase',
      partyName: p.farmerName,
      paymentMode: p.paymentMode || 'Cash',
      particulars: `${p.farmerName} — ${p.productName} (${p.qtyKg} kg)`,
      receipt: 0,
      payment: p.total,
    });
  });

  rows.sort((a, b) => a.sortKey - b.sortKey);

  let balance = 0;
  return rows.map((r) => {
    balance += r.receipt - r.payment;
    return { ...r, balance };
  }).reverse();
}

function tSaleLabel(s: SaleRecord): string {
  return s.customerName || s.cashier || 'Walk-in sale';
}

export function summarizeLedger(sales: SaleRecord[], purchases: FarmerPurchase[]): LedgerSummary {
  const cashBook = buildCashBook(sales, purchases);
  const journal = buildJournalLines(sales, purchases);
  const totalReceipts = sales.reduce((a, s) => a + s.total, 0);
  const totalPayments = purchases.reduce((a, p) => a + p.total, 0);
  return {
    totalReceipts,
    totalPayments,
    closingBalance: totalReceipts - totalPayments,
    salesCount: sales.length,
    purchaseCount: purchases.length,
    journalLines: journal.length,
  };
}

/** Trial balance by account */
export function buildTrialBalance(journal: JournalLine[]): { account: AccountDef; debit: number; credit: number }[] {
  const map = new Map<string, { debit: number; credit: number }>();

  journal.forEach((line) => {
    const cur = map.get(line.accountCode) || { debit: 0, credit: 0 };
    cur.debit += line.debit;
    cur.credit += line.credit;
    map.set(line.accountCode, cur);
  });

  return Object.values(ACCOUNTS)
    .sort((a, b) => accountSortKey(a.code) - accountSortKey(b.code))
    .map((account) => {
      const bal = map.get(account.code) || { debit: 0, credit: 0 };
      return { account, debit: bal.debit, credit: bal.credit };
    })
    .filter((row) => row.debit > 0 || row.credit > 0);
}

export function exportJournalCSV(lines: JournalLine[], lang: 'ne' | 'en'): string {
  const header = lang === 'ne'
    ? ['मिति', 'भौचर', 'प्रकार', 'खाता', 'विवरण', 'डेबिट', 'क्रेडिट']
    : ['Date', 'Voucher', 'Type', 'Account', 'Particulars', 'Debit', 'Credit'];
  const rows = lines.map((l) => {
    const acc = ACCOUNTS[l.accountCode];
    const accName = lang === 'ne' ? acc?.nameNe : acc?.nameEn;
    return [l.date, l.voucherId, l.voucherType, accName || l.accountCode, l.particulars, l.debit, l.credit];
  });
  return [header, ...rows].map((r) => r.join(',')).join('\n');
}

export function exportCashBookCSV(rows: CashBookRow[], lang: 'ne' | 'en'): string {
  const header = lang === 'ne'
    ? ['मिति', 'सन्दर्भ', 'प्रकार', 'विवरण', 'आम्दानी', 'खर्च', 'बाँकी']
    : ['Date', 'Ref', 'Type', 'Particulars', 'Receipt', 'Payment', 'Balance'];
  const body = rows.map((r) => [r.date, r.ref, r.type, r.particulars, r.receipt, r.payment, r.balance]);
  return [header, ...body].map((row) => row.join(',')).join('\n');
}

function downloadCSV(filename: string, content: string) {
  const link = document.createElement('a');
  link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadJournalExport(lines: JournalLine[], lang: 'ne' | 'en') {
  downloadCSV(`dhakal_journal_${Date.now()}.csv`, exportJournalCSV(lines, lang));
}

export function downloadCashBookExport(rows: CashBookRow[], lang: 'ne' | 'en') {
  downloadCSV(`dhakal_cashbook_${Date.now()}.csv`, exportCashBookCSV(rows, lang));
}
