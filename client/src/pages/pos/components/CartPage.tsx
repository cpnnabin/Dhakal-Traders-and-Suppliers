// src/pages/pos/components/CartPage.tsx – cleaned cart view
import React from 'react';
import { useBilling } from '../context/BillingContext';

export default function CartPage() {
  const {
    cart,
    updateQty,
    setItemDiscount,
    removeFromCart,
    setStep,
    setCart,
    showToast,
  } = useBilling();

  // Simple placeholder UI – replace with full cart UI as needed
  return (
    <div className="pos-cart-page p-4">
      <h2 className="text-xl font-bold mb-4">Cart</h2>
      {cart.length === 0 ? (
        <p>No items in cart.</p>
      ) : (
        <ul className="space-y-2">
          {cart.map((item: any) => (
            <li key={item.product.id} className="flex items-center justify-between">
              <span>{item.product.nameEn || item.product.nameNe}</span>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 bg-gray-200 rounded"
                  onClick={() => updateQty(item.product.id, -1)}
                >-</button>
                <span>{item.quantity}</span>
                <button
                  className="px-2 py-1 bg-gray-200 rounded"
                  onClick={() => updateQty(item.product.id, 1)}
                >+</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => setStep('checkout')}
        >Proceed to Checkout</button>
        <button
          className="px-4 py-2 bg-gray-300 rounded"
          onClick={() => setStep('select')}
        >Continue Shopping</button>
      </div>
    </div>
  );
}
