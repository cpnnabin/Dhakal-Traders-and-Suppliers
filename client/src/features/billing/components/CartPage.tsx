// Cart step: item list, undo, and order summary
import React, { useMemo, useEffect, useState } from 'react';
import { useCart } from '../hooks/useCart';
import { useStepper } from '../hooks/useStepper';
import CartItem from './CartItem';
import ConfirmDialog from './ConfirmDialog';
import './CartPage.css';

export default function CartPage() {
  const {
    cart,
    clearCart,
    undoLast,
    undoStack,
    updateQty,
    setItemDiscount,
    removeFromCart,
  } = useCart();

  const { goTo } = useStepper();

  // Totals
  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, i) => sum + i.qty * i.rate * (1 - (i.discount ?? 0) / 100), 0);
    const discountAmt = cart.reduce((sum, i) => sum + i.qty * i.rate * ((i.discount ?? 0) / 100), 0);
    const tax = Math.round(subtotal * 0.13);
    const total = subtotal + tax;
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    return { subtotal, discountAmt, tax, total, totalQty };
  }, [cart]);

  // Toast handling
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // Pulse effect on total change
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const id = setTimeout(() => setPulse(false), 400);
    return () => clearTimeout(id);
  }, [totals.total]);

  // Clear cart confirmation
  const [showConfirm, setShowConfirm] = useState(false);
  const handleClear = () => setShowConfirm(true);
  const confirmClear = () => {
    clearCart();
    setShowConfirm(false);
  };

  // Empty state UI
  if (cart.length === 0) {
    return (
      <div className="cart-page-wrap empty-state">
        <div className="empty-icon" />
        <h2 className="empty-title">Your cart is empty</h2>
        <p className="empty-sub">Add products from the Items step.</p>
        <button className="btn continue-btn" onClick={() => goTo('items')}>← Continue Shopping</button>
      </div>
    );
  }

  return (
    <div className="cart-page-wrap">
      {/* Header */}
      <header className="cart-header">
        <h2 className="header-title">🛒 Cart Review</h2>
        <span className="badge items-badge">{cart.length} items</span>
        {undoStack.length > 0 && (
          <button className="btn undo-btn" onClick={() => { undoLast(); showToast('Last change undone'); }}>
            ↩ Undo last change
          </button>
        )}
      </header>

      {/* Toast */}
      {toast && <div className="toast success">✓ {toast}</div>}

      {/* Main grid */}
      <div className="cart-grid">
        {/* Left column */}
        <section className="cart-left">
          <div className="items-list">
            {cart.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onQtyChange={updateQty}
                onDiscountChange={setItemDiscount}
                onRemove={removeFromCart}
              />
            ))}
          </div>
          <button className="btn clear-cart" onClick={handleClear}>🗑 Clear cart</button>
        </section>

        {/* Right column – order summary */}
        <aside className="cart-right">
          <h3 className="summary-label">ORDER SUMMARY</h3>
          <div className="summary-rows">
            <div className="row"><span>Subtotal ({totals.totalQty} items)</span><span>Rs. {totals.subtotal.toFixed(2)}</span></div>
            <div className="row discount"><span>Discount</span><span>- Rs. {totals.discountAmt.toFixed(2)}</span></div>
            <div className="row"><span>VAT 13%</span><span>Rs. {totals.tax}</span></div>
            <hr className="divider" />
            <div className="row total" id="cart-total">
              <span>Total</span>
              <span className={pulse ? 'pulse' : ''}>Rs. {totals.total.toFixed(2)}</span>
            </div>
          </div>
          <div className="metric-pills">
            <div className="pill">Items: {totals.totalQty}</div>
            <div className="pill">Products: {cart.length}</div>
          </div>
          <button className="btn proceed" onClick={() => goTo('checkout')}>Proceed to Checkout →</button>
        </aside>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <ConfirmDialog
          title="Clear cart?"
          message="Remove all items from cart? This cannot be undone."
          confirmLabel="Clear"
          cancelLabel="Cancel"
          onConfirm={confirmClear}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
