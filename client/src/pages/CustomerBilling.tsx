import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { usePOS } from '../pages/pos/POSContext';
import { loadLS } from '../pages/pos/posTypes';

// ─── Customer Billing Terminal ────────────────────────────────────────
// This page provides a streamlined billing flow for customers. It
// re‑uses the shared POS context for cart, products, and API calls, but
// removes any customer‑search UI – the logged‑in cashier (or guest) is
// used as the purchaser.

export default function CustomerBilling() {
  const {
    cart,
    setCart,
    sales,
    setSales,
    apiCall,
    cashier,
    t,
  } = usePOS();

  const [customer, setCustomer] = useState<any>(null);

  const [paymentMode, setPaymentMode] = useState('Cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [toast, setToast] = useState<{msg: string; type: 'ok' | 'err'} | null>(null);

  useEffect(() => {
    const stored = loadLS('dhakal_customer', null);
    if (stored) setCustomer(stored);
  }, []);

  const subtotal = cart.reduce((a, i) => a + i.product.sellingPrice * i.quantity, 0);
  const vatAmt = (subtotal * 13) / 100;
  const total = subtotal + vatAmt;

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({msg, type});
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const checkout = async () => {
    if (cart.length === 0) return showToast('Cart empty', 'err');
    const record = {
      items: cart.map(i => ({
        productId: i.product.id,
        name: i.product.nameEn,
        qty: i.quantity,
        rate: i.product.sellingPrice,
        price: i.product.sellingPrice,
        total: i.product.sellingPrice * i.quantity,
      })),
      subtotal,
      tax: vatAmt,
      total,
      paymentMode,
      cashierId: cashier?.id,
      customerId: customer?.id || customer?._id,
      customerName: customer?.name || customer?.cashier || customer?.username || 'Guest',
      customerPhone: customer?.phone || '',
      customerEmail: customer?.email || ''
    };
    const res = await apiCall('/sales', 'POST', record);
    if (res.success) {
      setSales(prev => [res.sale, ...prev]);
      setCart([]);
      setAmountReceived('');
      showToast('Sale complete! Receipt ready.', 'ok');
    } else {
      showToast('Sale failed: ' + (res.error || 'unknown'), 'err');
    }
  };

  const PAYMENT_MODES = [
    { id: 'Cash', labelNe: 'नगद', labelEn: 'Cash' },
    { id: 'Card', labelNe: 'कार्ड', labelEn: 'Card' },
    { id: 'E‑Sewa', labelNe: 'ई‑सेवा', labelEn: 'E‑Sewa' },
    { id: 'Khalti', labelNe: 'खल्ती', labelEn: 'Khalti' },
    { id: 'Credit', labelNe: 'उधारो', labelEn: 'Credit' },
  ];

  return (
    <div className="pos-bill">
      {toast && (
        <div className={`pos-bill-toast pos-bill-toast--${toast.type}`} role="status">
          <i className={toast.type === 'ok' ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'} />
          {toast.msg}
        </div>
      )}
      <section className="pos-bill-catalog">
        <h2>{t('भुक्तानी टर्मिनल', 'Billing Terminal')}</h2>
        <div className="pos-bill-lines">
          {cart.length === 0 ? (
            <p>{t('कार्ट खाली छ', 'Cart is empty')}</p>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="pos-bill-line">
                <span>{t(item.product.nameNe, item.product.nameEn)} x {item.quantity}</span>
                <span>NRS {item.product.sellingPrice * item.quantity}</span>
              </div>
            ))
          )}
          <div className="pos-bill-summary">
            <p>{t('उप‑जम्मा', 'Subtotal')}: NRS {subtotal.toFixed(2)}</p>
            <p>{t('कर', 'Tax')}: NRS {vatAmt.toFixed(2)}</p>
            <p>{t('कुल', 'Total')}: NRS {total.toFixed(2)}</p>
          </div>
        </div>
        <div className="pos-bill-pay-modes">
          {PAYMENT_MODES.map(m => (
            <button
              key={m.id}
              type="button"
              className={`pos-bill-pay-mode${paymentMode === m.id ? ' active' : ''}`}
              onClick={() => setPaymentMode(m.id)}
            >
              {t(m.labelNe, m.labelEn)}
            </button>
          ))}
        </div>
        {paymentMode === 'Cash' && (
          <div className="pos-bill-cash-tender">
            <label>{t('प्राप्त रकम (नगद)', 'Cash received')}</label>
            <input
              type="number"
              value={amountReceived}
              onChange={e => setAmountReceived(e.target.value)}
            />
            <button type="button" onClick={() => setAmountReceived(String(Math.ceil(total)))}>{t('ठ्याक्कै', 'Exact')}</button>
          </div>
        )}
        <button type="button" className="pos-bill-checkout" onClick={checkout}>{t('बिल सम्पूर्ण गर्नुहोस्', 'Complete Sale')}</button>
      </section>
    </div>
  );
}
