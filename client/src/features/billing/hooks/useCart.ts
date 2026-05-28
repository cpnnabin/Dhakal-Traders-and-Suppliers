// src/features/billing/hooks/useCart.ts
import { usePOS } from '../context/BillingContext';

export function useCart() {
  const {
    cart,
    setCart,
    undoStack,
    undoLast,
    setUndoStack,
    cartDiscount,
    setCartDiscount,
    applyTax,
    setApplyTax,
    // functions from context that we will map
    // In POSContext these are setCart, etc.
    // We'll expose wrappers matching design API
  } = usePOS();

  const clearCart = () => {
    setCart([]);
    setUndoStack([]);
    setCartDiscount(0);
    setApplyTax(true);
  };

  const updateQty = (id: string, qty: number) => {
    setCart((prev) =>
      prev.map((item) => (item.product.id === id ? { ...item, quantity: qty } : item))
    );
  };

  const setItemDiscount = (id: string, pct: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === id ? { ...item, discountPct: pct } : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setUndoStack((prev) => [...prev, { cart: JSON.parse(JSON.stringify(cart)), time: Date.now() }]);
    setCart((prev) => prev.filter((i) => i.product.id !== id));
  };

  return {
    cart,
    clearCart,
    undoStack,
    undoLast,
    updateQty,
    setItemDiscount,
    removeFromCart,
  };
}
