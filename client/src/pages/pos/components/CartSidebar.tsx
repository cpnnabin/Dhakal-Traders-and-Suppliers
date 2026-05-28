// src/pages/pos/components/CartSidebar.tsx
import React from 'react';
import { useBilling } from '../context/BillingContext';

export default function CartSidebar() {
  const {
    cart,
    updateQty,
    paymentMode,
    setPaymentMode,
    amountPaid,
    setAmountPaid,
    handleCheckout,
    checkoutLoading,
    t,
  } = useBilling();

  // Simplified cart UI – you can expand with your original markup later.
  return (
    <div className="cart-sidebar">
      <h2 className="text-lg font-bold">{t('Cart', 'Cart')}</h2>
      {cart.length === 0 ? (
        <p>{t('Cart is empty', 'Cart is empty')}</p>
      ) : (
        <ul>
          {cart.map((item: any) => (
            <li key={item.product.id} className="flex justify-between py-1">
              <span>{t(item.product.nameNe, item.product.nameEn)}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.product.id, -1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQty(item.product.id, 1)}>+</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
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
