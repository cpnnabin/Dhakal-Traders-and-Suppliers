// ─── POS Page: Parties — Full-screen Customer/Supplier Management ─────────────
import React, { useMemo, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { usePOS } from './POSContext';
import { saveLS, LS } from './posTypes';
import { Party, PaymentRecord, SaleRecord, FarmerPurchase } from './posTypes';

type PartyType = 'customer' | 'supplier';

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ne-NP', { year: 'numeric', month: 'short', day: 'numeric' });
}

function NRS(n: number) {
  return 'रू ' + n.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Normalization helpers (prefer new schema fields, fallback to legacy)
const saleRef = (s: any) => String(s.invoice_no || s.id || '');
const saleDate = (s: any) => String(s.bill_date || s.date || s.created_at || s.createdAt || '');
const saleAmount = (s: any) => Number(s.total ?? s.net_amount ?? s.gross_amount ?? 0);
const saleAmountPaid = (s: any) => Number(s.amountPaid ?? s.paid_amount ?? s.paid ?? 0);
const saleAmountDue = (s: any) => Number(s.amountDue ?? s.due_amount ?? s.due ?? 0);
const saleCustomerName = (s: any) => String(s.customerName || s.full_name || s.customer || 'Walk-in');

const purchaseRef = (p: any) => String(p.bill_no || p.id || '');
const purchaseDate = (p: any) => String(p.purchase_date || p.date || p.created_at || p.createdAt || '');
const purchaseTotal = (p: any) => Number(p.total ?? p.net_amount ?? 0);
const purchasePartyName = (p: any) => String(p.farmerName || p.supplierName || p.supplier_name || 'Supplier');

function formatPrintDate(d: string) {
  if (!d) return '-';
  // try to parse ISO or datetime strings and show compact date+time
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) {
    // format: YYYY-MM-DD HH:MM (24h) — compact and consistent
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }
  // fallback: trimmed
  return String(d).replace(/T/, ' ').split('.')[0];
}

interface LedgerRow {
  date: string;
  ref: string;
  desc: string;
  debit: number;   // money going out from party (supplier payment out, or sale credit given)
  credit: number;  // money coming in (customer payment, purchase amount owed)
  balance: number;
  type: 'sale' | 'purchase' | 'payment-in' | 'payment-out' | 'opening';
  sourceType?: 'sale' | 'payment' | 'purchase' | 'opening';
  sourceId?: string;
  partyName?: string;
}

type EditTarget =
  | { kind: 'sale'; sale: SaleRecord }
  | { kind: 'payment'; payment: PaymentRecord }
  | null;

