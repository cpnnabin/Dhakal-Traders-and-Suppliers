import React from 'react';

export type OrderSummaryProps = {
  t: (ne: string, en: string) => string;
  subtotal: number;
  discountAmt: number;
  tax: number;
  total: number;
  applyTax: boolean;
  cart: any[];
  amountPaid: string;
  setAmountPaid: (value: string) => void;
  amountPreset: 'exact' | 'round' | 'round5' | null;
  setAmountPreset: (value: 'exact' | 'round' | 'round5' | null) => void;
  paymentMode: string;
  setPaymentMode: (value: string) => void;
  PAYMENT_MODES: Array<{ id: string; labelNe: string; labelEn: string; icon: string }>;
  onContinueShopping: () => void;
  onComplete: () => void;
  onCompleteAndPrint: () => void;
  isSubmitting: boolean;
  canComplete: boolean;
  canCompleteAndPrint: boolean;
};

export default function OrderSummary({
  t, subtotal, discountAmt, tax, total, applyTax, cart,
  amountPaid, setAmountPaid, amountPreset, setAmountPreset, paymentMode, setPaymentMode, PAYMENT_MODES,
  onContinueShopping, onComplete, onCompleteAndPrint,
  isSubmitting, canComplete, canCompleteAndPrint,
}: OrderSummaryProps) {
  const paid = Math.max(0, parseFloat(String(amountPaid || '0')) || 0);
  const due = Math.max(0, total - paid);
  const change = Math.max(0, paid - total);
  const showChange = paid >= total;

  return (
    <div className="mw-rd-wrap mw-rd-wrap--sticky" style={{ padding: 18, borderRadius: 24, color: '#e5e7eb', background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)', border: '1px solid rgba(251,191,36,.18)' }}>
      <div className="mw-layout-5" style={{ marginBottom: 10 }}>
        <h2>{t('अर्डर सारांश', 'Order Summary')}</h2>
      </div>

      <div className="mw-receipt" style={{ background: 'transparent' }}>
        <div className="mw-coupon">
          <input type="text" placeholder={t('कुपन कोड', 'Coupon Code')} />
          <button type="button" className="mw-btn-warning">{t('लागू गर्नुहोस्', 'Apply')}</button>
        </div>

        <div className="mw-summary-items">
          {cart.map((item) => (
            <div key={item.product.id} className="mw-summary-item">
              <span>{t(item.product.nameNe, item.product.nameEn)} × {item.quantity}</span>
              <span>Rs. {(item.product.sellingPrice * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="mw-summary-line">
          <span>{t('अर्डर सारांश', 'Order Summary')}</span>
          <span className="mw-value">Rs. {subtotal.toLocaleString()}</span>
        </div>
        {discountAmt > 0 && (
          <div className="mw-summary-line">
            <span>{t('छुट', 'Discount')}</span>
            <span className="mw-value" style={{ color: '#c0392b' }}>- Rs. {discountAmt.toFixed(2)}</span>
          </div>
        )}
        {applyTax && (
          <div className="mw-summary-line">
            <span>VAT 13%</span>
            <span className="mw-value">Rs. {tax.toFixed(2)}</span>
          </div>
        )}
        <div className="mw-summary-line mw-summary-total">
          <span>{t('जम्मा', 'Total')}</span>
          <span className="mw-value">Rs. {total.toLocaleString()}</span>
        </div>
      </div>

      <div className="mw-layout-5" style={{ marginTop: 18 }}>
        <h2>{t('भुक्तानी प्रकार', 'Payment Type')}</h2>
      </div>

      <div className="mw-rd-wrap" style={{ padding: 0, marginBottom: 12, background: 'transparent' }}>
        <div className="mw-form-group" style={{ marginBottom: 10 }}>
          <label className="mw-label-strong" style={{ color: '#e5e7eb' }}>{t('प्राप्त रकम', 'Amount received')}</label>
          <div style={{ display: 'grid', gap: 10 }}>
            <input
              className="mw-amount-input"
              type="number"
              min={0}
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder={String(total)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onComplete(); } }}
              style={{ width: '100%', padding: '12px 14px', fontSize: 18, borderRadius: 12, border: '1px solid rgba(148,163,184,.28)', color: '#fff', background: '#0b1220' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                <button type="button" className={`mw-quick-btn ${amountPreset === 'exact' ? 'active' : ''}`} onClick={() => { setAmountPaid(String(total)); setAmountPreset('exact'); }}>{t('Exact', 'Exact')}</button>
                <button type="button" className={`mw-quick-btn ${amountPreset === 'round' ? 'active' : ''}`} onClick={() => { setAmountPaid(String(Math.ceil(total))); setAmountPreset('round'); }}>{t('Round up', 'Round')}</button>
                <button type="button" className={`mw-quick-btn ${amountPreset === 'round5' ? 'active' : ''}`} onClick={() => { setAmountPaid(String(Math.ceil(total / 5) * 5)); setAmountPreset('round5'); }}>{t('Round 5', 'Round 5')}</button>
                <button type="button" className="mw-quick-btn" onClick={() => { setAmountPaid(String((parseFloat(amountPaid || '0') || 0) + 100)); setAmountPreset(null); }}>+100</button>
                <button type="button" className="mw-quick-btn" onClick={() => { setAmountPaid(String((parseFloat(amountPaid || '0') || 0) + 500)); setAmountPreset(null); }}>+500</button>
                <button type="button" className="mw-quick-btn" onClick={() => { setAmountPaid(String((parseFloat(amountPaid || '0') || 0) + 1000)); setAmountPreset(null); }}>+1000</button>
            </div>
          </div>
        </div>
        {paid > 0 && (
          <div className={`mw-summary-line ${showChange ? 'mw-summary-line--change' : 'mw-summary-line--due'}`}>
            <span>{showChange ? t('Change', 'Change') : t('Insufficient', 'Insufficient')}</span>
            <span className="mw-value">Rs. {(showChange ? change : due).toLocaleString()}</span>
          </div>
        )}

        <div className="mw-payment-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {PAYMENT_MODES.map((m) => (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              className={`mw-payment-option ${paymentMode === m.id ? 'active' : ''}`}
              style={{ padding: '10px 12px', minHeight: 50, borderRadius: 12, background: paymentMode === m.id ? 'rgba(251,191,36,.16)' : '#0b1220', border: '1px solid rgba(148,163,184,.28)', color: '#fff' }}
              onClick={() => setPaymentMode(m.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') setPaymentMode(m.id); }}
            >
              <div className="left">
                <i className={m.icon} />
                <span>{t(m.labelNe, m.labelEn)}</span>
              </div>
              {paymentMode === m.id ? <i className="ri-checkbox-circle-fill check" /> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mw-checkout-actions" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, alignItems: 'center' }}>
        <button type="button" className="mw-btn mw-btn-theme mw-ghost-back" onClick={onContinueShopping}>
          <i className="ri-arrow-left-line" /> {t('कार्टमा फर्कनुहोस्', 'Back to Cart')}
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <button type="button" className="pos-primary-btn large" onClick={onComplete} disabled={!canComplete || isSubmitting} title={t('Enter to complete', 'Press Enter to complete')}>
            {isSubmitting ? <i className="ri-loader-4-line bill-spin" /> : <i className="ri-check-line" />} {isSubmitting ? t('Processing…', 'Processing…') : t('बिक्री पूरा गर्नुहोस्', 'Complete Sale')}
          </button>
          <button type="button" className="pos-primary-btn large" onClick={onCompleteAndPrint} disabled={!canCompleteAndPrint || isSubmitting} title={t('Complete and print', 'Complete and print receipt')}>
            {isSubmitting ? <i className="ri-loader-4-line bill-spin" /> : <i className="ri-printer-line" />} {isSubmitting ? t('Processing…', 'Processing…') : t('भुक्तानी र प्रिन्ट', 'Pay & Print')}
          </button>
        </div>
      </div>
    </div>
  );
}
