// src/pages/pos/components/CheckoutForm.tsx
import React from 'react';
import { useBilling } from '../context/BillingContext';

export default function CheckoutForm() {
  const {
    paymentMode,
    setPaymentMode,
    amountPaid,
    setAmountPaid,
    handleCheckout,
    checkoutLoading,
    t,
  } = useBilling();

  return (
    <div className="checkout-form">
      <h2 className="text-lg font-bold">{t('Checkout', 'Checkout')}</h2>
      <div className="mt-2">
        <label>{t('Payment Mode', 'Payment Mode')}</label>
        <select
          value={paymentMode}
          onChange={e => setPaymentMode(e.target.value)}
          className="w-full border rounded p-1"
        >
          {['Cash', 'E-Sewa', 'Khalti', 'QR', 'Credit'].map(m => (
            <option key={m} value={m}>{t(m, m)}</option>
          ))}
        </select>
      </div>
      <div className="mt-2">
        <label>{t('Amount Paid', 'Amount Paid')}</label>
        <input
          type="number"
          value={amountPaid}
          onChange={e => setAmountPaid(e.target.value)}
          className="w-full border rounded p-1"
        />
      </div>
      <button
        className="pos-primary-btn mt-3 w-full"
        disabled={checkoutLoading !== null}
        onClick={() => handleCheckout()}
      >
        {checkoutLoading ? t('Processing...', 'Processing...') : t('Complete Checkout', 'Complete Checkout')}
      </button>
    </div>
  );
}