export default function PartiesPage() {
  const { sales, setSales, purchases, products, setReceiptData, receiptEditTarget, setReceiptEditTarget, t } = usePOS() as any;

  

  const [viewPayment, setViewPayment] = React.useState<PaymentRecord | null>(null);

  // Local parties state (would come from API/context in production)
  const [parties, setParties] = React.useState<Party[]>(() => {
    try {
      const raw = localStorage.getItem('dt_pos_parties');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      { id: 'C-001', name: 'Ram Bahadur Basnet', phone: '9841234567', address: 'Salyan', type: 'customer', openingBalance: 0, createdAt: '2026-01-01' },
      { id: 'C-002', name: 'Dil Maya Gharti', phone: '9857654321', address: 'Surkhet', type: 'customer', openingBalance: 0, createdAt: '2026-01-15' },
      { id: 'S-001', name: 'Hari Prasad Bhandari', phone: '9800112233', address: 'Dang', type: 'supplier', openingBalance: 0, createdAt: '2026-01-01' },
      { id: 'S-002', name: 'Shiva Herbal Suppliers', phone: '9812345678', address: 'Kathmandu', type: 'supplier', openingBalance: 0, createdAt: '2026-02-01' },
    ];
  });

  const [payments, setPayments] = React.useState<PaymentRecord[]>(() => {
    try {
      const raw = localStorage.getItem('dt_pos_payments');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      { id: 'PAY-001', partyId: 'C-001', partyName: 'Ram Bahadur Basnet', partyType: 'customer', type: 'in', amount: 5000, mode: 'Cash', date: '2026-05-19', note: 'Advance payment' },
    ];
  });

  const saveParties = (p: Party[]) => {
    setParties(p);
    localStorage.setItem('dt_pos_parties', JSON.stringify(p));
  };

  function formatNRS(n: number) {
    return 'रू ' + n.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function printPartyStatement(party: Party) {
    const rows = filteredLedger.length ? filteredLedger : getPartyLedger(party);
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    const balance = rows.length ? rows[rows.length - 1].balance : 0;

    // determine date range
    const fromIso = dateFrom || (rows.length ? String(rows[0].date).split('T')[0] : new Date().toISOString().slice(0,10));
    const toIso = dateTo || (rows.length ? String(rows[rows.length - 1].date).split('T')[0] : fromIso);
    let fromNep = '';
    let toNep = '';
    try {
      const [f, t] = await Promise.all([
        fetch(`/api/convert-date?date=${encodeURIComponent(fromIso)}&to=nepali`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/convert-date?date=${encodeURIComponent(toIso)}&to=nepali`).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      fromNep = f && (f.nepali || f.converted || f.date) ? (f.nepali || f.converted || f.date) : '';
      toNep = t && (t.nepali || t.converted || t.date) ? (t.nepali || t.converted || t.date) : '';
    } catch (e) {
      // ignore
    }

    const now = new Date();
    const generated = now.toLocaleString();

    const rowsHtml = rows.map(r => `
      <tr>
        <td class="c-date">${formatPrintDate(String(r.date))}</td>
        <td class="c-ref"><strong>${r.ref}</strong><div style="font-size:11px;color:#444">${r.partyName || ''}</div></td>
        <td class="c-desc">${(r.desc || '').replace(/</g,'&lt;')}</td>
        <td class="c-num">${r.debit ? formatNRS(r.debit) : '--'}</td>
        <td class="c-num">${r.credit ? formatNRS(r.credit) : '--'}</td>
        <td class="c-num">${formatNRS(r.balance || 0)}</td>
      </tr>
    `).join('');

    const html = `
      <html>
      <head>
        <title>Party Statement - ${party.name}</title>
          <style>
          @media print { @page { margin: 10mm 8mm; size: A4; } }
          body{font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif;padding:12px;color:#111;font-size:11px;line-height:1.15}
          .head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:6px}
          .company{font-weight:800;font-size:16px}
          .company-sub{font-size:11px;color:#333}
          .meta{font-size:11px;text-align:right}
          .party{margin-top:8px;padding:8px;border:1px solid #eee;background:#fff}
          table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px;table-layout:fixed}
          th,td{padding:6px;border:1px solid #e9e9e9;text-align:left;vertical-align:top}
          th{background:#f6f6f6;font-weight:700}
          .c-date{width:13%;white-space:nowrap}
          .c-ref{width:13%;white-space:nowrap}
          .c-desc{width:46%;word-break:break-word}
          .c-num{width:14%;text-align:right;white-space:nowrap}
          .totals{font-weight:700;background:#f4f4f4}
          .small{font-size:10px;color:#555}
          .logo-placeholder{width:44px;height:44px;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center}
          .page-break{page-break-after:always}
        </style>
      </head>
      <body>
        <div class="head">
          <div style="display:flex;gap:12px;align-items:center">
            <img src="/favicon.svg" alt="logo" class="logo-placeholder" />
            <div>
              <div class="company">Dhakal Traders & Suppliers</div>
              <div class="company-sub">Dhapakhel, Lalitpur · Phone: 986-XXXXXXX</div>
            </div>
          </div>
          <div class="meta">
            <div style="font-weight:700">Party Statement</div>
            <div class="small">Generated: ${generated}</div>
            <div class="small">${fromNep && toNep ? `Miti: ${fromNep} — ${toNep}` : ''}</div>
          </div>
        </div>
        <div class="party">
          <div><strong>${party.name}</strong> — ${party.type === 'customer' ? 'Customer' : 'Supplier'}</div>
          <div class="small">${t('Contact Info', 'Contact Info')}: ${party.phone || '-' } · ${party.address || '-'}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${t('Date','Date')}</th>
              <th>${t('Ref #','Ref #')}</th>
              <th>${t('Description','Description')}</th>
              <th style="text-align:right">${t('Debit','Debit')}</th>
              <th style="text-align:right">${t('Credit','Credit')}</th>
              <th style="text-align:right">${t('Balance','Balance')}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="totals"><td colspan="3">${t('Total','Total')}</td><td style="text-align:right">${formatNRS(totalDebit)}</td><td style="text-align:right">${formatNRS(totalCredit)}</td><td style="text-align:right">${formatNRS(balance)}</td></tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Prefer printing via a hidden iframe to avoid popup blockers and make printing more reliable
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const idoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      if (!idoc) throw new Error('Failed to access iframe document');
      idoc.open();
      idoc.write(html);
      idoc.close();

      const doPrint = () => {
        try {
          const win = iframe.contentWindow as Window | null;
          if (!win) throw new Error('No iframe window');
          win.focus();
          // Some browsers require a small delay before calling print
          setTimeout(() => {
            try { win.print(); } catch (err) { console.error('print failed', err); }
            setTimeout(() => { try { document.body.removeChild(iframe); } catch (_) {} }, 500);
          }, 200);
        } catch (err) {
          try { document.body.removeChild(iframe); } catch (_) {}
          console.error('Print via iframe failed', err);
          // fallback to window.open
          const w = window.open('', '_blank');
          if (!w) return alert('Popup blocked — allow popups to print');
          w.document.write(html);
          w.document.close();
          setTimeout(() => { try { w.focus(); w.print(); } catch (_) {} }, 600);
        }
      };

      if (idoc.readyState === 'complete') { doPrint(); }
      else {
        idoc.addEventListener && idoc.addEventListener('DOMContentLoaded', () => doPrint(), { once: true });
        iframe.addEventListener && iframe.addEventListener('load', () => doPrint(), { once: true });
        setTimeout(() => doPrint(), 1200);
      }
    } catch (err) {
      console.error('Printing failed', err);
      alert('Printing failed: ' + (err && (err as Error).message ? (err as Error).message : 'Unknown error'));
    }
  }

  async function downloadPartyPDF(party: Party) {
    // Build same HTML content as printPartyStatement but render offscreen for PDF
    const rows = filteredLedger.length ? filteredLedger : getPartyLedger(party);
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    const balance = rows.length ? rows[rows.length - 1].balance : 0;

    // prepare filename using Nepali date range if possible
    let fromIso = dateFrom || (rows.length ? String(rows[0].date).split('T')[0] : new Date().toISOString().slice(0,10));
    let toIso = dateTo || (rows.length ? String(rows[rows.length - 1].date).split('T')[0] : fromIso);
    let fromNep = '';
    let toNep = '';
    try {
      const [f, t] = await Promise.all([
        fetch(`/api/convert-date?date=${encodeURIComponent(fromIso)}&to=nepali`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/convert-date?date=${encodeURIComponent(toIso)}&to=nepali`).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      fromNep = f && (f.nepali || f.converted || f.date) ? (f.nepali || f.converted || f.date) : '';
      toNep = t && (t.nepali || t.converted || t.date) ? (t.nepali || t.converted || t.date) : '';
    } catch (e) {
      // ignore
    }

    const tableHtml = `
      <div style="padding:12px;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:11px;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:6px">
          <div style="display:flex;gap:10px;align-items:center"><img src="/favicon.svg" alt="logo" style="width:44px;height:44px;border-radius:6px;object-fit:cover" /><div style="font-weight:700;font-size:16px">Dhakal Traders & Suppliers<div style="font-size:11px;color:#333">Dhapakhel, Lalitpur · Phone: 986-XXXXXXX</div></div></div>
          <div style="text-align:right;font-size:12px"><div style="font-weight:700">Party Statement</div><div style="font-size:11px">Generated: ${new Date().toLocaleString()}</div><div style="font-size:11px">${fromNep && toNep ? `Miti: ${fromNep} — ${toNep}` : ''}</div></div>
        </div>
        <div style="margin-top:8px;margin-bottom:6px">${party.name} — ${party.type === 'customer' ? 'Customer' : 'Supplier'}<div style="font-size:11px;color:#555">Contact: ${party.phone || '-'} · ${party.address || '-'}</div></div>
        <table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:11px;table-layout:fixed">
          <thead><tr style="background:#f6f6f6"><th style="padding:6px;border:1px solid #ddd;width:13%">${t('Date','Date')}</th><th style="padding:6px;border:1px solid #ddd;width:13%">${t('Ref #','Ref #')}</th><th style="padding:6px;border:1px solid #ddd;width:46%">${t('Description','Description')}</th><th style="padding:6px;border:1px solid #ddd;width:14%;text-align:right">${t('Debit','Debit')}</th><th style="padding:6px;border:1px solid #ddd;width:14%;text-align:right">${t('Credit','Credit')}</th><th style="padding:6px;border:1px solid #ddd;width:14%;text-align:right">${t('Balance','Balance')}</th></tr></thead>
          <tbody>
            ${rows.map(r => `<tr><td style="padding:6px;border:1px solid #ddd;white-space:nowrap">${formatPrintDate(String(r.date))}</td><td style="padding:6px;border:1px solid #ddd;white-space:nowrap"><strong>${r.ref}</strong><div style="font-size:11px;color:#444">${r.partyName||''}</div></td><td style="padding:6px;border:1px solid #ddd;word-break:break-word">${(r.desc||'').replace(/</g,'&lt;')}</td><td style="padding:6px;border:1px solid #ddd;text-align:right;white-space:nowrap">${r.debit?formatNRS(r.debit):'--'}</td><td style="padding:6px;border:1px solid #ddd;text-align:right;white-space:nowrap">${r.credit?formatNRS(r.credit):'--'}</td><td style="padding:6px;border:1px solid #ddd;text-align:right;white-space:nowrap">${formatNRS(r.balance||0)}</td></tr>`).join('')}
            <tr style="font-weight:700;background:#f4f4f4"><td colspan="3" style="padding:6px;border:1px solid #ddd">${t('Total','Total')}</td><td style="padding:6px;border:1px solid #ddd;text-align:right;white-space:nowrap">${formatNRS(totalDebit)}</td><td style="padding:6px;border:1px solid #ddd;text-align:right;white-space:nowrap">${formatNRS(totalCredit)}</td><td style="padding:6px;border:1px solid #ddd;text-align:right;white-space:nowrap">${formatNRS(balance)}</td></tr>
          </tbody>
        </table>
      </div>
    `;

    

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.innerHTML = tableHtml;
    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' } as any);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = (pdf as any).getImageProperties(imgData);
      const imgWidth = pageWidth - 20; // margins
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      // build filename like: Killer_7___statement_report_2082-08-01_to_2082-08-29.pdf
      const safeName = (party.id || party.name || 'party').toString().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
      const fromPart = fromNep || fromIso;
      const toPart = toNep || toIso;
      const filename = `${safeName}___statement_report_${fromPart}_to_${toPart}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Failed to generate PDF');
    } finally {
      document.body.removeChild(container);
    }
  }

  // When a receipt edit target is set from elsewhere (ReceiptModal), open the edit modal here
  React.useEffect(() => {
    if (!receiptEditTarget) return;
    // reuse openEditRow to populate forms correctly
    openEditRow({
      date: receiptEditTarget.date || '',
      ref: receiptEditTarget.id || receiptEditTarget.id,
      desc: '',
      debit: 0,
      credit: 0,
      balance: 0,
      type: 'sale',
      sourceType: 'sale',
      sourceId: receiptEditTarget.id,
    });
    setReceiptEditTarget(null);
  }, [receiptEditTarget]);

  const savePayments = (p: PaymentRecord[]) => {
    setPayments(p);
    localStorage.setItem('dt_pos_payments', JSON.stringify(p));
  };

  const [activeTab, setActiveTab] = React.useState<PartyType>('customer');
  const [selectedParty, setSelectedParty] = React.useState<Party | null>(null);
  const [search, setSearch] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [showAddParty, setShowAddParty] = React.useState(false);
  const [showPayment, setShowPayment] = React.useState<'in' | 'out' | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [editSaleForm, setEditSaleForm] = useState({
    date: '',
    customerName: '',
    customerPhone: '',
    paymentMode: 'Cash',
    discount: 0,
    taxPct: 13,
    amountPaid: '',
    amountDue: '',
    note: '',
    items: [] as { productId: string; name: string; rate: number; qty: number; unit?: string; total: number }[],
  });
  const [editProductQuery, setEditProductQuery] = useState('');
  const [editQuickQty, setEditQuickQty] = useState(1);
  const [editPaymentForm, setEditPaymentForm] = useState({ receiptNo: '', amount: '', mode: 'Cash', date: '', note: '', type: 'in' as 'in' | 'out' });

  // Add/Edit party form
  const [partyForm, setPartyForm] = React.useState({ name: '', phone: '', email: '', address: '', panNo: '', openingBalance: 0, notes: '' });
  const [editingParty, setEditingParty] = React.useState<Party | null>(null);

  // Payment form
  const [payForm, setPayForm] = React.useState({ amount: '', mode: 'Cash', note: '', date: new Date().toISOString().split('T')[0] });

  const filteredParties = useMemo(() => {
    const q = search.toLowerCase();
    return parties.filter(p => p.type === activeTab && (
      p.name.toLowerCase().includes(q) ||
      (p.phone || '').includes(q) ||
      (p.address || '').toLowerCase().includes(q)
    ));
  }, [parties, activeTab, search]);

  const filteredEditProducts = useMemo(() => {
    const q = editProductQuery.trim().toLowerCase();
    const all = products || [];
    if (!q) return all;
    return all.filter((p: any) => {
      const text = [p.id, p.nameEn, p.nameNe, p.category, p.unit, String(p.sellingPrice), String(p.stock)].join(' ').toLowerCase();
      return text.includes(q);
    });
  }, [products, editProductQuery]);

  const addEditProduct = (prod: any, qty = editQuickQty) => {
    if (!prod) return;
    const addQty = Math.max(1, Number(qty) || 1);
    const name = prod.nameEn || prod.nameNe || prod.id;
    const rate = Number(prod.sellingPrice || 0);
    const unit = prod.unit || '';

    setEditSaleForm((prev) => {
      const foundIndex = prev.items.findIndex((item) => item.productId === prod.id);
      if (foundIndex >= 0) {
        return {
          ...prev,
          items: prev.items.map((item, idx) => idx === foundIndex
            ? { ...item, qty: Number(item.qty || 0) + addQty, total: rate * (Number(item.qty || 0) + addQty) }
            : item),
        };
      }

      return {
        ...prev,
        items: [...prev.items, { productId: prod.id, name, rate, qty: addQty, unit, total: rate * addQty }],
      };
    });

    setEditProductQuery('');
  };

  const getPartyLedger = (party: Party): LedgerRow[] => {
    const rows: LedgerRow[] = [];

    if (party.openingBalance && party.openingBalance !== 0) {
      rows.push({ date: party.createdAt, ref: 'OB', desc: t('प्रारम्भिक मौज्दात', 'Opening Balance'), debit: 0, credit: party.openingBalance, balance: party.openingBalance, type: 'opening', sourceType: 'opening' });
    }

    if (party.type === 'customer') {
      const partySales: SaleRecord[] = (sales || []).filter((s: SaleRecord) => s.customerId === party.id || s.customerLoginId === party.id || ((s.customerName) || (s as any).full_name) === party.name);
      partySales.forEach(s => {
        rows.push({ date: saleDate(s), ref: saleRef(s), desc: `${t('बिक्री', 'Sale')} — ${ (s.items || []).map((i:any) => (i.name || (i as any).productName)).join(', ') }`, debit: saleAmount(s), credit: saleAmountPaid(s), balance: saleAmountDue(s), type: 'sale', sourceType: 'sale', sourceId: saleRef(s), partyName: saleCustomerName(s) || party.name });
      });
    } else {
      const partyPurchases: FarmerPurchase[] = (purchases || []).filter((p: FarmerPurchase) => p.partyId === party.id || ((p.farmerName) || (p as any).supplierName) === party.name);
      partyPurchases.forEach(p => {
        rows.push({ date: purchaseDate(p), ref: purchaseRef(p), desc: `${t('खरिद', 'Purchase')} — ${p.productName || (p as any).product_name || ''}`, debit: purchaseTotal(p), credit: 0, balance: purchaseTotal(p), type: 'purchase', sourceType: 'purchase', sourceId: purchaseRef(p), partyName: purchasePartyName(p) });
      });
    }

    const partyPayments = payments.filter(p => p.partyId === party.id);
    partyPayments.forEach(p => {
      rows.push({ date: p.date, ref: p.receiptNo || p.referenceId || p.id, desc: `${p.type === 'in' ? t('भुक्तानी प्राप्त', 'Payment Received') : t('भुक्तानी दिइयो', 'Payment Made')} — ${p.mode}${p.note ? ' · ' + p.note : ''}`, debit: p.type === 'out' ? p.amount : 0, credit: p.type === 'in' ? p.amount : 0, balance: 0, type: p.type === 'in' ? 'payment-in' : 'payment-out', sourceType: 'payment', sourceId: p.id, partyName: p.partyName });
    });

    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Running balance
    let running = 0;
    rows.forEach(r => {
      if (r.type === 'opening') { running = r.credit; r.balance = running; return; }
      if (party.type === 'customer') {
        running += (r.debit - r.credit);
      } else {
        running += (r.debit - r.credit);
      }
      r.balance = running;
    });

    return rows;
  };

  const getPartySummary = (party: Party) => {
    const ledger = getPartyLedger(party);
    const totalDebit = ledger.reduce((s, r) => s + r.debit, 0);
    const totalCredit = ledger.reduce((s, r) => s + r.credit, 0);
    const balance = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;
    return { totalDebit, totalCredit, balance };
  };

  const handleSaveParty = () => {
    if (!partyForm.name.trim()) return;
    if (editingParty) {
      saveParties(parties.map(p => p.id === editingParty.id ? { ...p, ...partyForm } : p));
    } else {
      const newParty: Party = {
        id: `${activeTab === 'customer' ? 'C' : 'S'}-${Date.now().toString().slice(-4)}`,
        ...partyForm,
        type: activeTab,
        createdAt: new Date().toISOString().split('T')[0],
      };
      saveParties([...parties, newParty]);
    }
    setShowAddParty(false);
    setEditingParty(null);
    setPartyForm({ name: '', phone: '', email: '', address: '', panNo: '', openingBalance: 0, notes: '' });
  };

  const handlePayment = () => {
    if (!selectedParty || !payForm.amount) return;
    const amt = parseFloat(payForm.amount);
    if (isNaN(amt) || amt <= 0) return;
    const newPay: PaymentRecord = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      partyType: selectedParty.type,
      type: showPayment!,
      amount: amt,
      mode: payForm.mode,
      date: payForm.date,
      note: payForm.note,
    };
    savePayments([...payments, newPay]);
    setShowPayment(null);
    setPayForm({ amount: '', mode: 'Cash', note: '', date: new Date().toISOString().split('T')[0] });
  };

  const openEditRow = (row: LedgerRow) => {
    if (row.sourceType === 'sale') {
      const sale = (sales || []).find((s: SaleRecord) => s.id === row.sourceId);
      if (!sale) return;
      setEditTarget({ kind: 'sale', sale });
      setEditSaleForm({
        date: saleDate(sale).split(' ')[0],
        customerName: saleCustomerName(sale) || '',
        customerPhone: sale.customerPhone || sale.phone || '',
        paymentMode: (sale.paymentMode || sale.payment_mode || 'Cash'),
        discount: sale.discount || 0,
        taxPct: Math.round((Number(sale.tax || 0) / Math.max(1, Number(sale.subtotal || 0) - Number(sale.discount || 0))) * 100),
        amountPaid: String(saleAmountPaid(sale) ?? 0),
        amountDue: String(saleAmountDue(sale) ?? 0),
        note: sale.note || '',
        items: (sale.items || []).map((it: any) => ({ productId: it.productId, name: it.name || (it as any).productName, rate: Number(it.rate || 0), qty: Number(((it.qty ?? (it as any).qtyKg) || 0)), unit: it.unit, total: Number(it.total || 0) })),
      });
      setEditProductQuery('');
      setEditQuickQty(1);
      return;
    }
    if (row.sourceType === 'payment') {
      const payment = payments.find((p) => p.id === row.sourceId);
      if (!payment) return;
      setEditTarget({ kind: 'payment', payment });
      setEditPaymentForm({
        receiptNo: payment.receiptNo || payment.referenceId || payment.id,
        amount: String(payment.amount),
        mode: payment.mode || 'Cash',
        date: String(payment.date || '').split(' ')[0],
        note: payment.note || '',
        type: payment.type,
      });
    }
  };

  const saveEditedRow = () => {
    if (!editTarget) return;
    if (editTarget.kind === 'sale') {
      const prev = editTarget.sale;
      const items = editSaleForm.items.map((it) => ({
        productId: it.productId,
        name: it.name,
        rate: Number(it.rate || 0),
        qty: Number(it.qty || 0),
        unit: it.unit || '',
        total: Number(it.rate || 0) * Number(it.qty || 0),
      }));
      const subtotal = items.reduce((a, i) => a + i.total, 0);
      const discount = Number(editSaleForm.discount || 0);
      const afterDiscount = Math.max(0, subtotal - discount);
      const taxPct = Number(editSaleForm.taxPct || 0);
      const tax = Math.max(0, afterDiscount * (taxPct / 100));
      const total = afterDiscount + tax;
      const paid = Number(editSaleForm.amountPaid || 0);
      const due = Math.max(0, total - paid);
      const updatedSale: SaleRecord = {
        ...prev,
        date: editSaleForm.date || prev.date,
        customerName: editSaleForm.customerName || prev.customerName,
        customerPhone: editSaleForm.customerPhone || prev.customerPhone,
        paymentMode: editSaleForm.paymentMode,
        items,
        subtotal,
        discount,
        tax,
        total,
        amountPaid: paid,
        amountDue: due,
        note: editSaleForm.note,
      };
      const next = (sales || []).map((s: SaleRecord) => s.id === prev.id ? updatedSale : s);
      setSales(next);
      saveLS(LS.sales, next);
    } else if (editTarget.kind === 'payment') {
      const prev = editTarget.payment;
      const updatedPayment: PaymentRecord = {
        ...prev,
        receiptNo: editPaymentForm.receiptNo || prev.receiptNo || prev.referenceId || prev.id,
        amount: Number(editPaymentForm.amount || prev.amount),
        mode: editPaymentForm.mode,
        date: editPaymentForm.date || prev.date,
        note: editPaymentForm.note,
        type: editPaymentForm.type,
      };
      const next = payments.map(p => p.id === prev.id ? updatedPayment : p);
      savePayments(next);
    }
    setEditTarget(null);
  };

  const filteredLedger = useMemo(() => {
    if (!selectedParty) return [];
    let rows = getPartyLedger(selectedParty);
    if (dateFrom) rows = rows.filter(r => r.date >= dateFrom);
    if (dateTo) rows = rows.filter(r => r.date <= dateTo);
    return rows;
  }, [selectedParty, sales, purchases, payments, dateFrom, dateTo]);

  // ── Full-screen Party Detail ──
  if (selectedParty) {
    const summary = getPartySummary(selectedParty);
    const isOverdue = summary.balance > 0;

    return (
      <div className="party-fullscreen">
        {/* Header */}
        <div className="party-fs-header">
          <button className="party-back-btn" onClick={() => setSelectedParty(null)}>
            <i className="ri-arrow-left-line" /> {t('सूचीमा फर्कनुहोस्', 'Back to List')}
          </button>
          <div className="party-fs-identity">
            <div className="party-fs-avatar">{selectedParty.name[0]}</div>
            <div>
              <h1 className="party-fs-name">{selectedParty.name}</h1>
              <span className={`party-type-badge ${selectedParty.type}`}>
                {selectedParty.type === 'customer' ? t('ग्राहक', 'Customer') : t('सप्लायर', 'Supplier')}
              </span>
            </div>
          </div>
          <div className="party-fs-actions">
            <button className="party-action-btn edit" onClick={() => {
              setEditingParty(selectedParty);
              setPartyForm({ name: selectedParty.name, phone: selectedParty.phone || '', email: selectedParty.email || '', address: selectedParty.address || '', panNo: selectedParty.panNo || '', openingBalance: selectedParty.openingBalance || 0, notes: selectedParty.notes || '' });
              setShowAddParty(true);
            }}>
              <i className="ri-edit-line" /> {t('सम्पादन', 'Edit')}
            </button>
            <button className="party-action-btn pay-in" onClick={() => setShowPayment('in')}>
              <i className="ri-arrow-down-circle-line" /> {t('भुक्तानी प्राप्त', 'Payment In')}
            </button>
            <button className="party-action-btn pay-out" onClick={() => setShowPayment('out')}>
              <i className="ri-arrow-up-circle-line" /> {t('भुक्तानी दिनुहोस्', 'Payment Out')}
            </button>
            <button className="party-action-btn print" onClick={() => printPartyStatement(selectedParty)}>
              <i className="ri-printer-line" /> {t('प्रिन्ट', 'Print')}
            </button>
            <button className="party-action-btn" onClick={() => downloadPartyPDF(selectedParty)}>
              <i className="ri-download-line" /> {t('PDF', 'PDF')}
            </button>
          </div>
        </div>

        <div className="party-fs-body">
          {/* Left: Info + Summary */}
          <div className="party-fs-sidebar">
            <div className="party-info-card">
              <h3><i className="ri-contact-book-line" /> {t('सम्पर्क विवरण', 'Contact Info')}</h3>
              <div className="party-info-row"><i className="ri-phone-line" /><span>{selectedParty.phone || '-'}</span></div>
              <div className="party-info-row"><i className="ri-mail-line" /><span>{selectedParty.email || '-'}</span></div>
              <div className="party-info-row"><i className="ri-map-pin-line" /><span>{selectedParty.address || '-'}</span></div>
              {selectedParty.panNo && <div className="party-info-row"><i className="ri-file-text-line" /><span>PAN: {selectedParty.panNo}</span></div>}
              <div className="party-info-row"><i className="ri-calendar-line" /><span>{t('दर्ता मिति', 'Joined')}: {formatDate(selectedParty.createdAt)}</span></div>
            </div>

            <div className={`party-balance-card ${isOverdue ? 'overdue' : 'clear'}`}>
              <div className="balance-label">{t('बाँकी रकम', 'Outstanding Balance')}</div>
              <div className="balance-amount">{NRS(Math.abs(summary.balance))}</div>
              <div className="balance-status">
                {summary.balance > 0
                  ? <><i className="ri-alert-line" /> {t('बाँकी छ', 'Amount Due')}</>
                  : <><i className="ri-check-double-line" /> {t('भुक्तानी सम्पन्न', 'All Clear')}</>
                }
              </div>
            </div>

            <div className="party-stats-grid">
              <div className="party-stat">
                <span className="stat-label">{t('कुल कारोबार', 'Total Volume')}</span>
                <span className="stat-val">{NRS(summary.totalDebit)}</span>
              </div>
              <div className="party-stat">
                <span className="stat-label">{t('कुल भुक्तानी', 'Total Paid')}</span>
                <span className="stat-val green">{NRS(summary.totalCredit)}</span>
              </div>
            </div>

            {/* Date Filter */}
            <div className="party-date-filter">
              <h4><i className="ri-filter-line" /> {t('मिति अनुसार खोज्नुहोस्', 'Filter by Date')}</h4>
              <div className="date-filter-row">
                <label>{t('देखि', 'From')}</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="pos-form-input" />
              </div>
              <div className="date-filter-row">
                <label>{t('सम्म', 'To')}</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="pos-form-input" />
              </div>
              {(dateFrom || dateTo) && (
                <button className="pos-sec-btn" style={{ width: '100%', marginTop: 8 }} onClick={() => { setDateFrom(''); setDateTo(''); }}>
                  <i className="ri-close-line" /> {t('फिल्टर हटाउनुहोस्', 'Clear Filter')}
                </button>
              )}
            </div>
          </div>

          {/* Right: Ledger */}
          <div className="party-fs-ledger">
            <div className="ledger-header">
              <h2><i className="ri-book-read-line" /> {t('खाता विवरण / लेजर', 'Account Ledger')}</h2>
              <span className="ledger-count">{filteredLedger.length} {t('प्रविष्टिहरू', 'entries')}</span>
            </div>
            <div className="ledger-table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>{t('मिति', 'Date')}</th>
                    <th>{t('सन्दर्भ', 'Ref #')}</th>
                    <th>{t('विवरण', 'Description')}</th>
                    <th className="num">{t('डेबिट', 'Debit')}</th>
                    <th className="num">{t('क्रेडिट', 'Credit')}</th>
                    <th className="num">{t('बाँकी', 'Balance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.length === 0 ? (
                    <tr><td colSpan={6} className="empty-ledger"><i className="ri-inbox-line" /> {t('कुनै कारोबार भेटिएन', 'No transactions found')}</td></tr>
                  ) : filteredLedger.map((row, i) => (
                    <tr key={i} className={`ledger-row ledger-row--${row.type}`}>
                      <td>{formatDate(row.date)}</td>
                      <td>
                        <code>{row.ref}</code>
                        {row.partyName && <div className="ledger-mini-name">{row.partyName}</div>}
                      </td>
                      <td className="ledger-desc">{row.desc}</td>
                      <td className="num">{row.debit > 0 ? NRS(row.debit) : '-'}</td>
                      <td className="num green">{row.credit > 0 ? NRS(row.credit) : '-'}</td>
                      <td className={`num bold ${row.balance > 0 ? 'red' : 'green'}`}>
                        {NRS(Math.abs(row.balance))}
                        <div className="ledger-row-actions">
                          {row.sourceType === 'sale' && (
                            <button
                              type="button"
                              className="ledger-inline-btn"
                              onClick={() => {
                                const sale = (sales || []).find((s: SaleRecord) => s.id === row.sourceId);
                                if (sale) setReceiptData(sale);
                              }}
                            >
                              <i className="ri-eye-line" /> {t('Open', 'Open')}
                            </button>
                          )}
                          {row.sourceType === 'payment' && (
                            <button type="button" className="ledger-inline-btn" onClick={() => {
                              const p = (payments || []).find((pp: PaymentRecord) => pp.id === row.sourceId);
                              if (p) setViewPayment(p);
                            }}>
                              <i className="ri-eye-line" /> {t('Open', 'Open')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filteredLedger.length > 0 && (
                  <tfoot>
                    <tr className="ledger-totals">
                      <td colSpan={3}><strong>{t('जम्मा', 'Total')}</strong></td>
                      <td className="num"><strong>{NRS(filteredLedger.reduce((s, r) => s + r.debit, 0))}</strong></td>
                      <td className="num green"><strong>{NRS(filteredLedger.reduce((s, r) => s + r.credit, 0))}</strong></td>
                      <td className={`num bold ${filteredLedger[filteredLedger.length - 1]?.balance > 0 ? 'red' : 'green'}`}>
                        <strong>{NRS(Math.abs(filteredLedger[filteredLedger.length - 1]?.balance || 0))}</strong>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Edit Ledger Entry Modal */}
        {editTarget && (
          <div className="party-modal-overlay" onClick={() => setEditTarget(null)}>
            <div className="party-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  <i className="ri-edit-line" />
                  {editTarget.kind === 'sale' ? t('बिक्री सम्पादन', 'Edit Sale') : t('भुक्तानी सम्पादन', 'Edit Payment')}
                </h3>
                <button onClick={() => setEditTarget(null)} className="modal-close"><i className="ri-close-line" /></button>
              </div>

              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {editTarget.kind === 'sale' ? (
                  <>
                    <div className="pos-input-group" style={{ gridColumn: '1/-1' }}>
                      <label>{t('बिल नं', 'Invoice No')}</label>
                      <input type="text" className="pos-form-input" value={editTarget.sale.id} readOnly />
                    </div>
                    <div className="pos-input-group" style={{ gridColumn: '1/-1' }}>
                      <label>{t('मिति', 'Date')}</label>
                      <input type="date" className="pos-form-input" value={editSaleForm.date} onChange={e => setEditSaleForm({ ...editSaleForm, date: e.target.value })} />
                    </div>
                    <div className="pos-input-group"><label>{t('ग्राहक नाम', 'Customer Name')}</label><input className="pos-form-input" value={editSaleForm.customerName} onChange={e => setEditSaleForm({ ...editSaleForm, customerName: e.target.value })} /></div>
                    <div className="pos-input-group"><label>{t('मोबाइल', 'Phone')}</label><input className="pos-form-input" value={editSaleForm.customerPhone} onChange={e => setEditSaleForm({ ...editSaleForm, customerPhone: e.target.value })} /></div>
                    <div className="pos-input-group" style={{ gridColumn: '1/-1' }}>
                      <label>{t('Product add from product list', 'Product add from product list')}</label>
                      <div className="product-picker-card">
                        <div className="product-picker-top">
                          <input
                            type="search"
                            className="pos-form-input product-picker-search"
                            placeholder={t('Search product by name, code, category...', 'Search product by name, code, category...')}
                            value={editProductQuery}
                            onChange={e => setEditProductQuery(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const first = filteredEditProducts[0];
                                if (first) addEditProduct(first);
                              }
                            }}
                          />
                          <div className="product-picker-quickqty">
                            <label>{t('Qty', 'Qty')}</label>
                            <input
                              type="number"
                              min={1}
                              className="pos-form-input product-picker-qty"
                              value={editQuickQty}
                              onChange={e => setEditQuickQty(Math.max(1, Number(e.target.value || 1)))}
                            />
                          </div>
                        </div>
                        <div className="product-picker-hint">
                          <span>{t('Tap any product card to add it instantly. Press Enter to add the first match.', 'Tap any product card to add it instantly. Press Enter to add the first match.')}</span>
                        </div>
                        <div className="product-picker-grid">
                          {filteredEditProducts.length === 0 ? (
                            <div className="product-picker-empty">
                              <i className="ri-inbox-line" />
                              <span>{t('No products found', 'No products found')}</span>
                            </div>
                          ) : filteredEditProducts.map((p: any) => {
                            const inInvoice = editSaleForm.items.find((item) => item.productId === p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                className={`product-picker-item ${inInvoice ? 'picked' : ''}`}
                                onClick={() => addEditProduct(p)}
                              >
                                <div className="product-picker-item-top">
                                  <span className="product-picker-emoji">{p.emoji || '📦'}</span>
                                  <span className="product-picker-stock">{p.stock} {p.unit}</span>
                                </div>
                                <strong>{p.nameEn || p.nameNe}</strong>
                                <span className="product-picker-sub">{p.category} · {p.id}</span>
                                <span className="product-picker-price">NRS {Number(p.sellingPrice || 0).toLocaleString()} / {p.unit}</span>
                                <span className="product-picker-add">
                                  <i className="ri-add-circle-line" /> {inInvoice ? t('Add more', 'Add more') : t('Add to bill', 'Add to bill')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pos-input-group" style={{ gridColumn: '1/-1' }}>
                      <label>{t('आइटमहरू', 'Items')}</label>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="ledger-table" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th>{t('SN', 'SN')}</th>
                              <th>{t('Product', 'Product')}</th>
                              <th className="num">{t('Rate', 'Rate')}</th>
                              <th className="num">{t('Qty', 'Qty')}</th>
                              <th className="num">{t('Amount', 'Amount')}</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {editSaleForm.items.length === 0 ? (
                              <tr><td colSpan={6} className="empty-ledger">{t('कुनै सामान छैन', 'No items yet')}</td></tr>
                            ) : editSaleForm.items.map((item, idx) => (
                              <tr key={`${item.productId}-${idx}`}>
                                <td>{idx + 1}</td>
                                <td>
                                  <input className="pos-form-input" value={item.name} onChange={e => {
                                    const name = e.target.value;
                                    setEditSaleForm(prev => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, name, total: Number(it.rate || 0) * Number(it.qty || 0) } : it) }));
                                  }} />
                                </td>
                                <td className="num"><input type="number" className="pos-form-input" value={item.rate} onChange={e => {
                                  const rate = Number(e.target.value || 0);
                                  setEditSaleForm(prev => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, rate, total: rate * Number(it.qty || 0) } : it) }));
                                }} /></td>
                                <td className="num"><input type="number" className="pos-form-input" value={item.qty} onChange={e => {
                                  const qty = Number(e.target.value || 0);
                                  setEditSaleForm(prev => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, qty, total: Number(it.rate || 0) * qty } : it) }));
                                }} /></td>
                                <td className="num">{NRS(item.total)}</td>
                                <td><button type="button" className="ledger-inline-btn" onClick={() => setEditSaleForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}><i className="ri-delete-bin-line" /> {t('Remove', 'Remove')}</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="pos-input-group"><label>{t('छुट', 'Discount')}</label><input type="number" className="pos-form-input" value={editSaleForm.discount} onChange={e => setEditSaleForm({ ...editSaleForm, discount: Number(e.target.value || 0) })} /></div>
                    <div className="pos-input-group">
                      <label>{t('VAT / Tax (%)', 'VAT / Tax (%)')}</label>
                      <input type="number" className="pos-form-input" value={editSaleForm.taxPct} onChange={e => setEditSaleForm({ ...editSaleForm, taxPct: Number(e.target.value || 0) })} />
                      <small style={{ color: 'var(--pos-text-muted)' }}>
                        {t('Tax amount', 'Tax amount')}: {NRS(Math.max(0, Math.max(0, editSaleForm.items.reduce((a, i) => a + i.total, 0) - Number(editSaleForm.discount || 0)) * (Number(editSaleForm.taxPct || 0) / 100)))}
                      </small>
                    </div>
                    <div className="pos-input-group"><label>{t('कुल amount', 'Total Amount')}</label><input className="pos-form-input" value={NRS(Math.max(0, editSaleForm.items.reduce((a, i) => a + i.total, 0) - Number(editSaleForm.discount || 0) + Math.max(0, Math.max(0, editSaleForm.items.reduce((a, i) => a + i.total, 0) - Number(editSaleForm.discount || 0)) * (Number(editSaleForm.taxPct || 0) / 100))))} readOnly /></div>
                    <div className="pos-input-group"><label>{t('प्राप्त रकम', 'Received Amount')}</label><input type="number" className="pos-form-input" value={editSaleForm.amountPaid} onChange={e => setEditSaleForm({ ...editSaleForm, amountPaid: e.target.value })} /></div>
                    <div className="pos-input-group"><label>{t('Balance due', 'Balance Due')}</label><input className="pos-form-input" value={NRS(Math.max(0, (editSaleForm.items.reduce((a, i) => a + i.total, 0) - Number(editSaleForm.discount || 0) + Math.max(0, Math.max(0, editSaleForm.items.reduce((a, i) => a + i.total, 0) - Number(editSaleForm.discount || 0)) * (Number(editSaleForm.taxPct || 0) / 100))) - Number(editSaleForm.amountPaid || 0)))} readOnly /></div>
                    <div className="pos-input-group"><label>{t('भुक्तानी माध्यम', 'Payment Mode')}</label><input className="pos-form-input" value={editSaleForm.paymentMode} onChange={e => setEditSaleForm({ ...editSaleForm, paymentMode: e.target.value })} /></div>
                    <div className="pos-input-group"><label>{t('Notes or remarks', 'Notes or remarks')}</label><input className="pos-form-input" value={editSaleForm.note} onChange={e => setEditSaleForm({ ...editSaleForm, note: e.target.value })} /></div>
                  </>
                ) : (
                  <>
                    <div className="pos-input-group" style={{ gridColumn: '1/-1' }}>
                      <label>{t('Recept Number', 'Receipt Number')}</label>
                      <input className="pos-form-input" value={editPaymentForm.receiptNo} onChange={e => setEditPaymentForm({ ...editPaymentForm, receiptNo: e.target.value })} />
                    </div>
                    <div className="pos-input-group" style={{ gridColumn: '1/-1' }}>
                      <label>{t('मिति', 'Date')}</label>
                      <input type="date" className="pos-form-input" value={editPaymentForm.date} onChange={e => setEditPaymentForm({ ...editPaymentForm, date: e.target.value })} />
                    </div>
                    <div className="pos-input-group"><label>{t('Amount Received', 'Amount Received')}</label><input type="number" className="pos-form-input" value={editPaymentForm.amount} onChange={e => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })} /></div>
                    <div className="pos-input-group"><label>{t('Payment In / Out', 'Payment In / Out')}</label><select className="pos-form-select" value={editPaymentForm.type} onChange={e => setEditPaymentForm({ ...editPaymentForm, type: e.target.value as 'in' | 'out' })}><option value="in">Payment In</option><option value="out">Payment Out</option></select></div>
                    <div className="pos-input-group" style={{ gridColumn: '1/-1' }}><label>{t('Notes or Remarks', 'Notes or Remarks')}</label><input className="pos-form-input" value={editPaymentForm.note} onChange={e => setEditPaymentForm({ ...editPaymentForm, note: e.target.value })} /></div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button className="pos-sec-btn" onClick={() => setEditTarget(null)}>{t('रद्द', 'Cancel')}</button>
                <button className="pos-form-submit" onClick={saveEditedRow}>{t('Update', 'Update')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Payment View Modal (open-only, allows Edit inside) */}
        {viewPayment && (
          <div className="party-modal-overlay" onClick={() => setViewPayment(null)}>
            <div className="party-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><i className="ri-eye-line" /> {t('भुक्तानी विवरण', 'Payment Details')}</h3>
                <button onClick={() => setViewPayment(null)} className="modal-close"><i className="ri-close-line" /></button>
              </div>
              <div className="modal-body">
                <div className="pos-input-group"><label>{t('Receipt No', 'Receipt No')}</label><div className="pos-form-input" style={{ padding: 8 }}>{viewPayment.receiptNo || viewPayment.id}</div></div>
                <div className="pos-input-group"><label>{t('Date', 'Date')}</label><div className="pos-form-input" style={{ padding: 8 }}>{viewPayment.date}</div></div>
                <div className="pos-input-group"><label>{t('Amount', 'Amount')}</label><div className="pos-form-input" style={{ padding: 8 }}>{NRS(viewPayment.amount)}</div></div>
                <div className="pos-input-group"><label>{t('Type', 'Type')}</label><div className="pos-form-input" style={{ padding: 8 }}>{viewPayment.type}</div></div>
                <div className="pos-input-group"><label>{t('Note', 'Note')}</label><div className="pos-form-input" style={{ padding: 8 }}>{viewPayment.note}</div></div>
              </div>
              <div className="modal-footer">
                <button className="pos-sec-btn" onClick={() => setViewPayment(null)}>{t('बन्द', 'Close')}</button>
                <button className="pos-form-submit" onClick={() => {
                  // Use openEditRow so editPaymentForm is populated consistently
                  openEditRow({
                    date: viewPayment.date || '',
                    ref: viewPayment.receiptNo || viewPayment.referenceId || viewPayment.id,
                    desc: viewPayment.note || '',
                    debit: 0,
                    credit: Number(viewPayment.amount) || 0,
                    balance: 0,
                    type: 'payment-in',
                    sourceType: 'payment',
                    sourceId: viewPayment.id,
                  });
                  setViewPayment(null);
                }}>{t('सम्पादन गर्नुहोस्', 'Edit')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPayment && (
          <div className="party-modal-overlay" onClick={() => setShowPayment(null)}>
            <div className="party-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {showPayment === 'in'
                    ? <><i className="ri-arrow-down-circle-line" style={{ color: 'var(--pos-success)' }} /> {t('भुक्तानी प्राप्त गर्नुहोस्', 'Record Payment In')}</>
                    : <><i className="ri-arrow-up-circle-line" style={{ color: 'var(--pos-danger)' }} /> {t('भुक्तानी दिनुहोस्', 'Record Payment Out')}</>
                  }
                </h3>
                <button onClick={() => setShowPayment(null)} className="modal-close"><i className="ri-close-line" /></button>
              </div>
              <div className="modal-body">
                <div className="pos-input-group">
                  <label>{t('रकम (रू)', 'Amount (NRS)')}</label>
                  <input type="number" className="pos-form-input" placeholder="0.00" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} autoFocus />
                </div>
                <div className="pos-input-group">
                  <label>{t('भुक्तानी माध्यम', 'Payment Mode')}</label>
                  <select className="pos-form-select" value={payForm.mode} onChange={e => setPayForm({ ...payForm, mode: e.target.value })}>
                    <option>Cash</option><option>Bank Transfer</option><option>E-Sewa</option><option>Khalti</option><option>Cheque</option>
                  </select>
                </div>
                <div className="pos-input-group">
                  <label>{t('मिति', 'Date')}</label>
                  <input type="date" className="pos-form-input" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} />
                </div>
                <div className="pos-input-group">
                  <label>{t('टिप्पणी', 'Note (optional)')}</label>
                  <input type="text" className="pos-form-input" placeholder={t('कुनै नोट...', 'Any note...')} value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="pos-sec-btn" onClick={() => setShowPayment(null)}>{t('रद्द', 'Cancel')}</button>
                <button className={`pos-form-submit ${showPayment === 'in' ? 'green' : 'red'}`} onClick={handlePayment}>
                  <i className={`ri-${showPayment === 'in' ? 'arrow-down' : 'arrow-up'}-circle-line`} />
                  {showPayment === 'in' ? t('भुक्तानी प्राप्त', 'Save Payment In') : t('भुक्तानी दिइयो', 'Save Payment Out')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Party Modal */}
        {showAddParty && editingParty && (
          <div className="party-modal-overlay" onClick={() => { setShowAddParty(false); setEditingParty(null); }}>
            <div className="party-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><i className="ri-edit-line" /> {t('पार्टी सम्पादन', 'Edit Party')}</h3>
                <button onClick={() => { setShowAddParty(false); setEditingParty(null); }} className="modal-close"><i className="ri-close-line" /></button>
              </div>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="pos-input-group" style={{ gridColumn: '1/-1' }}>
                  <label>{t('पुरा नाम', 'Full Name')} *</label>
                  <input className="pos-form-input" value={partyForm.name} onChange={e => setPartyForm({ ...partyForm, name: e.target.value })} />
                </div>
                <div className="pos-input-group"><label>{t('फोन', 'Phone')}</label><input className="pos-form-input" value={partyForm.phone} onChange={e => setPartyForm({ ...partyForm, phone: e.target.value })} /></div>
                <div className="pos-input-group"><label>{t('इमेल', 'Email')}</label><input className="pos-form-input" value={partyForm.email} onChange={e => setPartyForm({ ...partyForm, email: e.target.value })} /></div>
                <div className="pos-input-group" style={{ gridColumn: '1/-1' }}><label>{t('ठेगाना', 'Address')}</label><input className="pos-form-input" value={partyForm.address} onChange={e => setPartyForm({ ...partyForm, address: e.target.value })} /></div>
                <div className="pos-input-group"><label>PAN No.</label><input className="pos-form-input" value={partyForm.panNo} onChange={e => setPartyForm({ ...partyForm, panNo: e.target.value })} /></div>
                <div className="pos-input-group"><label>{t('प्रारम्भिक मौज्दात', 'Opening Balance')}</label><input type="number" className="pos-form-input" value={partyForm.openingBalance} onChange={e => setPartyForm({ ...partyForm, openingBalance: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div className="modal-footer">
                <button className="pos-sec-btn" onClick={() => { setShowAddParty(false); setEditingParty(null); }}>{t('रद्द', 'Cancel')}</button>
                <button className="pos-form-submit" onClick={handleSaveParty}>{t('सुरक्षित गर्नुहोस्', 'Save Changes')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Party List View ──
  return (
    <div className="parties-container">
      <div className="parties-toolbar">
        <div className="party-type-tabs">
          <button className={`party-tab ${activeTab === 'customer' ? 'active' : ''}`} onClick={() => setActiveTab('customer')}>
            <i className="ri-user-heart-line" /> {t('ग्राहकहरू', 'Customers')}
            <span className="tab-count">{parties.filter(p => p.type === 'customer').length}</span>
          </button>
          <button className={`party-tab ${activeTab === 'supplier' ? 'active' : ''}`} onClick={() => setActiveTab('supplier')}>
            <i className="ri-truck-line" /> {t('सप्लायरहरू', 'Suppliers')}
            <span className="tab-count">{parties.filter(p => p.type === 'supplier').length}</span>
          </button>
        </div>
        <div className="parties-search-wrap">
          <i className="ri-search-line" />
          <input type="text" placeholder={t('नाम, फोन वा ठेगानाद्वारा खोज्नुहोस्...', 'Search by name, phone or address...')} value={search} onChange={e => setSearch(e.target.value)} className="parties-search" />
        </div>
        <button className="pos-primary-btn" onClick={() => { setEditingParty(null); setPartyForm({ name: '', phone: '', email: '', address: '', panNo: '', openingBalance: 0, notes: '' }); setShowAddParty(true); }}>
          <i className="ri-user-add-line" /> {t('नयाँ थप्नुहोस्', 'Add New')}
        </button>
      </div>

      {filteredParties.length === 0 ? (
        <div className="parties-empty">
          <i className={activeTab === 'customer' ? 'ri-user-heart-line' : 'ri-truck-line'} />
          <p>{t('कुनै पार्टी भेटिएन', 'No parties found')}</p>
          <button className="pos-primary-btn" onClick={() => setShowAddParty(true)}>
            <i className="ri-add-line" /> {t('पहिलो थप्नुहोस्', 'Add First One')}
          </button>
        </div>
      ) : (
        <div className="parties-grid">
          {filteredParties.map(party => {
            const summary = getPartySummary(party);
            return (
              <div key={party.id} className={`party-card ${summary.balance > 0 ? 'has-due' : ''}`} onClick={() => setSelectedParty(party)}>
                <div className="party-card-top">
                  <div className="party-avatar-lg">{party.name[0]}</div>
                  <div className="party-card-info">
                    <strong className="party-card-name">{party.name}</strong>
                    {party.phone && <span className="party-card-phone"><i className="ri-phone-line" /> {party.phone}</span>}
                    {party.address && <span className="party-card-addr"><i className="ri-map-pin-2-line" /> {party.address}</span>}
                  </div>
                </div>
                <div className="party-card-bottom">
                  <div className="party-card-stat">
                    <span className="pcs-label">{t('कुल कारोबार', 'Volume')}</span>
                    <span className="pcs-val">{NRS(summary.totalDebit)}</span>
                  </div>
                  <div className={`party-card-stat ${summary.balance > 0 ? 'due' : 'paid'}`}>
                    <span className="pcs-label">{summary.balance > 0 ? t('बाँकी', 'Due') : t('क्लियर', 'Clear')}</span>
                    <span className="pcs-val">{NRS(Math.abs(summary.balance))}</span>
                  </div>
                </div>
                <div className="party-card-cta"><i className="ri-arrow-right-line" /></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Party Modal */}
      {showAddParty && !editingParty && (
        <div className="party-modal-overlay" onClick={() => setShowAddParty(false)}>
          <div className="party-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="ri-user-add-line" /> {t('नयाँ पार्टी थप्नुहोस्', 'Add New Party')} — {activeTab === 'customer' ? t('ग्राहक', 'Customer') : t('सप्लायर', 'Supplier')}</h3>
              <button onClick={() => setShowAddParty(false)} className="modal-close"><i className="ri-close-line" /></button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="pos-input-group" style={{ gridColumn: '1/-1' }}>
                <label>{t('पुरा नाम', 'Full Name')} *</label>
                <input className="pos-form-input" value={partyForm.name} onChange={e => setPartyForm({ ...partyForm, name: e.target.value })} autoFocus />
              </div>
              <div className="pos-input-group"><label>{t('फोन', 'Phone')}</label><input className="pos-form-input" value={partyForm.phone} onChange={e => setPartyForm({ ...partyForm, phone: e.target.value })} /></div>
              <div className="pos-input-group"><label>{t('इमेल', 'Email')}</label><input className="pos-form-input" value={partyForm.email} onChange={e => setPartyForm({ ...partyForm, email: e.target.value })} /></div>
              <div className="pos-input-group" style={{ gridColumn: '1/-1' }}><label>{t('ठेगाना', 'Address')}</label><input className="pos-form-input" value={partyForm.address} onChange={e => setPartyForm({ ...partyForm, address: e.target.value })} /></div>
              <div className="pos-input-group"><label>PAN No.</label><input className="pos-form-input" value={partyForm.panNo} onChange={e => setPartyForm({ ...partyForm, panNo: e.target.value })} /></div>
              <div className="pos-input-group"><label>{t('प्रारम्भिक मौज्दात', 'Opening Balance (रू)')}</label><input type="number" className="pos-form-input" value={partyForm.openingBalance || ''} onChange={e => setPartyForm({ ...partyForm, openingBalance: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="modal-footer">
              <button className="pos-sec-btn" onClick={() => setShowAddParty(false)}>{t('रद्द', 'Cancel')}</button>
              <button className="pos-form-submit" onClick={handleSaveParty}>{t('थप्नुहोस्', 'Add Party')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
