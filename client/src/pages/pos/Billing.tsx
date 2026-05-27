// ─── POS Page: Billing Terminal — Product Grid → Cart → Checkout → Receipt ─────
import React, { useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { usePOS } from './POSContext';
import { normalizeProduct } from './posTypes';
import ImageUpload from '../../components/ImageUpload';
import type { InvoiceStatus } from '../../components/InvoiceModern';
const InvoiceModern = React.lazy(() => import('../../components/InvoiceModern'));

const DEFAULT_QR_IMAGE_URL = '/api/qr-image';
const DEFAULT_COMPANY_NAME = 'Dhakal Traders and Suppliers';
const DEFAULT_COMPANY_ADDRESS = 'Bagchaur 9 Salyan';
const DEFAULT_COMPANY_PAN = '';

const PAYMENT_MODES = [
  { id: 'Cash',    labelNe: 'नगद',   labelEn: 'Cash',   icon: 'ri-money-dollar-box-line' },
  { id: 'Card',    labelNe: 'कार्ड', labelEn: 'Card',   icon: 'ri-bank-card-line' },
  { id: 'E-Sewa',  labelNe: 'ई-सेवा',labelEn: 'E-Sewa', icon: 'ri-smartphone-line' },
  { id: 'Khalti',  labelNe: 'खल्ती', labelEn: 'Khalti', icon: 'ri-wallet-3-line' },
  { id: 'QR',      labelNe: 'क्यूआर', labelEn: 'QR',     icon: 'ri-qr-code-line' },
  { id: 'Credit',  labelNe: 'उधारो', labelEn: 'Credit', icon: 'ri-booklet-line' },
];

const CATS = ['All Items', 'herbs', 'grains', 'daily', 'supplies'];

export default function BillingPage() {
  const {
    products, setProducts,
    cart, setCart,
    sales, setSales,
    cashier,
    setReceiptData,
    apiCall,
    customers,
    t,
  } = usePOS();
  const [printFormat, setPrintFormat] = React.useState<'thermal58'|'thermal80'|'A4'|'A5'>('thermal80');
  const [selectedFormat, setSelectedFormat] = React.useState<null|'thermal58'|'thermal80'|'A4'|'A5'>(null);
  const [showThermalWidths, setShowThermalWidths] = React.useState(false);
  const [nepaliDate, setNepaliDate] = React.useState<string>('');
  const [pendingNepaliDate, setPendingNepaliDate] = React.useState<string>('');

  async function printReceipt(format: 'thermal58'|'thermal80'|'A4'|'A5') {
    try {
      const receiptEl = document.querySelector('.bill-receipt');
      if (!receiptEl) { alert(t('रसिद फेला परेन।', 'Receipt not found.')); return; }
      const html = receiptEl.outerHTML;
      let pageSize = '80mm auto';
      if (format === 'thermal58') pageSize = '58mm auto';
      if (format === 'thermal80') pageSize = '80mm auto';
      if (format === 'A4') pageSize = 'A4 portrait';
      if (format === 'A5') pageSize = 'A5 portrait';

      // Build format-specific print styles — thermal slip style with compact rows and tight spacing
      let baseStyles = `
        @page { size: ${pageSize}; margin: 6mm; }
        html, body { margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; color: #000; background: #fff; -webkit-print-color-adjust: exact; }
        .bill-receipt { background: #fff; color: #000; box-sizing: border-box; margin: 0 auto; }
        .bill-receipt, .bill-receipt * { color: #000 !important; }
        .bill-receipt { font-size: 10px; line-height: 1.2; }
        .receipt-header { text-align: center; margin-bottom: 2px; }
        .receipt-header h2 { margin: 0; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; font-size: 12px; }
        .receipt-header p { margin: 0; font-size: 10px; line-height: 1.15; }
        .receipt-title { text-align: center; font-size: 11px; font-weight: 700; margin: 2px 0 4px; letter-spacing: .4px; }
        .receipt-meta { text-align: center; font-size: 10px; margin: 3px 0; }
        .receipt-top-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 4px 0; }
        .receipt-top-col { display: flex; flex-direction: column; gap: 1px; }
        .receipt-top-row { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; line-height: 1.2; }
        .receipt-top-col--right { padding-left: 6px; }
        .receipt-summary-box--bill { border: 1px solid #000; padding: 4px 6px; margin: 6px 0 4px; }
        .receipt-summary-row { font-size: 10px; padding: 0; }
        .receipt-note { font-size: 10px; }
        .receipt-items { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 2px; }
        .receipt-items--bill { margin-top: 2px; }
        .receipt-items th, .receipt-items td { padding: 2px 1px; vertical-align: top; }
        .receipt-items th { border-bottom: 1px solid #000; font-size: 10px; font-weight: 700; }
        .receipt-items th:nth-child(1), .receipt-items td:nth-child(1) { text-align: left; width: 10%; }
        .receipt-items th:nth-child(2), .receipt-items td:nth-child(2) { width: 43%; }
        .receipt-items th:nth-child(3), .receipt-items td:nth-child(3) { text-align: center; width: 15%; }
        .receipt-items th:nth-child(4), .receipt-items td:nth-child(4) { text-align: right; width: 16%; }
        .receipt-items th:nth-child(5), .receipt-items td:nth-child(5) { text-align: right; width: 16%; }
        .receipt-divider { width: 100%; border-top: 1px dashed #000; margin: 4px 0; color: #000 !important; }
        .receipt-footer { text-align: center; font-size: 10px; margin-top: 5px; }
        .in-words { font-size: 10px; margin-top: 4px; }
        .receipt-actions, .pos-modal-actions, .bill-float-btn { display: none !important; }
      `;

      let formatStyles = '';
      if (format === 'thermal58' || format === 'thermal80') {
        const width = format === 'thermal58' ? '58mm' : '80mm';
        formatStyles = `
          .bill-receipt { max-width: ${width} !important; width: ${width} !important; padding: 5px !important; font-size: 10px !important; }
          .receipt-header h2 { font-size: 12px !important; }
          .receipt-title { font-size: 10px !important; }
          .receipt-top-grid { gap: 6px !important; }
          .receipt-top-row { font-size: 9px !important; }
          .receipt-summary-box--bill { padding: 3px 5px !important; }
          .receipt-items th, .receipt-items td { font-size: 10px !important; }
          .rt-total { font-size: 12px !important; }
          .receipt-items th:nth-child(1), .receipt-items td:nth-child(1) { width: 50%; }
          .receipt-items th:nth-child(2), .receipt-items td:nth-child(2) { width: 15%; }
          .receipt-items th:nth-child(3), .receipt-items td:nth-child(3) { width: 15%; }
          .receipt-items th:nth-child(4), .receipt-items td:nth-child(4) { width: 20%; text-align: right; }
        `;
      } else if (format === 'A5') {
        formatStyles = `
          .bill-receipt { max-width: 148mm !important; width: 148mm !important; padding: 8px !important; font-size: 11px !important; }
          .receipt-top-row { font-size: 11px !important; }
          .receipt-items th, .receipt-items td { font-size: 11px !important; }
          .rt-total { font-size: 14px !important; }
        `;
      } else { // A4
        formatStyles = `
          .bill-receipt { max-width: 210mm !important; width: 180mm !important; padding: 10px !important; font-size: 12px !important; }
          .receipt-top-row { font-size: 12px !important; }
          .receipt-items th, .receipt-items td { font-size: 12px !important; }
          .rt-total { font-size: 16px !important; }
        `;
      }

      const styles = `<style>${baseStyles}\n${formatStyles}</style>`;

      const win = window.open('', '_blank', 'noopener,noreferrer');
      if (win) {
        win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title>${styles}</head><body>${html}</body></html>`);
        win.document.close();

        const printWhenReady = async () => {
          try {
            const doc = win.document;
            if (doc && (doc as any).fonts?.ready) await (doc as any).fonts.ready;
            await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            win.focus();
            win.print();
            win.onafterprint = () => { try { setTimeout(() => win.close(), 200); } catch {} };
          } catch (e) {
            console.error('popup print error', e);
          }
        };

        await printWhenReady();
        return;
      }

      // Fallback: use hidden iframe to print when popups are blocked
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
      const idoc = iframe.contentWindow?.document;
      if (!idoc) {
        alert(t('प्रिन्ट समर्थन उपलब्ध भएन। ब्राउजर सेटिङ्हरु जाँच गर्नुहोस्।', 'Print not supported — check browser settings.'));
        iframe.remove();
        return;
      }
      idoc.open();
      idoc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title>${styles}</head><body>${html}</body></html>`);
      idoc.close();
      // Wait for content to render, then call print
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('iframe print error', e);
          alert(t('प्रिन्ट गर्दा समस्या आयो।', 'Error printing receipt.'));
        } finally {
          setTimeout(() => iframe.remove(), 500);
        }
      }, 300);
    } catch (err) {
      console.error('print error', err);
      alert(t('प्रिन्ट गर्ने क्रममा त्रुटि आयो।', 'Error while printing.'));
    }
  }

  // small helper to convert number to words (English, for receipts)
  function numberToWords(num: number): string {
    const a = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
    const b = ["","", "twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
    if (num < 20) return a[num] || '';
    if (num < 100) return b[Math.floor(num/10)] + (num%10===0?"":" "+a[num%10]);
    if (num < 1000) return a[Math.floor(num/100)] + " hundred" + (num%100===0?"":" and "+numberToWords(num%100));
    if (num < 1000000) return numberToWords(Math.floor(num/1000)) + " thousand" + (num%1000===0?"":" "+numberToWords(num%1000));
    return String(num);
  }

  function formatMiti(dateStr: string) {
    try { const d = new Date(dateStr); return d.toLocaleDateString('ne-NP', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return dateStr; }
  }

  async function loadScript(src: string) {
    return new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
  }

  async function downloadReceipt(format: 'thermal58'|'thermal80'|'A4'|'A5') {
    const receiptEl = document.querySelector('.bill-receipt') as HTMLElement | null;
    if (!receiptEl) { alert(t('रसिद फेला परेन।', 'Receipt not found.')); return; }
    try {
      // Load libraries from CDN if needed
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

      // @ts-ignore
      const html2canvas = (window as any).html2canvas;
      // Try multiple possible globals for jspdf (UMD exposes window.jspdf or window.jspdf.jsPDF)
      // @ts-ignore
      let jsPDF: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w: any = window as any;
      if (w.jspdf && typeof w.jspdf.jsPDF === 'function') jsPDF = w.jspdf.jsPDF;
      else if (typeof w.jsPDF === 'function') jsPDF = w.jsPDF;
      else if (w.jspdf && typeof w.jspdf === 'function') jsPDF = w.jspdf;

      if (!html2canvas || !jsPDF) { alert(t('PDF पुस्तकालय लोड गरिएन।', 'PDF libraries failed to load.')); return; }

      const canvas = await html2canvas(receiptEl, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');

      if (format === 'thermal58' || format === 'thermal80') {
        const mmPerPx = 25.4 / 96; // assume 96dpi
        const pdfWidth = format === 'thermal58' ? 58 : 80; // mm
        const pdfHeight = Math.ceil(canvas.height * mmPerPx);
        const pdf = new jsPDF({ unit: 'mm', format: [pdfWidth, pdfHeight] });
        // add a small margin to avoid clipping
        const margin = 1; // mm
        pdf.addImage(imgData, 'PNG', margin, margin, pdfWidth - margin * 2, pdfHeight - margin * 2);
        pdf.save(`${completedSale?.id || 'receipt'}-thermal-${pdfWidth}mm.pdf`);
      } else {
        const page = format === 'A4' ? 'a4' : 'a5';
        const pdf = new jsPDF({ unit: 'mm', format: page });
        // Fit image to page while maintaining aspect
        const pageSize = pdf.internal.pageSize;
        const pageWidth = pageSize.getWidth();
        const pageHeight = pageSize.getHeight();
        // convert canvas px to mm
        const mmPerPx = 25.4 / 96;
        const imgWidthMM = canvas.width * mmPerPx;
        const imgHeightMM = canvas.height * mmPerPx;
        const ratio = Math.min(pageWidth / imgWidthMM, pageHeight / imgHeightMM);
        const drawWidth = imgWidthMM * ratio;
        const drawHeight = imgHeightMM * ratio;
        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;
        pdf.addImage(imgData, 'PNG', x, y, drawWidth, drawHeight);
        pdf.save(`${completedSale?.id || 'receipt'}-${page}.pdf`);
      }
    } catch (err) {
      console.error('downloadReceipt error', err);
      alert(t('PDF बनाईन सकेन। कन्सोल हेर्नुहोस्।', 'Failed to create PDF. See console.'));
    }
  }

  // step: 'select' | 'cart' | 'checkout' | 'receipt'
  const [step, setStep] = React.useState<'select' | 'cart' | 'checkout' | 'receipt'>('select');
  const [scanQuery, setScanQuery] = React.useState('');
  const [justAddedId, setJustAddedId] = React.useState<string | null>(null);
  const [lastAdded, setLastAdded] = React.useState<{ id: string; qty: number } | null>(null);
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const [undoStack, setUndoStack] = React.useState<any[]>([]);
  const historyLimit = 30;
  const pushUndoSnapshot = useCallback((meta?: any) => {
    try {
      setUndoStack(prev => {
        const copy = JSON.parse(JSON.stringify(prev || []));
        const entry = { cart: JSON.parse(JSON.stringify(cart)), time: Date.now(), meta };
        const stack = [...copy, entry];
        return stack.slice(-historyLimit);
      });
    } catch (e) {}
  }, [cart]);
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [customerDropdown, setCustomerDropdown] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);
  const [customerPan, setCustomerPan] = React.useState('');
  const [customerAddress, setCustomerAddress] = React.useState('');
  const [invoiceMessage, setInvoiceMessage] = React.useState('');
  const [paymentMode, setPaymentMode] = React.useState('Cash');
  const [amountPaid, setAmountPaid] = React.useState('');
  const [activeCat, setActiveCat] = React.useState('All Items');
  const [toast, setToast] = React.useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [completedSale, setCompletedSale] = React.useState<any>(null);
  const [discount, setDiscount] = React.useState(0);
  const [applyTax, setApplyTax] = React.useState(true);

  const scanRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => { if (step === 'select') scanRef.current?.focus(); }, [step]);

  // persist selected format preference
  useEffect(() => { try { localStorage.setItem('dt_print_format', printFormat); } catch {} }, [printFormat]);
  useEffect(() => { try { const pf = localStorage.getItem('dt_print_format'); if (pf) setPrintFormat(pf as any); } catch {} }, []);

  // fetch nepali date (Miti) from server proxy when completedSale changes
  useEffect(() => {
    if (!completedSale || !completedSale.date) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch(`/api/convert-date?date=${encodeURIComponent(completedSale.date)}&to=nepali`);
        const json = await resp.json();
        if (!mounted) return;
        if (json && json.success) {
          // prefer explicit nepali field if present
          setNepaliDate(json.nepali || json.converted || json.date || '');
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [completedSale]);

  // fetch nepali date for the current pending sale (checkout step)
  useEffect(() => {
    if (step !== 'checkout') return;
    let mounted = true;
    (async () => {
      try {
        const now = new Date();
        const iso = now.toISOString().slice(0,10);
        const resp = await fetch(`/api/convert-date?date=${encodeURIComponent(iso)}&to=nepali`);
        const json = await resp.json();
        if (!mounted) return;
        if (json && json.success) setPendingNepaliDate(json.nepali || json.converted || json.date || '');
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [step]);

  // --- Product filtering ---
  const filteredProducts = useMemo(() => {
    let list = activeCat === 'All Items' ? [...products] : products.filter(p => p.category === activeCat);
    const q = scanQuery.trim().toLowerCase();
    if (q) list = list.filter(p => p.id.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || p.nameNe.includes(q));
    return list;
  }, [products, activeCat, scanQuery]);

  // All customers are database-backed via POSContext
  const allCustomers = useMemo(() => {
    return (customers || []).map((c: any) => ({ ...c, id: c.id || c._id }));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    return q ? allCustomers.filter((c: any) => c.name?.toLowerCase().includes(q) || c.full_name?.toLowerCase().includes(q) || (c.phone || '').includes(q)) : allCustomers;
  }, [allCustomers, customerSearch]);

  function formatPreviewBillNo() {
    try {
      const d = new Date();
      const date = d.toISOString().slice(0,10).replace(/-/g,'');
      const key = `dt_bill_counter:${date}`;
      const cur = parseInt(localStorage.getItem(key) || '0', 10) || 0;
      const next = cur + 1;
      return `${date}-${String(next).padStart(4,'0')}`;
    } catch (e) {
      return `S-${Date.now().toString().slice(-6)}`;
    }
  }

  function incrementAndGetBillNo() {
    try {
      const d = new Date();
      const date = d.toISOString().slice(0,10).replace(/-/g,'');
      const key = `dt_bill_counter:${date}`;
      const cur = parseInt(localStorage.getItem(key) || '0', 10) || 0;
      const next = cur + 1;
      localStorage.setItem(key, String(next));
      return `${date}-${String(next).padStart(4,'0')}`;
    } catch (e) {
      return `S-${Date.now().toString().slice(-6)}`;
    }
  }

  // company header/logo editable and persisted
  const [companyName, setCompanyName] = React.useState<string>(() => {
    try { return localStorage.getItem('dt_company_name') || DEFAULT_COMPANY_NAME; } catch { return DEFAULT_COMPANY_NAME; }
  });
  const [companyAddress, setCompanyAddress] = React.useState<string>(() => {
    try { return localStorage.getItem('dt_company_address') || DEFAULT_COMPANY_ADDRESS; } catch { return DEFAULT_COMPANY_ADDRESS; }
  });
  const [companyPan, setCompanyPan] = React.useState<string>(() => {
    try { return localStorage.getItem('dt_company_pan') || DEFAULT_COMPANY_PAN; } catch { return DEFAULT_COMPANY_PAN; }
  });
  const [companyQR, setCompanyQR] = React.useState<string>(() => {
    try {
      const stored = localStorage.getItem('dt_company_qr') || '';
      if (!stored) return DEFAULT_QR_IMAGE_URL;
      if (stored.startsWith('/api/qr-image')) return stored;
      if (/^https?:\/\//i.test(stored) && !stored.includes('127.0.0.1:9000/images/downloaded-image.png')) return stored;
      return DEFAULT_QR_IMAGE_URL;
    } catch { return DEFAULT_QR_IMAGE_URL; }
  });
  useEffect(() => { try { localStorage.setItem('dt_company_name', companyName); } catch {} }, [companyName]);
  useEffect(() => { try { localStorage.setItem('dt_company_address', companyAddress); } catch {} }, [companyAddress]);
  useEffect(() => { try { localStorage.setItem('dt_company_pan', companyPan); } catch {} }, [companyPan]);
  useEffect(() => { try { localStorage.setItem('dt_company_qr', companyQR); } catch {} }, [companyQR]);

  // product search suggestions
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const suggestions = useMemo(() => {
    const q = scanQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return products.filter(p => p.id.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || p.nameNe.toLowerCase().includes(q)).slice(0,8);
  }, [products, scanQuery]);

  const getProductImageUrl = useCallback((prod: any) => {
    return prod?.imageUrl || prod?.image || '';
  }, []);

  const invoiceDraft = useMemo(() => ({
    billNo: completedSale?.id || formatPreviewBillNo(),
    date: new Date().toLocaleString(),
    miti: pendingNepaliDate || formatMiti(new Date().toISOString()),
    name: selectedCustomer?.full_name || selectedCustomer?.name || customerSearch || 'Walk-in',
    address: selectedCustomer?.address || customerAddress || '',
    phone: selectedCustomer?.phone || '',
    pan: selectedCustomer?.pan_no || selectedCustomer?.panNo || selectedCustomer?.pan || customerPan || '',
    message: invoiceMessage.trim(),
    paymentMode,
  }), [completedSale?.id, pendingNepaliDate, selectedCustomer, customerAddress, customerPan, customerSearch, invoiceMessage, paymentMode]);

  const addToCart = (prod: any, qty = 1) => {
    if (prod.stock <= 0) { showToast(t('स्टक खाली छ!', 'Out of stock!'), 'err'); return; }
    // push snapshot for undo
    try {
      setUndoStack(prev => {
        const copy = JSON.parse(JSON.stringify(prev || []));
        const stack = [...copy, { cart: JSON.parse(JSON.stringify(cart)), time: Date.now() }];
        return stack.slice(-historyLimit);
      });
    } catch (e) {}

    setCart(prev => {
      const existing = prev.find(i => i.product.id === prod.id);
      if (existing) return prev.map(i => i.product.id === prod.id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { product: prod, quantity: qty, discountPct: 0 }];
    });
    // set a transient animation state so the product card animates
    try { setJustAddedId(prod.id); setTimeout(() => setJustAddedId(null), 600); } catch {}
    showToast(`${t(prod.nameNe, prod.nameEn)} ${t('कार्टमा थपियो', 'added to cart')}`, 'ok');
    setScanQuery('');
    try { setLastAdded({ id: prod.id, qty }); } catch {}
  };

  const undoLast = () => {
    try {
      setUndoStack(prev => {
        if (!prev || prev.length === 0) return prev || [];
        const copy = JSON.parse(JSON.stringify(prev));
        const last = copy.pop();
        if (last && last.cart) setCart(last.cart);
        else if (last && last.action === 'add' && last.id) {
          setCart(prevC => prevC.map((i: any) => i.product.id === last.id ? { ...i, quantity: Math.max(0, i.quantity - (last.qty || 1)) } : i).filter((i: any) => i.quantity > 0));
        }
        showToast('Undo', 'ok');
        return copy;
      });
    } catch (e) { console.warn('undo failed', e); }
    setLastAdded(null);
  };

  // --- Calculations ---
  const subtotal = cart.reduce((a, i) => a + i.product.sellingPrice * i.quantity * (1 - i.discountPct / 100), 0);
  const discountAmt = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmt;
  const tax = applyTax ? afterDiscount * 0.13 : 0;
  const total = afterDiscount + tax;
  const paid = parseFloat(amountPaid) || 0;
  const change = Math.max(0, paid - total);
  const due = Math.max(0, total - paid);

  const updateQty = (id: string, delta: number) => {
    pushUndoSnapshot({ action: 'updateQty', id, delta });
    setCart(prev => prev.map(i => {
      if (i.product.id === id) {
        const newQty = Math.max(0, i.quantity + delta);
        if (delta > 0 && newQty > i.product.stock) { showToast(t('अपर्याप्त स्टक!', 'Insufficient stock!'), 'err'); return i; }
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const setItemDiscount = (id: string, pct: number) => {
    pushUndoSnapshot({ action: 'discount', id, pct });
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, discountPct: Math.max(0, Math.min(100, pct)) } : i));
  };

  // --- Checkout ---
  const handleCheckout = async () => {
    const selectedName = selectedCustomer?.full_name || selectedCustomer?.name || customerSearch || 'Walk-in';
    const selectedPan = selectedCustomer?.pan_no || selectedCustomer?.panNo || selectedCustomer?.pan || customerPan || '';
    const selectedAddr = selectedCustomer?.address || customerAddress || '';
    const selectedLoginId = selectedCustomer?.login_id || selectedCustomer?.loginId || '';

    const record: any = {
      id: incrementAndGetBillNo(),
      items: cart.map(i => ({
        productId: i.product.id,
        name: t(i.product.nameNe, i.product.nameEn),
        qty: i.quantity,
        unit: i.product.unit,
        rate: i.product.sellingPrice,
        total: i.product.sellingPrice * i.quantity * (1 - i.discountPct / 100),
        cost: i.product.purchasePrice * i.quantity,
      })),
      subtotal,
      discount: discountAmt,
      tax,
      total,
      amountPaid: paid,
      amountDue: due,
      date: new Date().toLocaleString(),
      cashier: cashier?.full_name || cashier?.name || 'Cashier',
      paymentMode,
      status: 'completed',
      customerName: selectedName,
      customerId: selectedCustomer?.id || selectedCustomer?._id,
      customerPhone: selectedCustomer?.phone || '',
      customerLoginId: selectedLoginId,
      customerPan: selectedPan,
      customerAddress: selectedAddr,
      note: invoiceMessage.trim(),
    };

    // Update stock locally
    const updatedProducts = products.map(p => {
      const cartItem = cart.find(i => i.product.id === p.id);
      return cartItem ? { ...p, stock: Math.max(0, p.stock - cartItem.quantity) } : p;
    });
    // Deduplicate just in case and update products
    setProducts(() => {
      const m = new Map<string, any>();
      for (const p of updatedProducts || []) { if (!p || !p.id) continue; m.set(String(p.id), p); }
      const deduped = Array.from(m.values());
      try { localStorage.setItem('dt_pos_products', JSON.stringify(deduped)); } catch (e) {}
      return deduped;
    });

    // If no customerId but there is name/phone/pan/address info, try to create a customer first
    try {
      if (!record.customerId) {
        const maybeName = record.customerName && record.customerName !== 'Walk-in' ? record.customerName : null;
        if (maybeName || record.customerPhone || customerPan || customerAddress) {
          const payload: any = { full_name: maybeName || 'Walk-in', name: maybeName || 'Walk-in', phone: record.customerPhone || '', pan_no: customerPan || '', panNo: customerPan || '', address: customerAddress || '' };
          const cRes = await apiCall('/customers', 'POST', payload);
          if (cRes && (cRes.customer || cRes.data)) {
            const created = cRes.customer || cRes.data;
            record.customerId = created._id || created.id || record.customerId;
            record.customerName = created.full_name || created.name || record.customerName;
            record.customerPhone = created.phone || record.customerPhone;
            record.customerPan = created.pan_no || created.panNo || created.pan || customerPan || record.customerPan;
            record.customerAddress = created.address || customerAddress || record.customerAddress;
          } else if (cRes && cRes.success && cRes.id) {
            record.customerId = cRes.id;
            record.customerPan = customerPan || record.customerPan;
            record.customerAddress = customerAddress || record.customerAddress;
          }
        }
      } else {
        // if selectedCustomer exists but we have new pan/address entered, attach them
        if (selectedCustomer && (customerPan || customerAddress)) {
          record.customerPan = customerPan || selectedCustomer.pan_no || selectedCustomer.panNo || selectedCustomer.pan || record.customerPan;
          record.customerAddress = customerAddress || selectedCustomer.address || record.customerAddress;
        }
      }
    } catch (err) {
      console.warn('create-customer preflight failed', err);
    }

    const res = await apiCall('/sales', 'POST', record);
    if (res.success) {
      setSales(prev => [res.sale || record, ...prev]);
      setReceiptData(res.sale || record);
      setCompletedSale(res.sale || record);
      setCart([]);
      setUndoStack([]);
      setStep('receipt');
      setAmountPaid('');
      setDiscount(0);
      setCustomerSearch('');
      setSelectedCustomer(null);
      setCustomerPan('');
      setCustomerAddress('');
      setInvoiceMessage('');
    } else {
      // Offline mode — save locally
      setSales(prev => [record, ...prev]);
      setReceiptData(record);
      setCompletedSale(record);
      setCart([]);
      setUndoStack([]);
      setStep('receipt');
      setAmountPaid('');
      setDiscount(0);
      setCustomerSearch('');
      setSelectedCustomer(null);
      setCustomerPan('');
      setCustomerAddress('');
      setInvoiceMessage('');
    }
  };

  // Cancel checkout but still produce a receipt (unpaid / pending order)
  const handleCancelCheckout = async () => {
    // show modal confirmation
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    setConfirmCancel(false);
    const record: any = {
      id: incrementAndGetBillNo(),
      items: cart.map(i => ({
        productId: i.product.id,
        name: t(i.product.nameNe, i.product.nameEn),
        qty: i.quantity,
        unit: i.product.unit,
        rate: i.product.sellingPrice,
        total: i.product.sellingPrice * i.quantity * (1 - i.discountPct / 100),
        cost: i.product.purchasePrice * i.quantity,
      })),
      subtotal,
      discount: discountAmt,
      tax,
      total,
      amountPaid: 0,
      amountDue: total,
      date: new Date().toLocaleString(),
      cashier: cashier?.full_name || cashier?.name || 'Cashier',
      paymentMode,
      status: 'pending',
      customerName: selectedCustomer?.full_name || selectedCustomer?.name || customerSearch || 'Walk-in',
      customerId: selectedCustomer?.id || selectedCustomer?._id,
      customerPhone: selectedCustomer?.phone || '',
      customerAddress: customerAddress || '',
      customerPan: customerPan || '',
      note: invoiceMessage.trim(),
    };

    // Do not reduce stock when cancelling — only show receipt for the pending order
    try {
      // ensure customer exists if information provided
      try {
        if (!record.customerId) {
          const maybeName = record.customerName && record.customerName !== 'Walk-in' ? record.customerName : null;
          if (maybeName || record.customerPhone || record.customerPan || record.customerAddress) {
            const payload: any = { full_name: maybeName || 'Walk-in', name: maybeName || 'Walk-in', phone: record.customerPhone || '', pan_no: record.customerPan || '', panNo: record.customerPan || '', address: record.customerAddress || '' };
            const cRes = await apiCall('/customers', 'POST', payload);
            if (cRes && (cRes.customer || cRes.data)) {
              const created = cRes.customer || cRes.data;
              record.customerId = created._id || created.id || record.customerId;
              record.customerName = created.full_name || created.name || record.customerName;
            } else if (cRes && cRes.success && cRes.id) {
              record.customerId = cRes.id;
            }
          }
        }
      } catch (err) {
        console.warn('create-customer preflight failed (cancel)', err);
      }

      const res = await apiCall('/sales', 'POST', record);
      if (res.success) {
        setSales(prev => [res.sale || record, ...prev]);
        setReceiptData(res.sale || record);
        setCompletedSale(res.sale || record);
      } else {
        // offline or failed to persist — keep locally
        setSales(prev => [record, ...prev]);
        setReceiptData(record);
        setCompletedSale(record);
      }
    } catch (err) {
      setSales(prev => [record, ...prev]);
      setReceiptData(record);
      setCompletedSale(record);
    }

    // clear cart but keep products stock untouched
    setCart([]);
    setUndoStack([]);
    setStep('receipt');
    setAmountPaid('');
    setDiscount(0);
    setCustomerSearch('');
    setSelectedCustomer(null);
    setCustomerPan('');
    setCustomerAddress('');
    setInvoiceMessage('');
  };

  // Confirmation modal state
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [uiMode, setUiMode] = React.useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.body.dataset.posTheme = uiMode;
    return () => {
      delete document.body.dataset.posTheme;
    };
  }, [uiMode]);

  // Keyboard shortcuts and quick-add hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Focus search with '/'
      if (e.key === '/') {
        e.preventDefault();
        scanRef.current?.focus();
        return;
      }

      // Digit quick-add: 1..9 add Nth visible product
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const prod = filteredProducts[idx];
        if (prod) {
          addToCart(prod, 1);
          try { setLastAdded({ id: prod.id, qty: 1 }); } catch {}
          return;
        }
      }

      // Arrow navigation between product cards when focus is on grid or body
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const cards = Array.from(document.querySelectorAll<HTMLElement>('.bill-product-card')) as HTMLElement[];
        if (cards.length > 0) {
          const active = document.activeElement as HTMLElement | null;
          let idx = Math.max(0, cards.findIndex(c => c === active));
          if (idx === -1) idx = 0;
          if (e.key === 'ArrowRight') idx = Math.min(cards.length - 1, idx + 1);
          else idx = Math.max(0, idx - 1);
          const next = cards[idx];
          next?.focus();
          next?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          e.preventDefault();
          return;
        }
      }

      // When a product card is focused, support + / - to change qty
      if (e.key === '+' || e.key === '=' || e.key === '-') {
        const active = document.activeElement as HTMLElement | null;
        if (active && active.classList.contains('bill-product-card')) {
          const pid = active.dataset.prodId;
          if (pid) {
            if (e.key === '-' ) updateQty(pid, -1);
            else updateQty(pid, 1);
            e.preventDefault();
            return;
          }
        }
      }

      // Toggle shortcuts with '?' key
      if (e.key === '?') {
        setShowShortcuts(prev => !prev);
        return;
      }

      // Navigation shortcuts
      if (e.key === 'n' || e.key === 'N') {
        if (step === 'select' && cart.length > 0) setStep('cart');
        else if (step === 'cart') setStep('checkout');
      }
      if (e.key === 'p' || e.key === 'P') {
        if (step === 'checkout') setStep('cart');
        else if (step === 'cart') setStep('select');
      }

      // Quick proceed to print/receipt
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === scanRef.current) {
        // when search focused and Enter pressed, add first suggestion if available
        if (suggestions && suggestions.length > 0) {
          e.preventDefault();
          addToCart(suggestions[0], 1);
          try { setLastAdded({ id: suggestions[0].id, qty: 1 }); } catch {}
        }
      }

      if (e.key === 'Escape') {
        if (confirmCancel) setConfirmCancel(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, cart.length, confirmCancel, filteredProducts, suggestions]);

  // Ctrl+Z handler for undo
  useEffect(() => {
    const onCtrlZ = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undoLast();
      }
    };
    window.addEventListener('keydown', onCtrlZ);
    return () => window.removeEventListener('keydown', onCtrlZ);
  }, [undoStack, cart]);

  const resetBilling = () => {
    setStep('select');
    setCompletedSale(null);
    setScanQuery('');
    setActiveCat('All Items');
  };

  // ─── Step indicator ───────────────────────────────────────────────────────
  const steps = [
    { key: 'select', icon: 'ri-apps-2-line', label: t('सामान छान्नुहोस्', 'Select Items') },
    { key: 'cart', icon: 'ri-shopping-cart-2-line', label: t('कार्ट', 'Cart') },
    { key: 'checkout', icon: 'ri-secure-payment-line', label: t('चेकआउट', 'Checkout') },
    { key: 'receipt', icon: 'ri-file-paper-line', label: t('रसिद', 'Receipt') },
  ];
  const stepIdx = steps.findIndex(s => s.key === step);
  const cashierName = cashier?.full_name || cashier?.name || t('क्यासियर', 'Cashier');
  const branchName = (cashier as any)?.branchName || (cashier as any)?.branch || t('मुख्य शाखा', 'Main Branch');
  const currentDateTime = useMemo(() => new Date().toLocaleString(), [step, toast, scanQuery, customerSearch, amountPaid]);
  const shellThemeClasses = uiMode === 'dark'
    ? 'bg-slate-950 text-slate-100'
    : 'bg-slate-100 text-slate-900';

  const openFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch (err) {
      console.warn('Fullscreen failed', err);
    }
  };

  const invoicePreviewData = useMemo(() => ({
    invoiceNo: invoiceDraft.billNo,
    billDate: invoiceDraft.date,
    dueDate: invoiceDraft.miti,
    title: 'Estimate Bill',
    company: {
      name: companyName,
      address: companyAddress,
      phone: (cashier as any)?.phone || '',
      pan: companyPan,
      email: '',
      logoUrl: '',
      qrCodeUrl: companyQR,
      barcodeValue: invoiceDraft.billNo,
    },
    customer: {
      name: invoiceDraft.name,
      address: invoiceDraft.address || '-',
      phone: invoiceDraft.phone || '-',
      pan: invoiceDraft.pan || '-',
    },
    items: cart.map((item, idx) => ({
      sn: idx + 1,
      name: t(item.product.nameNe, item.product.nameEn),
      qty: item.quantity,
      rate: item.product.sellingPrice,
      discount: item.product.sellingPrice * item.quantity * (item.discountPct / 100),
      vat: applyTax ? 13 : 0,
      total: item.product.sellingPrice * item.quantity * (1 - item.discountPct / 100),
    })),
    subtotal,
    discount: discountAmt,
    vatAmount: tax,
    grandTotal: total,
    inWords: numberToWords(Math.round(total)) + ' Only',
    paidAmount: paid,
    status: (paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid') as InvoiceStatus,
    message: invoiceMessage.trim(),
    watermark: step === 'checkout' ? 'DRAFT' : 'LIVE',
  }), [
    invoiceDraft.billNo,
    invoiceDraft.date,
    invoiceDraft.miti,
    invoiceDraft.name,
    invoiceDraft.address,
    invoiceDraft.phone,
    invoiceDraft.pan,
    companyName,
    companyAddress,
    companyPan,
    companyQR,
    cashier,
    cart,
    applyTax,
    subtotal,
    discountAmt,
    tax,
    total,
    paid,
    invoiceMessage,
    step,
    numberToWords,
    t,
  ]);

  const receiptInvoiceData = useMemo(() => {
    const items = Array.isArray(completedSale?.items)
      ? completedSale.items.map((item: any, idx: number) => ({
          name: item.name,
          qty: item.qty,
          discount: 0,
          vat: completedSale.tax ? 13 : 0,
          total: item.total || 0,
        }))
      : invoicePreviewData.items;

    return {
      invoiceNo: completedSale?.id || invoicePreviewData.invoiceNo,
      billDate: completedSale?.date || invoicePreviewData.billDate,
      dueDate: nepaliDate || invoicePreviewData.dueDate,
      title: completedSale?.status === 'pending' ? 'Estimate Bill' : 'Tax Invoice',
      company: invoicePreviewData.company,
      customer: {
        name: completedSale?.customerName || invoicePreviewData.customer.name,
        address: completedSale?.customerAddress || invoicePreviewData.customer.address,
        phone: completedSale?.customerPhone || invoicePreviewData.customer.phone,
        pan: completedSale?.customerPan || invoicePreviewData.customer.pan,
      },
      items,
      subtotal: completedSale?.subtotal ?? subtotal,
      discount: completedSale?.discount ?? discountAmt,
      vatAmount: completedSale?.tax ?? tax,
      grandTotal: completedSale?.total ?? total,
      inWords: numberToWords(Math.round(completedSale?.total ?? total)) + ' Only',
      paidAmount: completedSale?.amountPaid ?? 0,
      status: (completedSale?.status === 'pending' ? 'partial' : (completedSale?.amountDue > 0 ? 'partial' : 'paid')) as InvoiceStatus,
      message: completedSale?.note || invoiceMessage.trim(),
      watermark: completedSale?.status === 'pending' ? 'PENDING' : 'PAID',
    };
  }, [completedSale, invoicePreviewData, nepaliDate, subtotal, discountAmt, tax, total, invoiceMessage, numberToWords]);

  return (
    <div className={`bill-wrap min-h-[calc(100vh-100px)] ${shellThemeClasses}`}>
      {toast && <div className={`pos-bill-toast pos-bill-toast--${toast.type} fixed right-4 top-4 z-[80] shadow-lg`}><i className={toast.type === 'ok' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} /> {toast.msg}</div>}

      <header className={`sticky top-0 z-40 border-b ${uiMode === 'dark' ? 'border-slate-800/80 bg-slate-950/85' : 'border-slate-200 bg-white/90'} backdrop-blur-xl`}>
        <div className="mx-auto flex max-w-[1800px] flex-nowrap items-center gap-3 overflow-x-auto px-4 py-2 lg:px-6">
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <i className="ri-store-3-line text-lg font-black" />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 shrink-0">
            <div className="bill-header-meta hidden lg:flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="header-badge">{branchName}</span>
              <span className="header-badge">{cashierName}</span>
              <span className="header-badge">{currentDateTime}</span>
            </div>
          </div>

          <div className="bill-header-actions flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => showToast(t('सूचना केन्द्र तयार हुँदैछ', 'Notification center coming soon'))} className={`bill-header-action bill-header-action--icon inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${uiMode === 'dark' ? 'border-slate-800 bg-slate-900 text-slate-200 hover:border-amber-400/50 hover:text-amber-300' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:text-amber-500'}`} aria-label={t('सूचना', 'Notifications')}>
              <i className="ri-notification-3-line text-lg" />
            </button>
            <button type="button" onClick={() => setUiMode((prev) => prev === 'dark' ? 'light' : 'dark')} className={`bill-header-action bill-header-action--icon inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${uiMode === 'dark' ? 'border-slate-800 bg-slate-900 text-slate-200 hover:border-amber-400/50 hover:text-amber-300' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:text-amber-500'}`} aria-label={t('थीम', 'Theme')}>
              <i className={uiMode === 'dark' ? 'ri-sun-line text-lg' : 'ri-moon-line text-lg'} />
            </button>
            <button type="button" onClick={openFullscreen} className={`bill-header-action bill-header-action--icon inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${uiMode === 'dark' ? 'border-slate-800 bg-slate-900 text-slate-200 hover:border-amber-400/50 hover:text-amber-300' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:text-amber-500'}`} aria-label={t('Fullscreen', 'Fullscreen')}>
              <i className="ri-fullscreen-line text-lg" />
            </button>
            <button type="button" onClick={resetBilling} className="bill-header-action bill-header-action--primary inline-flex h-10 items-center justify-center rounded-2xl bg-amber-400 px-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300" aria-label={t('नयाँ बिक्री', 'New Sale')}>
              <i className="ri-add-line mr-2" /> {t('नयाँ बिक्री', 'New Sale')}
            </button>
            <button type="button" onClick={() => undoLast()} className="bill-header-action bill-header-action--undo inline-flex h-10 items-center justify-center rounded-2xl border px-3 text-sm font-medium pos-undo-btn ml-2" aria-label="Undo last add">Undo</button>
          </div>
        </div>

        <div className={`border-t ${uiMode === 'dark' ? 'border-slate-800/80 bg-slate-950/55' : 'border-slate-200 bg-white/70'}`}>
          <div className="bill-stepper-row mx-auto flex max-w-[1800px] flex-wrap items-center justify-center gap-2 px-4 py-2 lg:px-6">
            {steps.map((s, i) => {
              const completed = i < stepIdx;
              const active = s.key === step;
              return (
                <div key={s.key} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${active ? 'border-amber-400 bg-amber-400/15 text-amber-300 shadow-[0_0_0_1px_rgba(251,191,36,.15)]' : completed ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : uiMode === 'dark' ? 'border-slate-800 bg-slate-900/70 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${active ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20' : completed ? 'bg-emerald-400 text-slate-950' : uiMode === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                    <i className={s.icon} />
                  </span>
                  <span className="text-xs font-semibold tracking-tight lg:text-sm">{s.label}</span>
                  {completed ? <i className="ri-checkbox-circle-line text-emerald-300" /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="pos-modal-overlay" role="dialog" aria-modal="true" aria-label="Keyboard Shortcuts">
          <div className="pos-modal">
            <h3>Keyboard & Touch Shortcuts</h3>
            <ul style={{ marginTop: 8 }}>
              <li><strong>/</strong> — Focus search</li>
              <li><strong>1-9</strong> — Quick-add Nth visible product</li>
              <li><strong>Arrow Left/Right</strong> — Move product focus</li>
              <li><strong>Enter / Space</strong> — Add focused product</li>
              <li><strong>+</strong> / <strong>-</strong> — Increase / decrease quantity for focused product</li>
              <li><strong>?</strong> — Toggle this help</li>
            </ul>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button className="pos-primary-btn" onClick={() => setShowShortcuts(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 1: Product Selection ── */}
      {step === 'select' && (
        <div className="bill-select">
          <div className="bill-select-top">
            <div className="bill-search-wrap">
              <i className="ri-barcode-box-line" />
              <input
                ref={scanRef}
                className="bill-search"
                type="text"
                placeholder={t('बारकोड स्क्यान / नाम खोज्नुहोस्...', 'Scan barcode or search product...')}
                value={scanQuery}
                onChange={e => { setScanQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {scanQuery && <button className="bill-search-clear" onClick={() => { setScanQuery(''); setShowSuggestions(false); }}><i className="ri-close-line" /></button>}

              {showSuggestions && suggestions.length > 0 && (
                <div className="search-suggestions">
                  {suggestions.map(s => (
                    <div key={s.id} className="suggestion-row" onMouseDown={(e) => { e.preventDefault(); addToCart(s, 1); setShowSuggestions(false); }}>
                      <div className="sr-left">{t(s.nameNe, s.nameEn)}</div>
                      <div className="sr-right">रू {s.sellingPrice}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bill-cats">
              {CATS.map(c => (
                <button key={c} className={`bill-cat-btn ${activeCat === c ? 'active' : ''}`} onClick={() => setActiveCat(c)}>
                  {c === 'All Items' ? t('सबै', 'All') : c === 'herbs' ? t('जडीबुटी', 'Herbs') : c === 'grains' ? t('अन्न', 'Grains') : c === 'daily' ? t('दैनिक', 'Daily') : t('सामग्री', 'Supplies')}
                </button>
              ))}
            </div>
          </div>

          <div className="bill-product-grid">
            {filteredProducts.length === 0 && (
              <div className="bill-empty">
                <i className="ri-inbox-line" />
                <p>{t('कुनै सामान भेटिएन', 'No products found')}</p>
                <div style={{ marginTop: 8 }}>
                  <button className="pos-sec-btn" onClick={async () => {
                    try {
                      const pRes = await apiCall('/products');
                      if (pRes && pRes.success && Array.isArray(pRes.products)) {
                        const dedup = Array.from(new Map(pRes.products.map((x:any) => [String(x.id), x])).values());
                        setProducts(dedup.map((p: any) => normalizeProduct(p)));
                        try { localStorage.setItem('dt_pos_products', JSON.stringify(dedup)); } catch (e) {}
                        showToast(t('उत्पादन पुन: लोड भयो', 'Products reloaded'), 'ok');
                      } else {
                        showToast(t('सर्भर अनुपलब्ध, पछि प्रयास गर्नुहोस्', 'Server unavailable, try later'), 'err');
                      }
                    } catch (e) { showToast(t('त्रुटि आयो', 'Error occurred'), 'err'); }
                  }}>{t('पुन: प्रयास गर्नुहोस्', 'Retry')}</button>
                </div>
              </div>
            )}
            {filteredProducts.map((prod, prodIdx) => {
              const inCart = cart.find(i => i.product.id === prod.id);
              const outOfStock = prod.stock <= 0;
              return (
                <div
                  key={prod.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${t(prod.nameNe, prod.nameEn)} — ${prod.sellingPrice} ${prod.unit}`}
                  data-prod-id={prod.id}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!outOfStock) addToCart(prod); } }}
                  className={`bill-product-card ${outOfStock ? 'out-of-stock' : ''} ${inCart ? 'in-cart' : ''} ${justAddedId === prod.id ? 'just-added' : ''}`}
                  onClick={() => !outOfStock && addToCart(prod)}
                >
                    <div className="bpc-top">
                      <div className="bpc-emoji">
                          {getProductImageUrl(prod)
                          ? <img src={getProductImageUrl(prod)} alt={t(prod.nameNe, prod.nameEn)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                          : prod.emoji}
                      </div>
                      <div className="bpc-head">
                        <div className="bpc-name">{t(prod.nameNe, prod.nameEn)}</div>
                        <div className="bpc-price">रू {prod.sellingPrice}/{prod.unit}</div>
                        <div className="bpc-tip">
                          {inCart ? t('कार्टमा थपिएको', 'Already in cart') : t('कार्टमा थप्न कार्ड ट्याप गर्नुहोस्', 'Tap card to add')}
                        </div>
                        <div className="bpc-actions-top">
                          {inCart ? (
                            <div className="bpc-action-row" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQty(prod.id, -1);
                                }}
                                className="bpc-step-btn"
                                aria-label={t('कार्टबाट एक घटाउनुहोस्', 'Subtract one from cart')}
                              >
                                <i className="ri-subtract-line" />
                              </button>
                              <div className="bpc-qty-pill">
                                <i className="ri-shopping-bag-3-line" /> {inCart.quantity}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQty(prod.id, 1);
                                }}
                                className="bpc-step-btn"
                                aria-label={t('कार्टमा एक थप्नुहोस्', 'Add one to cart')}
                              >
                                <i className="ri-add-line" />
                              </button>
                            </div>
                          ) : (
                            <button type="button" className="bpc-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(prod); }}>
                              <i className="ri-add-line" /> {t('थप्नुहोस्', 'Add')}
                            </button>
                          )}
                        </div>
                      </div>
                      {inCart && (
                        <div className="bpc-cart-badge">
                          <i className="ri-check-line" /> {inCart.quantity}
                        </div>
                      )}
                    </div>

                    <div className="bpc-footer">
                      <div className={`bpc-stock ${prod.stock < 50 ? 'low' : ''}`}>
                        {outOfStock ? <><i className="ri-close-circle-line" /> {t('स्टक छैन', 'Out of Stock')}</> : `${prod.stock} ${prod.unit} ${t('उपलब्ध', 'left')}`}
                      </div>
                    </div>
                </div>
              );
            })}
          </div>

          {cart.length > 0 && (
            <div className="bill-float-btn" onClick={() => setStep('cart')}>
              <i className="ri-shopping-cart-2-line" />
              <span>{cart.reduce((s, i) => s + i.quantity, 0)} {t('सामान — कार्ट हेर्नुहोस्', 'Items — View Cart')}</span>
              <span className="float-total">रू {subtotal.toLocaleString()}</span>
              <i className="ri-arrow-right-line" />
            </div>
          )}

          {/* Next nav for step (no Back on first page) */}
          <div className="bill-step-nav" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="pos-primary-btn" onClick={() => setStep('cart')} disabled={cart.length === 0}>{t('नेक्स्ट', 'Next')}</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Cart Review ── */}
      {step === 'cart' && (
        <div className="bill-cart">
          <div className="bill-cart-header">
            <button className="bill-back-btn" onClick={() => setStep('select')}><i className="ri-arrow-left-line" /> {t('थप सामान थप्नुहोस्', 'Add More Items')}</button>
            <h2><i className="ri-shopping-cart-2-line" /> {t('कार्ट समीक्षा', 'Cart Review')}</h2>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="pos-sec-btn" onClick={() => setStep('select')}><i className="ri-arrow-left-line" /> {t('पछिल्लो', 'Previous')}</button>
              <button className="pos-primary-btn" onClick={() => setStep('checkout')} disabled={cart.length === 0}>{t('अर्को', 'Next')}</button>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="bill-empty"><i className="ri-shopping-cart-line" /><p>{t('कार्ट खाली छ', 'Cart is empty')}</p><button className="pos-primary-btn" onClick={() => setStep('select')}>{t('सामान थप्नुहोस्', 'Add Products')}</button></div>
          ) : (
            <>
              <div className="bill-cart-items">
                {cart.map(item => (
                  <div key={item.product.id} className="bill-cart-row">
                    <div className="bcr-emoji">
                      {getProductImageUrl(item.product)
                        ? <img src={getProductImageUrl(item.product)} alt={t(item.product.nameNe, item.product.nameEn)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                        : item.product.emoji}
                    </div>
                    <div className="bcr-info">
                      <strong>{t(item.product.nameNe, item.product.nameEn)}</strong>
                      <span>रू {item.product.sellingPrice}/{item.product.unit}</span>
                    </div>
                    <div className="bcr-qty-ctrl">
                      <button onClick={() => updateQty(item.product.id, -1)}><i className="ri-subtract-line" /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, 1)}><i className="ri-add-line" /></button>
                    </div>
                    <div className="bcr-discount">
                      <input type="number" min={0} max={100} value={item.discountPct || ''} placeholder="0%" onChange={e => setItemDiscount(item.product.id, parseFloat(e.target.value) || 0)} className="bcr-disc-input" />
                      <span>% {t('छुट', 'off')}</span>
                    </div>
                    <div className="bcr-total">रू {(item.product.sellingPrice * item.quantity * (1 - item.discountPct / 100)).toLocaleString()}</div>
                    <button className="bcr-remove" onClick={() => { pushUndoSnapshot({ action: 'remove', id: item.product.id }); setCart(prev => prev.filter(i => i.product.id !== item.product.id)); }}><i className="ri-delete-bin-line" /></button>
                  </div>
                ))}
              </div>

              <div className="bill-cart-summary">
                <div className="bill-summary-row">
                  <span>{t('उप-जम्मा', 'Subtotal')}</span>
                  <span>रू {subtotal.toLocaleString()}</span>
                </div>
                <div className="bill-summary-row">
                  <span>{t('छुट %', 'Discount %')}</span>
                  <div className="bill-disc-ctrl">
                    <input type="number" min={0} max={100} value={discount || ''} placeholder="0" onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="bill-disc-input" />
                    <span>%</span>
                  </div>
                </div>
                {discountAmt > 0 && <div className="bill-summary-row red"><span>{t('छुट रकम', 'Discount Amount')}</span><span>- रू {discountAmt.toFixed(2)}</span></div>}
                <div className="bill-summary-row">
                  <span>{t('VAT 13%', 'VAT 13%')}</span>
                  <label className="bill-tax-toggle">
                    <input type="checkbox" checked={applyTax} onChange={e => setApplyTax(e.target.checked)} />
                    <span>{applyTax ? `रू ${tax.toFixed(2)}` : t('लागू छैन', 'Not Applied')}</span>
                  </label>
                </div>
                <div className="bill-summary-total">
                  <span>{t('कुल रकम', 'Grand Total')}</span>
                  <span>रू {total.toLocaleString()}</span>
                </div>
                <button className="pos-primary-btn large" onClick={() => setStep('checkout')}>
                  <i className="ri-secure-payment-line" /> {t('चेकआउट गर्नुहोस्', 'Proceed to Checkout')}
                </button>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="pos-sec-btn" onClick={() => setStep('select')}><i className="ri-arrow-left-line" /> {t('पछिल्लो', 'Previous')}</button>
                  <button className="pos-sec-btn" onClick={() => setStep('checkout')} disabled={cart.length === 0}><i className="ri-arrow-right-line" /> {t('अर्को', 'Next')}</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Mobile floating actions for cart (previous/next and total) */}
      {step === 'cart' && (
        <div className="bill-mobile-actions" style={{ display: 'none' }}>
          <button className="pos-sec-btn" onClick={() => setStep('select')} style={{ display: 'none' }}><i className="ri-arrow-left-line" /> {t('पछिल्लो', 'Previous')}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', background: 'rgba(0,0,0,0.35)', borderRadius: 8, color: '#fff', fontWeight: 700 }}>
            <span>{cart.reduce((s, i) => s + i.quantity, 0)} {t('items', 'items')}</span>
            <span style={{ marginLeft: 8 }}>रू {subtotal.toFixed(2)}</span>
          </div>
          <button className="pos-primary-btn" onClick={() => setStep('checkout')} disabled={cart.length === 0}><i className="ri-arrow-right-line" /> {t('अर्को', 'Next')}</button>
        </div>
      )}

      {/* ── STEP 3: Checkout ── */}
      {step === 'checkout' && (
        <div className="bill-checkout">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <button className="bill-back-btn" onClick={() => setStep('cart')}><i className="ri-arrow-left-line" /> {t('कार्टमा फर्कनुहोस्', 'Back to Cart')}</button>
              <div style={{ marginLeft: 'auto' }}>
                <button className="pos-sec-btn" onClick={() => {/* next performs checkout */ handleCheckout(); }}>{t('नेक्स्ट', 'Next')}</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}><i className="ri-secure-payment-line" /> {t('भुक्तानी', 'Payment')}</h2>
              <div className="muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
                <div><strong>{t('AD', 'AD')}:</strong> {new Date().toLocaleString()}</div>
                <div><strong>{t('BS', 'BS')}:</strong> {pendingNepaliDate || formatMiti(new Date().toISOString())}</div>
              </div>
            </div>

          <div className="bill-checkout-grid">
            <div className="bill-co-stack">
              <div className="bill-co-section">
                <h3><i className="ri-user-line" /> {t('ग्राहक (ऐच्छिक)', 'Customer (Optional)')}</h3>
                <div className="customer-search-wrap">
                  <i className="ri-search-line" />
                  <input
                    type="text"
                    className="pos-form-input"
                    placeholder={t('ग्राहक खोज्नुहोस् वा नाम टाइप गर्नुहोस्...', 'Search customer or type name...')}
                    value={selectedCustomer ? (selectedCustomer.full_name || selectedCustomer.name) : customerSearch}
                    onFocus={() => { setCustomerDropdown(true); if (selectedCustomer) { setCustomerSearch(selectedCustomer.full_name || selectedCustomer.name); setSelectedCustomer(null); } }}
                    onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setCustomerDropdown(true); }}
                  />
                  {selectedCustomer && <button className="pos-sec-btn" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); setCustomerPan(''); setCustomerAddress(''); }}><i className="ri-close-line" /></button>}
                </div>
                {customerDropdown && !selectedCustomer && (
                  <div className="customer-dropdown">
                    {filteredCustomers.map((c: any) => (
                      <div key={c.id || c._id} className="customer-dd-row" onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerDropdown(false); setCustomerPan(c.pan_no || c.panNo || c.pan || ''); setCustomerAddress(c.address || ''); }}>
                        <div className="cdr-avatar">{(c.full_name || c.name)?.[0]}</div>
                        <div>
                          <strong>{c.full_name || c.name}</strong>
                          {c.phone && <span> · {c.phone}</span>}
                        </div>
                      </div>
                    ))}
                    {filteredCustomers.length === 0 && customerSearch && (
                      <div className="customer-dd-row muted"><i className="ri-user-add-line" /> {t('Walk-in — नयाँ ग्राहक', 'Walk-in / New Customer')}</div>
                    )}
                  </div>
                )}
                {selectedCustomer && (
                  <div className="selected-customer-card">
                    <div className="scc-avatar">{(selectedCustomer.full_name || selectedCustomer.name)[0]}</div>
                    <div>
                      <strong>{selectedCustomer.full_name || selectedCustomer.name}</strong>
                      {selectedCustomer.phone && <div className="scc-sub"><i className="ri-phone-line" /> {selectedCustomer.phone}</div>}
                      {selectedCustomer.address && <div className="scc-sub"><i className="ri-map-pin-line" /> {selectedCustomer.address}</div>}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 12 }}>{t('PAN No', 'PAN No')}</label>
                  <input className="pos-form-input" value={customerPan} onChange={e => { setCustomerPan(e.target.value); }} placeholder={t('PAN No', 'PAN No')} />
                  <label style={{ fontSize: 12, marginTop: 6 }}>{t('Address', 'Address')}</label>
                  <input className="pos-form-input" value={customerAddress} onChange={e => { setCustomerAddress(e.target.value); }} placeholder={t('Address', 'Address')} />
                  <label style={{ fontSize: 12, marginTop: 6 }}>{t('Message', 'Message')}</label>
                  <textarea
                    className="pos-form-input"
                    value={invoiceMessage}
                    onChange={e => setInvoiceMessage(e.target.value)}
                    placeholder={t('बिलका लागि सन्देश...', 'Invoice message...')}
                    rows={3}
                    style={{ resize: 'vertical', minHeight: 72 }}
                  />
                </div>
              </div>

              <div className="bill-co-section">
                <h3><i className="ri-secure-payment-line" /> {t('भुक्तानी माध्यम', 'Payment Method')}</h3>
                <div className="bill-payment-modes">
                  {PAYMENT_MODES.map(m => (
                    <button key={m.id} className={`payment-mode-btn ${paymentMode === m.id ? 'active' : ''}`} onClick={() => setPaymentMode(m.id)}>
                      <i className={m.icon} />
                      <span>{t(m.labelNe, m.labelEn)}</span>
                    </button>
                  ))}
                </div>
                {paymentMode === 'QR' && (
                  <div className="selected-customer-card" style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <img
                      src={companyQR || DEFAULT_QR_IMAGE_URL}
                      alt="QR"
                      style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 16, background: '#fff', padding: 10 }}
                    />
                    <div style={{ minWidth: 220 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('QR स्क्यान गरेर भुक्तानी गर्नुहोस्', 'Scan the QR and pay')}</div>
                      <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5 }}>
                        {t('ग्राहकले QR स्क्यान गरेपछि यो भुक्तानी विधि चयन गरेर बिल सुरक्षित गर्नुहोस्।', 'After the customer scans the QR, select this payment method and save the bill.')}
                      </div>
                    </div>
                  </div>
                )}
                <div className="pos-input-group" style={{ marginTop: 16 }}>
                  <label>{t('प्राप्त रकम (रू)', 'Amount Received (NRS)')}</label>
                  <input type="number" className="pos-form-input large" placeholder={`0.00 (${t('कुल', 'Total')}: ${total.toFixed(2)})`} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} autoFocus />
                </div>
                {paid > 0 && paid >= total && <div className="bill-change-display green"><i className="ri-money-dollar-circle-line" /> {t('फिर्ता रकम', 'Change')}: रू {change.toFixed(2)}</div>}
                {due > 0 && paid > 0 && <div className="bill-change-display red"><i className="ri-error-warning-line" /> {t('बाँकी रकम', 'Amount Due')}: रू {due.toFixed(2)}</div>}
              </div>

              <div className="bill-co-section">
                <h3><i className="ri-file-list-3-line" /> {t('अर्डर सारांश', 'Order Summary')}</h3>
                <div className="bill-co-items">
                  {cart.map(i => (
                    <div key={i.product.id} className="bill-co-item">
                      <span>
                        {getProductImageUrl(i.product)
                          ? <img src={getProductImageUrl(i.product)} alt={t(i.product.nameNe, i.product.nameEn)} style={{ width: 22, height: 22, objectFit: 'cover', borderRadius: 6, marginRight: 6, verticalAlign: 'middle' }} />
                          : `${i.product.emoji} `}
                        {t(i.product.nameNe, i.product.nameEn)}
                      </span>
                      <span>{i.quantity} × रू {i.product.sellingPrice}</span>
                      <span>रू {(i.product.sellingPrice * i.quantity * (1 - i.discountPct / 100)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="bill-co-totals">
                  {(() => {
                    const paid = parseFloat(amountPaid) || 0;
                    const remaining = Math.max(0, total - paid);
                    if (paid <= 0) return null;
                    return (
                      <>
                        <div className="bct-row"><span>{t('भुक्तानी', 'Paid')}</span><span>रू {paid.toFixed(2)}</span></div>
                        {paid > total ? (
                          <div className="bct-row green"><span>{t('फिर्ता रकम', 'Change')}</span><span>रू {(paid - total).toFixed(2)}</span></div>
                        ) : remaining > 0 ? (
                          <div className="bct-row red"><span>{t('बाँकी', 'Remaining')}</span><span>रू {remaining.toFixed(2)}</span></div>
                        ) : null}
                      </>
                    );
                  })()}
                  <div className="bct-row"><span>{t('उप-जम्मा', 'Subtotal')}</span><span>रू {subtotal.toFixed(2)}</span></div>
                  {discountAmt > 0 && <div className="bct-row red"><span>{t('छुट', 'Discount')}</span><span>- रू {discountAmt.toFixed(2)}</span></div>}
                  {applyTax && <div className="bct-row"><span>VAT 13%</span><span>रू {tax.toFixed(2)}</span></div>}
                  <div className="bct-total"><span>{t('कुल', 'Grand Total')}</span><span>रू {total.toFixed(2)}</span></div>
                </div>
                <button className="pos-primary-btn large" disabled={cart.length === 0} onClick={handleCheckout}>
                  <i className="ri-check-double-line" /> {t('भुक्तानी सम्पन्न गर्नुहोस्', 'Complete Payment')} — रू {total.toFixed(2)}
                </button>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="pos-sec-btn" onClick={handleCancelCheckout} disabled={cart.length === 0}><i className="ri-close-circle-line" /> {t('रद्द गरी रसिद दिनुहोस्', 'Cancel & Print Receipt')}</button>
                  <button className="pos-sec-btn" onClick={() => setStep('cart')}><i className="ri-arrow-left-line" /> {t('ब्याक', 'Back')}</button>
                </div>
              </div>
            </div>

            <div className="bill-co-section bill-live-preview space-y-4 rounded-[28px] border border-slate-200 bg-white/95 p-4 text-slate-900 shadow-2xl shadow-slate-950/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="mb-1 text-base font-bold text-slate-900"><i className="ri-eye-line mr-2 text-amber-500" />{t('लाइभ बिल प्रिभ्यू', 'Live Invoice Preview')}</h3>
                  <p className="text-xs text-slate-500">{t('प्रिन्ट जस्तो देखिने प्रिभ्यू, तुरुन्त अपडेट हुन्छ।', 'Paper-style preview that updates instantly.')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => downloadReceipt(printFormat)} className="inline-flex items-center rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-amber-400 hover:text-amber-600">
                    <i className="ri-download-line mr-2" /> {t('PDF', 'PDF')}
                  </button>
                  <button type="button" onClick={() => printReceipt(printFormat)} className="inline-flex items-center rounded-full bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-300">
                    <i className="ri-printer-line mr-2" /> {t('प्रिन्ट', 'Print')}
                  </button>
                </div>
              </div>

              <Suspense fallback={<div className="receipt-preview-panel">Loading invoice preview…</div>}>
                {/* @ts-ignore */}
                <InvoiceModern
                  data={invoicePreviewData}
                  template="modern"
                  className="bill-receipt bill-receipt--preview w-full"
                  style={{ maxWidth: '100%', width: '100%', boxShadow: 'none', borderRadius: '20px' }}
                />
              </Suspense>

              <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Subtotal</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">रू {subtotal.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">VAT</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">रू {tax.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Grand Total</div>
                  <div className="mt-1 text-lg font-black text-amber-500">रू {total.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Receipt ── */}
      {step === 'receipt' && completedSale && (
        <div className="bill-receipt-wrap px-4 py-6 lg:px-6">
          <div className="mx-auto grid w-full max-w-[1800px] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Suspense fallback={<div className="receipt-preview-panel">Loading invoice…</div>}>
              {/* @ts-ignore */}
              <InvoiceModern
                data={receiptInvoiceData}
                template="modern"
                className="bill-receipt bill-receipt--final w-full"
                style={{ maxWidth: '100%', width: '100%', boxShadow: '0 18px 60px rgba(15,23,42,.18)', borderRadius: '28px' }}
                showActions={false}
              />
            </Suspense>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-slate-900 shadow-xl shadow-slate-950/10">
                <div className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-amber-500">Actions</div>
                <div className="flex flex-col gap-2">
                  <button className="pos-primary-btn large" onClick={resetBilling}>
                    <i className="ri-add-circle-line" /> {t('नयाँ बिक्री सुरु गर्नुहोस्', 'Start New Sale')}
                  </button>
                  <button className="pos-sec-btn" onClick={() => { setShowThermalWidths(s => !s); setSelectedFormat(null); }}><i className="ri-temperature-line" /> {t('Thermal', 'Thermal')}</button>
                  {showThermalWidths && (
                    <div className="grid grid-cols-2 gap-2">
                      <button className="pos-sec-btn" onClick={() => { setSelectedFormat('thermal58'); setPrintFormat('thermal58'); setShowThermalWidths(false); }}>{t('58mm', '58mm')}</button>
                      <button className="pos-sec-btn" onClick={() => { setSelectedFormat('thermal80'); setPrintFormat('thermal80'); setShowThermalWidths(false); }}>{t('80mm', '80mm')}</button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button className="pos-sec-btn" onClick={() => { setSelectedFormat('A5'); setPrintFormat('A5'); setShowThermalWidths(false); }}>{t('A5', 'A5')}</button>
                    <button className="pos-sec-btn" onClick={() => { setSelectedFormat('A4'); setPrintFormat('A4'); setShowThermalWidths(false); }}>{t('A4', 'A4')}</button>
                  </div>
                  {selectedFormat ? (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button className="pos-sec-btn" onClick={() => printReceipt(selectedFormat)}><i className="ri-printer-line" /> {t('प्रिन्ट गर्नुहोस्', 'Print')}</button>
                      <button className="pos-sec-btn" onClick={() => downloadReceipt(selectedFormat)}><i className="ri-download-line" /> {t('डाउनलोड', 'Download')}</button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-950 p-4 text-slate-100 shadow-xl shadow-slate-950/20">
                <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Sale Snapshot</div>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-400">Bill No</span><span className="font-semibold">{completedSale.id}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Customer</span><span className="font-semibold">{completedSale.customerName || t('अतिथि', 'Guest')}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Paid</span><span className="font-semibold">रू {Number(completedSale.amountPaid || 0).toLocaleString()}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Due</span><span className="font-semibold">रू {Number(completedSale.amountDue || 0).toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Cancel Modal */}
      {confirmCancel && (
        <div className="pos-modal-overlay">
          <div className="pos-modal">
            <h3>{t('रद्द गर्न निश्चित हुनुहुन्छ?', 'Confirm cancel & print?')}</h3>
            <p style={{ marginTop: 8 }}>{t('रद्द गर्दा अर्डर "Pending" रूपमा सहेजिनेछ र रसिद सिर्जना हुनेछ।', 'This will save the order as Pending and generate a receipt.')}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="pos-sec-btn" onClick={() => setConfirmCancel(false)}>{t('रद्द गर्नुहोस्', 'Cancel')}</button>
              <button className="pos-primary-btn" onClick={() => { handleCancelCheckout(); }}>{t('पक्का गर्नुहोस्', 'Confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
