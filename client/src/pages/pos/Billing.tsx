// ─── POS Page: Billing Terminal — Product Grid → Cart → Checkout → Receipt ─────
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { usePOS } from './POSContext';

const PAYMENT_MODES = [
  { id: 'Cash',    labelNe: 'नगद',   labelEn: 'Cash',   icon: 'ri-money-dollar-box-line' },
  { id: 'Card',    labelNe: 'कार्ड', labelEn: 'Card',   icon: 'ri-bank-card-line' },
  { id: 'E-Sewa',  labelNe: 'ई-सेवा',labelEn: 'E-Sewa', icon: 'ri-smartphone-line' },
  { id: 'Khalti',  labelNe: 'खल्ती', labelEn: 'Khalti', icon: 'ri-wallet-3-line' },
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

  function printReceipt(format: 'thermal58'|'thermal80'|'A4'|'A5') {
    try {
      const receiptEl = document.querySelector('.bill-receipt');
      if (!receiptEl) { alert(t('रसिद फेला परेन।', 'Receipt not found.')); return; }
      const html = receiptEl.outerHTML;
      let pageSize = '80mm auto';
      if (format === 'thermal58') pageSize = '58mm auto';
      if (format === 'thermal80') pageSize = '80mm auto';
      if (format === 'A4') pageSize = 'A4 portrait';
      if (format === 'A5') pageSize = 'A5 portrait';

      // Build format-specific print styles — improved layout: centered header, monospace, dashed separators
      let baseStyles = `
        @page { size: ${pageSize}; margin: 6mm; }
        html, body { margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; color: #000; background: #fff; -webkit-print-color-adjust: exact; }
        .bill-receipt { background: #fff; color: #000; box-sizing: border-box; margin: 0 auto; }
        .bill-receipt, .bill-receipt * { color: #000 !important; }
        .receipt-header { text-align: center; margin-bottom: 6px; }
        .receipt-header h2 { margin: 0; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
        .receipt-meta { text-align: center; font-size: 11px; margin: 4px 0; }
        .receipt-items { width: 100%; border-collapse: collapse; font-size: 11px; }
        .receipt-items th, .receipt-items td { padding: 4px 6px; vertical-align: top; }
        .receipt-items th:nth-child(1), .receipt-items td:nth-child(1) { text-align: left; }
        .receipt-items th:nth-child(4), .receipt-items td:nth-child(4) { text-align: right; }
        .receipt-divider { width: 100%; border-top: 1px dashed #000; margin: 6px 0; color: #000 !important; }
        .receipt-footer { text-align: center; font-size: 11px; margin-top: 8px; }
        .in-words { font-size: 11px; margin-top: 6px; }
        .receipt-actions, .pos-modal-actions, .bill-float-btn { display: none !important; }
      `;

      let formatStyles = '';
      if (format === 'thermal58' || format === 'thermal80') {
        const width = format === 'thermal58' ? '58mm' : '80mm';
        formatStyles = `
          .bill-receipt { max-width: ${width} !important; width: ${width} !important; padding: 6px !important; font-size: 11px !important; }
          .receipt-header h2 { font-size: 14px !important; }
          .receipt-items th, .receipt-items td { font-size: 11px !important; }
          .rt-total { font-size: 12px !important; }
          .receipt-items th:nth-child(1), .receipt-items td:nth-child(1) { width: 50%; }
          .receipt-items th:nth-child(2), .receipt-items td:nth-child(2) { width: 15%; }
          .receipt-items th:nth-child(3), .receipt-items td:nth-child(3) { width: 15%; }
          .receipt-items th:nth-child(4), .receipt-items td:nth-child(4) { width: 20%; text-align: right; }
        `;
      } else if (format === 'A5') {
        formatStyles = `
          .bill-receipt { max-width: 148mm !important; width: 148mm !important; padding: 10px !important; font-size: 12px !important; }
          .receipt-items th, .receipt-items td { font-size: 12px !important; }
          .rt-total { font-size: 14px !important; }
        `;
      } else { // A4
        formatStyles = `
          .bill-receipt { max-width: 210mm !important; width: 180mm !important; padding: 12px !important; font-size: 13px !important; }
          .receipt-items th, .receipt-items td { font-size: 13px !important; }
          .rt-total { font-size: 16px !important; }
        `;
      }

      const styles = `<style>${baseStyles}\n${formatStyles}</style>`;

      const win = window.open('', '_blank', 'noopener,noreferrer');
      if (win) {
        win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title>${styles}</head><body>${html}<script>setTimeout(()=>{window.print();window.onafterprint=function(){setTimeout(()=>window.close(),200);}},250);</script></body></html>`);
        win.document.close();
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

  // Local parties for customer lookup
  const [parties, setParties] = React.useState<any[]>(() => {
    try { const r = localStorage.getItem('dt_pos_parties'); return r ? JSON.parse(r) : []; } catch { return []; }
  });

  // step: 'select' | 'cart' | 'checkout' | 'receipt'
  const [step, setStep] = React.useState<'select' | 'cart' | 'checkout' | 'receipt'>('select');
  const [scanQuery, setScanQuery] = React.useState('');
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [customerDropdown, setCustomerDropdown] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);
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

  // All customers from parties + API customers
  const allCustomers = useMemo(() => {
    const fromParties = parties.filter((p: any) => p.type === 'customer');
    const fromAPI = (customers || []).filter((c: any) => !fromParties.find((p: any) => p.id === c._id));
    return [...fromParties, ...fromAPI.map((c: any) => ({ ...c, id: c._id }))];
  }, [parties, customers]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    return q ? allCustomers.filter((c: any) => c.name?.toLowerCase().includes(q) || (c.phone || '').includes(q)) : allCustomers.slice(0, 8);
  }, [allCustomers, customerSearch]);

  const addToCart = (prod: any, qty = 1) => {
    if (prod.stock <= 0) { showToast(t('स्टक खाली छ!', 'Out of stock!'), 'err'); return; }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === prod.id);
      if (existing) return prev.map(i => i.product.id === prod.id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { product: prod, quantity: qty, discountPct: 0 }];
    });
    showToast(`${t(prod.nameNe, prod.nameEn)} ${t('कार्टमा थपियो', 'added to cart')}`, 'ok');
    setScanQuery('');
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
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, discountPct: Math.max(0, Math.min(100, pct)) } : i));
  };

  // --- Checkout ---
  const handleCheckout = async () => {
    const record: any = {
      id: `S-${Date.now().toString().slice(-6)}`,
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
      cashier: cashier?.name || 'Cashier',
      paymentMode,
      status: 'completed',
      customerName: selectedCustomer?.name || customerSearch || 'Walk-in',
      customerId: selectedCustomer?.id || selectedCustomer?._id,
      customerPhone: selectedCustomer?.phone || '',
    };

    // Update stock locally
    const updatedProducts = products.map(p => {
      const cartItem = cart.find(i => i.product.id === p.id);
      return cartItem ? { ...p, stock: Math.max(0, p.stock - cartItem.quantity) } : p;
    });
    setProducts(updatedProducts);
    localStorage.setItem('dt_pos_products', JSON.stringify(updatedProducts));

    const res = await apiCall('/sales', 'POST', record);
    if (res.success) {
      setSales(prev => [res.sale || record, ...prev]);
      setReceiptData(res.sale || record);
      setCompletedSale(res.sale || record);
      setCart([]);
      setStep('receipt');
      setAmountPaid('');
      setDiscount(0);
      setCustomerSearch('');
      setSelectedCustomer(null);
    } else {
      // Offline mode — save locally
      setSales(prev => [record, ...prev]);
      setReceiptData(record);
      setCompletedSale(record);
      setCart([]);
      setStep('receipt');
      setAmountPaid('');
      setDiscount(0);
      setCustomerSearch('');
      setSelectedCustomer(null);
    }
  };

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

  return (
    <div className="bill-wrap">
      {toast && <div className={`pos-bill-toast pos-bill-toast--${toast.type}`}><i className={toast.type === 'ok' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} /> {toast.msg}</div>}

      {/* Step progress bar */}
      <div className="bill-steps-bar">
        {steps.map((s, i) => (
          <div key={s.key} className={`bill-step ${i <= stepIdx ? 'done' : ''} ${s.key === step ? 'active' : ''}`}>
            <div className="bill-step-icon"><i className={s.icon} /></div>
            <span className="bill-step-label">{s.label}</span>
            {i < steps.length - 1 && <div className="bill-step-line" />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Product Selection ── */}
      {step === 'select' && (
        <div className="bill-select">
          <div className="bill-select-top">
            <div className="bill-search-wrap">
              <i className="ri-barcode-box-line" />
              <input ref={scanRef} className="bill-search" type="text" placeholder={t('बारकोड स्क्यान / नाम खोज्नुहोस्...', 'Scan barcode or search product...')} value={scanQuery} onChange={e => setScanQuery(e.target.value)} />
              {scanQuery && <button className="bill-search-clear" onClick={() => setScanQuery('')}><i className="ri-close-line" /></button>}
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
              <div className="bill-empty"><i className="ri-inbox-line" /><p>{t('कुनै सामान भेटिएन', 'No products found')}</p></div>
            )}
            {filteredProducts.map(prod => {
              const inCart = cart.find(i => i.product.id === prod.id);
              const outOfStock = prod.stock <= 0;
              return (
                <div
                  key={prod.id}
                  className={`bill-product-card ${outOfStock ? 'out-of-stock' : ''} ${inCart ? 'in-cart' : ''}`}
                  onClick={() => !outOfStock && addToCart(prod)}
                >
                    <div className="bpc-top">
                      <div className="bpc-emoji">{prod.emoji}</div>
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
        </div>
      )}

      {/* ── STEP 2: Cart Review ── */}
      {step === 'cart' && (
        <div className="bill-cart">
          <div className="bill-cart-header">
            <button className="bill-back-btn" onClick={() => setStep('select')}><i className="ri-arrow-left-line" /> {t('थप सामान थप्नुहोस्', 'Add More Items')}</button>
            <h2><i className="ri-shopping-cart-2-line" /> {t('कार्ट समीक्षा', 'Cart Review')}</h2>
          </div>

          {cart.length === 0 ? (
            <div className="bill-empty"><i className="ri-shopping-cart-line" /><p>{t('कार्ट खाली छ', 'Cart is empty')}</p><button className="pos-primary-btn" onClick={() => setStep('select')}>{t('सामान थप्नुहोस्', 'Add Products')}</button></div>
          ) : (
            <>
              <div className="bill-cart-items">
                {cart.map(item => (
                  <div key={item.product.id} className="bill-cart-row">
                    <div className="bcr-emoji">{item.product.emoji}</div>
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
                    <button className="bcr-remove" onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))}><i className="ri-delete-bin-line" /></button>
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
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STEP 3: Checkout ── */}
      {step === 'checkout' && (
        <div className="bill-checkout">
            <button className="bill-back-btn" onClick={() => setStep('cart')}><i className="ri-arrow-left-line" /> {t('कार्टमा फर्कनुहोस्', 'Back to Cart')}</button>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}><i className="ri-secure-payment-line" /> {t('भुक्तानी', 'Payment')}</h2>
              <div className="muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
                <div><strong>{t('AD', 'AD')}:</strong> {new Date().toLocaleString()}</div>
                <div><strong>{t('BS', 'BS')}:</strong> {pendingNepaliDate || formatMiti(new Date().toISOString())}</div>
              </div>
            </div>

          <div className="bill-checkout-grid">
            {/* Customer Section */}
            <div className="bill-co-section">
              <h3><i className="ri-user-line" /> {t('ग्राहक (ऐच्छिक)', 'Customer (Optional)')}</h3>
              <div className="customer-search-wrap">
                <i className="ri-search-line" />
                <input
                  type="text"
                  className="pos-form-input"
                  placeholder={t('ग्राहक खोज्नुहोस् वा नाम टाइप गर्नुहोस्...', 'Search customer or type name...')}
                  value={selectedCustomer ? selectedCustomer.name : customerSearch}
                  onFocus={() => { setCustomerDropdown(true); if (selectedCustomer) { setCustomerSearch(selectedCustomer.name); setSelectedCustomer(null); } }}
                  onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setCustomerDropdown(true); }}
                />
                {selectedCustomer && <button className="pos-sec-btn" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}><i className="ri-close-line" /></button>}
              </div>
              {customerDropdown && !selectedCustomer && (
                <div className="customer-dropdown">
                  {filteredCustomers.map((c: any) => (
                    <div key={c.id || c._id} className="customer-dd-row" onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerDropdown(false); }}>
                      <div className="cdr-avatar">{c.name?.[0]}</div>
                      <div>
                        <strong>{c.name}</strong>
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
                  <div className="scc-avatar">{selectedCustomer.name[0]}</div>
                  <div>
                    <strong>{selectedCustomer.name}</strong>
                    {selectedCustomer.phone && <div className="scc-sub"><i className="ri-phone-line" /> {selectedCustomer.phone}</div>}
                    {selectedCustomer.address && <div className="scc-sub"><i className="ri-map-pin-line" /> {selectedCustomer.address}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Section */}
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
              <div className="pos-input-group" style={{ marginTop: 16 }}>
                <label>{t('प्राप्त रकम (रू)', 'Amount Received (NRS)')}</label>
                <input type="number" className="pos-form-input large" placeholder={`0.00 (${t('कुल', 'Total')}: ${total.toFixed(2)})`} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} autoFocus />
              </div>
              {paid > 0 && paid >= total && <div className="bill-change-display green"><i className="ri-money-dollar-circle-line" /> {t('फिर्ता रकम', 'Change')}: रू {change.toFixed(2)}</div>}
              {due > 0 && paid > 0 && <div className="bill-change-display red"><i className="ri-error-warning-line" /> {t('बाँकी रकम', 'Amount Due')}: रू {due.toFixed(2)}</div>}
            </div>

            {/* Order Summary */}
            <div className="bill-co-section full-width">
              <h3><i className="ri-file-list-3-line" /> {t('अर्डर सारांश', 'Order Summary')}</h3>
              <div className="bill-co-items">
                {cart.map(i => (
                  <div key={i.product.id} className="bill-co-item">
                    <span>{i.product.emoji} {t(i.product.nameNe, i.product.nameEn)}</span>
                    <span>{i.quantity} × रू {i.product.sellingPrice}</span>
                    <span>रू {(i.product.sellingPrice * i.quantity * (1 - i.discountPct / 100)).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="bill-co-totals">
                {/* Show paid / remaining / change above Grand Total */}
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
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Receipt ── */}
      {step === 'receipt' && completedSale && (
        <div className="bill-receipt-wrap">
          <div className="bill-receipt">
            <div className="receipt-header">
              <div className="receipt-logo">🏪</div>
              <h2>ढकाल ट्रेडर्स</h2>
              <p>Dhakal Traders & Suppliers</p>
              <p>Since 2062 B.S. · सल्यान, नेपाल</p>
            </div>
            <div className="receipt-divider">{'- '.repeat(22)}</div>
            <div className="receipt-meta">
              <div><strong>{t('रसिद नं', 'Bill No')}:</strong> {completedSale.id}</div>
              <div><strong>{t('मिति', 'Date')}:</strong> {completedSale.date}</div>
              <div><strong>{t('मिति (मिति)', 'Miti')}:</strong> {nepaliDate || formatMiti(completedSale.date)}</div>
              <div><strong>{t('नाम', 'Name')}:</strong> {completedSale.customerName || t('अतिथि', 'Guest')}</div>
              {completedSale.customerAddress && <div><strong>{t('ठेगाना', 'Address')}:</strong> {completedSale.customerAddress}</div>}
              {completedSale.customerPhone && <div><strong>{t('मोबाइल नं', 'MOB No')}:</strong> {completedSale.customerPhone}</div>}
              {completedSale.customerPan && <div><strong>{t('प्यान नं', 'PAN No')}:</strong> {completedSale.customerPan}</div>}
              <div><strong>{t('भुक्तानी', 'Payment mode')}:</strong> {completedSale.paymentMode || paymentMode}</div>
              {completedSale.note && <div><strong>{t('सन्देश', 'Message')}:</strong> {completedSale.note}</div>}
            </div>
            <div className="receipt-divider">{'- '.repeat(22)}</div>
            <table className="receipt-items">
              <thead>
                <tr>
                  <th>{t('क्र.सं.', 'SN')}</th>
                  <th>{t('विवरण', 'Particular')}</th>
                  <th>{t('मात्रा', 'Qty')}</th>
                  <th>{t('दर', 'Rate')}</th>
                  <th>{t('रकम', 'Amount')}</th>
                </tr>
              </thead>
              <tbody>
                {completedSale.items?.map((item: any, i: number) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{item.name}</td>
                    <td>{item.qty} {item.unit || ''}</td>
                    <td>रू {item.rate?.toFixed?.(2) ?? item.rate}</td>
                    <td style={{ textAlign: 'right' }}>रू {item.total?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="receipt-divider">{'- '.repeat(22)}</div>
            <div className="receipt-totals">
              <div className="rt-row"><span>{t('ग्रॉस रकम', 'Gross Amount')}</span><span>रू {completedSale.subtotal?.toFixed(2)}</span></div>
              {completedSale.tax > 0 && <div className="rt-row"><span>{t('भ्याट (13%)', 'VAT (13%)')}</span><span>रू {completedSale.tax?.toFixed(2)}</span></div>}
              <div className="rt-total"><span><strong>{t('कुल जम्मा', 'Net Amount')}</strong></span><span><strong>रू {completedSale.total?.toFixed(2)}</strong></span></div>
              <div className="rt-row"><span>{t('भुक्तानी', 'Paid')}</span><span>रू {completedSale.amountPaid?.toFixed(2)}</span></div>
              {completedSale.amountPaid > (completedSale.total ?? 0) && (
                <div className="rt-row green"><span>{t('फिर्ता रकम', 'Change')}</span><span>रू {(completedSale.amountPaid - (completedSale.total ?? 0)).toFixed(2)}</span></div>
              )}
              {completedSale.amountDue > 0 && <div className="rt-row red"><span>{t('बाँकी', 'Due')}</span><span>रू {completedSale.amountDue?.toFixed(2)}</span></div>}
            </div>

            <div style={{ marginTop: 6 }}><strong>{t('रुपी शब्दमा', 'In words')}:</strong> Rs. {numberToWords(Math.round(completedSale.total || 0))} {t('मात्र', 'Only')}</div>
            <div className="receipt-divider">{'= '.repeat(22)}</div>
            <div className="receipt-footer">
              <div className="receipt-thanks">🙏 {t('खरिद गर्नुभएकोमा धन्यवाद!', 'Thank you for your purchase!')}</div>
              <p>{t('फेरि आउनुहोस्', 'Please visit again')}</p>
              <p style={{ fontSize: 10, marginTop: 8 }}>Powered by SmartBiz ERP</p>
            </div>
          </div>

            <div className="receipt-actions">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="pos-sec-btn" onClick={() => { setShowThermalWidths(s => !s); setSelectedFormat(null); }}><i className="ri-temperature-line" /> {t('Thermal', 'Thermal')}</button>
              {showThermalWidths && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="pos-sec-btn" onClick={() => { setSelectedFormat('thermal58'); setPrintFormat('thermal58'); setShowThermalWidths(false); }}>{t('58mm', '58mm')}</button>
                  <button className="pos-sec-btn" onClick={() => { setSelectedFormat('thermal80'); setPrintFormat('thermal80'); setShowThermalWidths(false); }}>{t('80mm', '80mm')}</button>
                </div>
              )}

              <button className="pos-sec-btn" onClick={() => { setSelectedFormat('A5'); setPrintFormat('A5'); setShowThermalWidths(false); }}>{t('A5', 'A5')}</button>
              <button className="pos-sec-btn" onClick={() => { setSelectedFormat('A4'); setPrintFormat('A4'); setShowThermalWidths(false); }}>{t('A4', 'A4')}</button>

              {/* show print/download only after user selects a format */}
              {selectedFormat && (
                <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
                  <button className="pos-sec-btn" onClick={() => printReceipt(selectedFormat)}><i className="ri-printer-line" /> {t('प्रिन्ट गर्नुहोस्', 'Print')}</button>
                  <button className="pos-sec-btn" onClick={() => downloadReceipt(selectedFormat)}><i className="ri-download-line" /> {t('डाउनलोड', 'Download')}</button>
                  <button className="pos-sec-btn" onClick={() => setSelectedFormat(null)}>✕</button>
                </div>
              )}
            </div>
            <button className="pos-primary-btn large" onClick={resetBilling}>
              <i className="ri-add-circle-line" /> {t('नयाँ बिक्री सुरु गर्नुहोस्', 'Start New Sale')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
