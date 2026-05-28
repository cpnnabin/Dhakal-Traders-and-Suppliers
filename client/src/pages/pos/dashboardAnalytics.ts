import type { SaleRecord } from './posTypes';

export function saleInvoiceNo(s: any): string {
  return String(s?.invoice_no || s?.id || '').trim();
}

export function saleDateStr(s: any): string {
  const raw = String(s?.bill_date || s?.date || s?.created_at || s?.createdAt || '');
  return raw.split(' ')[0].split('T')[0];
}

export function saleCustomerLabel(s: any): string {
  return String(s?.customerName || s?.full_name || 'Walk-in').trim() || 'Walk-in';
}

/** Exclude seed / demo rows from dashboard analytics. */
export function isRealSale(s: SaleRecord | any): boolean {
  const id = saleInvoiceNo(s).toUpperCase();
  if (!id) return false;
  if (/^INV-TEST/i.test(id)) return false;
  if (/^TEST-/i.test(id)) return false;
  if (s?.isTest || s?.is_demo || s?.demo) return false;
  const total = Number(s?.total);
  if (!Number.isFinite(total) || total < 0) return false;
  return true;
}

export function sortSalesNewestFirst(list: SaleRecord[]): SaleRecord[] {
  return [...list].sort((a, b) => {
    const ta = new Date(saleDateStr(a) + 'T12:00:00').getTime();
    const tb = new Date(saleDateStr(b) + 'T12:00:00').getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });
}

export type DailyBucket = { day: string; label: string; total: number; count: number };

export function buildDailyBuckets(sales: SaleRecord[], dayCount = 7): DailyBucket[] {
  const buckets: DailyBucket[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    buckets.push({ day, label, total: 0, count: 0 });
  }

  for (const s of sales) {
    const key = saleDateStr(s);
    const bucket = buckets.find(b => b.day === key);
    if (!bucket) continue;
    bucket.total += Number(s.total) || 0;
    bucket.count += 1;
  }

  return buckets;
}

export type PaymentBreakdown = { paid: number; partial: number; unpaid: number };

export function paymentBreakdown(sales: SaleRecord[]): PaymentBreakdown {
  let paid = 0;
  let partial = 0;
  let unpaid = 0;
  for (const s of sales) {
    const due = Number(s.amountDue) || 0;
    const total = Number(s.total) || 0;
    if (due <= 0) paid += 1;
    else if (due >= total) unpaid += 1;
    else partial += 1;
  }
  return { paid, partial, unpaid };
}

export type CategoryBucket = { name: string; total: number };

export function salesByCategory(sales: SaleRecord[], products: { id: string; category?: string; nameEn?: string }[]): CategoryBucket[] {
  const productCat = new Map<string, string>();
  for (const p of products) {
    productCat.set(String(p.id), String(p.category || 'Other'));
  }
  const totals = new Map<string, number>();
  for (const s of sales) {
    for (const item of s.items || []) {
      const cat = productCat.get(String(item.productId)) || 'Other';
      const line = Number(item.total) || (Number(item.rate) || 0) * (Number(item.qty) || 0);
      totals.set(cat, (totals.get(cat) || 0) + line);
    }
  }
  return Array.from(totals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
}
