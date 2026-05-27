// ─── Accounting ledger & journal builders (from sales + purchases) ───────────

import { FarmerPurchase, SaleRecord } from './posTypes';

export type LedgerView = 'cashbook' | 'journal';

export interface AccountDef {
  code: string;
  nameNe: string;
  nameEn: string;
}

export const ACCOUNTS: Record<string, AccountDef> = {
  '1000': { code: '1000', nameNe: 'नगद', nameEn: 'Cash' },
  '1100': { code: '1100', nameNe: 'बैंक', nameEn: 'Bank' },
  '2000': { code: '2000', nameNe: 'देय रकम', nameEn: 'Accounts Payable' },
  '3000': { code: '3000', nameNe: 'बिक्री आम्दानी', nameEn: 'Sales Revenue' },
  '4000': { code: '4000', nameNe: 'खरिद', nameEn: 'Purchases' },
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

function saleRef(s: any): string {
  return String(s.invoice_no || s.id || '');
}

function saleDate(s: any): string {
  return String(s.bill_date || s.date || s.created_at || s.createdAt || '');
}

function purchaseRef(p: any): string {
  return String(p.bill_no || p.id || '');
}

function purchaseDate(p: any): string {
  return String(p.purchase_date || p.date || p.created_at || p.createdAt || '');
}

function salePartyName(s: any): string {
  return String(s.customerName || s.full_name || s.customer || s.customerPhone || s.customerLoginId || 'Walk-in sale');
}

function purchasePartyName(p: any): string {
  return String(p.farmerName || p.supplierName || p.supplier_name || 'Supplier');
}

function purchaseQty(p: any): number {
  return Number(p.qtyKg ?? p.qty ?? 0);
}

function isCreditSale(s: SaleRecord): boolean {
  return String((s as any).paymentMode || (s as any).payment_mode || '').trim().toLowerCase() === 'credit';
}

function isCreditPurchase(p: FarmerPurchase): boolean {
  return String((p as any).paymentMode || (p as any).payment_mode || '').trim().toLowerCase() === 'credit';
}

function accountSortKey(code: string): number {
  const parsed = Number.parseInt(code, 10);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

/** Double-entry journal lines per voucher */
export function buildJournalLines(sales: SaleRecord[], purchases: FarmerPurchase[]): JournalLine[] {
  const lines: JournalLine[] = [];

  sales.forEach((s, i) => {
    const sale: any = s;
    const sortKey = parseSortKey(saleDate(sale), i);
    const total = Number(sale.total || sale.net_amount || 0);
    const tax = Number(sale.tax || sale.vat_amount || 0);
    const discount = Number(sale.discount || sale.discount_amount || 0);
    const revenue = Math.max(0, total - tax);
    const partyName = salePartyName(sale);
    const paymentMode = String(sale.paymentMode || sale.payment_mode || 'Cash');
    const ref = saleRef(sale);
    const particulars = sale.customerName || sale.full_name ? `${ref} — ${salePartyName(sale)}` : `${ref} — ${paymentMode}`;

    if (total > 0) {
      lines.push({
        lineId: `${ref}-d-receivable`,
        voucherId: ref,
        voucherType: 'sale',
        date: saleDate(sale),
        sortKey,
        accountCode: isCreditSale(sale) ? '2000' : (paymentMode.toLowerCase().includes('bank') ? '1100' : '1000'),
        partyName,
        paymentMode,
        particulars,
        debit: total,
        credit: 0,
      });
    }
    if (revenue > 0) {
      lines.push({
        lineId: `${ref}-c-sales`,
        voucherId: ref,
        voucherType: 'sale',
        date: saleDate(sale),
        sortKey,
        accountCode: '3000',
        partyName,
        paymentMode,
        particulars,
        debit: 0,
        credit: revenue,
      });
    }
    if (tax > 0) {
      lines.push({
        lineId: `${ref}-c-vat`,
        voucherId: ref,
        voucherType: 'sale',
        date: saleDate(sale),
        sortKey,
        accountCode: '2000',
        partyName,
        paymentMode,
        particulars,
        debit: 0,
        credit: tax,
      });
    }
    if (discount > 0) {
      lines.push({
        lineId: `${ref}-d-disc`,
        voucherId: ref,
        voucherType: 'sale',
        date: saleDate(sale),
        sortKey,
        accountCode: '3000',
        partyName,
        paymentMode,
        particulars,
        debit: discount,
        credit: 0,
      });
    }
  });

  purchases.forEach((p, i) => {
    const purchase: any = p;
    const sortKey = parseSortKey(purchaseDate(purchase), 10000 + i);
    const total = Number(purchase.total || purchase.net_amount || 0);
    const partyName = purchasePartyName(purchase);
    const paymentMode = String(purchase.paymentMode || purchase.payment_mode || 'Cash');
    const ref = purchaseRef(purchase);
    const particulars = `${ref} — ${partyName} (${String(purchase.productName || purchase.product_name || '' )}, ${purchaseQty(purchase)} kg)`;

    if (total > 0) {
      lines.push({
        lineId: `${ref}-d-pur`,
        voucherId: ref,
        voucherType: 'purchase',
        date: purchaseDate(purchase),
        sortKey,
        accountCode: '4000',
        partyName,
        paymentMode,
        particulars,
        debit: total,
        credit: 0,
      });
      lines.push({
        lineId: `${ref}-c-cash`,
        voucherId: ref,
        voucherType: 'purchase',
        date: purchaseDate(purchase),
        sortKey,
        accountCode: isCreditPurchase(purchase) ? '2000' : (paymentMode.toLowerCase().includes('bank') ? '1100' : '1000'),
        partyName,
        paymentMode,
        particulars,
        debit: 0,
        credit: total,
      });
    }
  });

  return lines.sort((a, b) => b.sortKey - a.sortKey);
}

/** Single-column cash book with running balance */
export function buildCashBook(sales: SaleRecord[], purchases: FarmerPurchase[]): CashBookRow[] {
  const rows: Omit<CashBookRow, 'balance'>[] = [];

  sales.forEach((s, i) => {
    const sale: any = s;
    if (isCreditSale(sale)) return;
    const ref = saleRef(sale);
    const date = saleDate(sale);
    const total = Number(sale.total || sale.net_amount || 0);
    rows.push({
      id: `cb-${ref}`,
      date,
      sortKey: parseSortKey(date, i),
      ref,
      type: 'sale',
      partyName: salePartyName(sale),
      paymentMode: String(sale.paymentMode || sale.payment_mode || 'Cash'),
      particulars: `${tSaleLabel(sale)} — NRS ${total.toLocaleString()}`,
      receipt: total,
      payment: 0,
    });
  });

  purchases.forEach((p, i) => {
    const purchase: any = p;
    if (isCreditPurchase(purchase)) return;
    const ref = purchaseRef(purchase);
    const date = purchaseDate(purchase);
    const total = Number(purchase.total || purchase.net_amount || 0);
    rows.push({
      id: `cb-${ref}`,
      date,
      sortKey: parseSortKey(date, 10000 + i),
      ref,
      type: 'purchase',
      partyName: purchasePartyName(purchase),
      paymentMode: String(purchase.paymentMode || purchase.payment_mode || 'Cash'),
      particulars: `${purchasePartyName(purchase)} — ${String(purchase.productName || purchase.product_name || '')} (${purchaseQty(purchase)} kg)`,
      receipt: 0,
      payment: total,
    });
  });

  rows.sort((a, b) => a.sortKey - b.sortKey);

  let balance = 0;
  return rows.map((r) => {
    balance += r.receipt - r.payment;
    return { ...r, balance };
  }).reverse();
}

function tSaleLabel(s: any): string {
  return String(s.customerName || s.full_name || s.cashier || 'Walk-in sale');
}

export function summarizeLedger(sales: SaleRecord[], purchases: FarmerPurchase[]): LedgerSummary {
  const journal = buildJournalLines(sales, purchases);
  const totalReceipts = sales.reduce((a, s) => a + Number((s as any).total || (s as any).net_amount || 0), 0);
  const totalPayments = purchases.reduce((a, p) => a + Number((p as any).total || (p as any).net_amount || 0), 0);
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
