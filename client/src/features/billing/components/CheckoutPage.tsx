// src/features/billing/components/CheckoutPage.tsx
import React, { useState, useMemo } from 'react';
import { usePOS } from '../../pages/pos/POSContext';
import CustomerSection from './CustomerSection';
import PaymentSection from './PaymentSection';
import CheckoutActions from './CheckoutActions';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const {
    cart,
    cartDiscount,
    setCartDiscount,
    products,
    customers,
    setCustomers,
    apiCall,
    t,
  } = usePOS();

  // Compute subtotal (pre‑discount)
  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [cart]
  );

  const discountAmt = (subtotal * (cartDiscount ?? 0)) / 100;
  const subAfterDiscount = subtotal - discountAmt;
  const [applyVAT, setApplyVAT] = useState(true);
  const tax = applyVAT ? Math.round(subAfterDiscount * 0.13) : 0;
  const total = subAfterDiscount + tax;

  const [amountPaid, setAmountPaid] = useState(0);
  const changeDue = amountPaid - total;

  const handlePreset = (type: string) => {
    switch (type) {
      case 'exact':
        setAmountPaid(total);
        break;
      case 'round':
        setAmountPaid(Math.ceil(total));
        break;
      case 'round5':
        setAmountPaid(Math.ceil(total / 5) * 5);
        break;
      case '+100':
        setAmountPaid((prev) => prev + 100);
        break;
      case '+500':
        setAmountPaid((prev) => prev + 500);
        break;
      case '+1000':
        setAmountPaid((prev) => prev + 1000);
        break;
    }
  };

  const canComplete = amountPaid >= total && cart.length > 0;

  const handleCompleteSale = async () => {
    if (!canComplete) return;
    // Build sale payload (simplified)
    const payload = {
      items: cart.map((c) => ({
        productId: c.product.id,
        qty: c.quantity,
        price: c.product.price,
        discount: c.discountPct ?? 0,
      })),
      subtotal,
      discountPct: cartDiscount,
      discountAmt,
      tax,
      total,
      customer: customers[0] || null, // placeholder – real UI would pick
    };
    await apiCall('/sales', 'POST', payload);
    // TODO: clear cart, navigate back, show receipt printing etc.
  };

  return (
    <div className="checkout-page">
      <h2 className="page-title">Checkout</h2>
      <div className="checkout-grid">
        <CustomerSection />
        <PaymentSection
          total={total}
          amountPaid={amountPaid}
          setAmountPaid={setAmountPaid}
          changeDue={changeDue}
          applyVAT={applyVAT}
          setApplyVAT={setApplyVAT}
          cartDiscount={cartDiscount}
          setCartDiscount={setCartDiscount}
          onPreset={handlePreset}
        />
      </div>
      <CheckoutActions
        canComplete={canComplete}
        onComplete={handleCompleteSale}
        amountPaid={amountPaid}
        total={total}
      />
    </div>
  );
}
