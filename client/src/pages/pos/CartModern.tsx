// ─── POS: Modern Cart Component (Milan Wholesale Style) ──────────────────────
import React, { useMemo, useCallback, useState } from 'react';
import { usePOS } from './POSContext';

interface CartItem {
  product: {
    id: string;
    nameEn: string;
    nameNe: string;
    sellingPrice: number;
    purchasePrice: number;
    emoji: string;
    stock: number;
  };
  quantity: number;
  discountPct: number;
}

export default function CartModern() {
  const {
    cart,
    setCart,
    sales,
    setSales,
    apiCall,
    cashier,
    t,
  } = usePOS();

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  // Calculate totals
  const subtotal = cart.reduce((a, i) => a + i.product.sellingPrice * i.quantity, 0);
  const discountAmt = (subtotal * couponDiscount) / 100;
  const taxable = Math.max(0, subtotal - discountAmt);
  const tax = (taxable * 13) / 100;
  const total = taxable + tax;

  // Update quantity
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }
    const product = cart.find(i => i.product.id === productId)?.product;
    if (product && newQty > product.stock) {
      showToast(t(`स्टक: ${product.stock}`, `Stock: ${product.stock}`), 'err');
      return;
    }
    setCart(prev =>
      prev.map(i =>
        i.product.id === productId ? { ...i, quantity: newQty } : i
      )
    );
  };

  // Remove item
  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
    showToast(t('आइटम हटाइयो', 'Item removed'), 'ok');
  };

  // Apply coupon
  const applyCoupon = () => {
    // Simple coupon validation (in real app, validate against backend)
    const coupons: Record<string, number> = {
      'SAVE10': 10,
      'SAVE20': 20,
      'DHAKAL5': 5,
    };
    const discount = coupons[couponCode.toUpperCase()];
    if (discount) {
      setCouponDiscount(discount);
      showToast(t(`${discount}% छूट लागू गरियो`, `${discount}% discount applied`), 'ok');
    } else {
      showToast(t('अमान्य कुपन कोड', 'Invalid coupon code'), 'err');
    }
  };

  // Checkout
  const checkout = async () => {
    if (cart.length === 0) {
      showToast(t('कार्ट खाली छ', 'Cart is empty'), 'err');
      return;
    }

    const record = {
      id: `S-${Math.floor(1000 + Math.random() * 9000)}`,
      items: cart.map(i => ({
        name: t(i.product.nameNe, i.product.nameEn),
        qty: i.quantity,
        rate: i.product.sellingPrice,
        total: i.product.sellingPrice * i.quantity,
      })),
      subtotal,
      discount: discountAmt,
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      date: new Date().toLocaleString(),
      cashier: typeof cashier === 'object' ? (cashier.full_name || cashier.name || cashier.username || 'Cashier') : 'Cashier',
      paymentMode,
      customerId: selectedCustomer?.login_id || selectedCustomer?._id || selectedCustomer?.id || null,
      customerName: selectedCustomer?.full_name || selectedCustomer?.name || null,
      customerPhone: selectedCustomer?.phone,
    };

    const res = await apiCall('/sales', 'POST', record);
    if (res.success || res.offline) {
      setSales(prev => [res.sale || record, ...prev]);
      setCart([]);
      setCouponCode('');
      setCouponDiscount(0);
      showToast(
        res.offline
          ? t('बिक्री सुरक्षित (अफलाइन)', 'Sale saved (offline)')
          : t('बिक्री सफल!', 'Sale complete!'),
        'ok'
      );
    } else {
      showToast(t('त्रुटि: ' + res.error, 'Error: ' + res.error), 'err');
    }
  };

  return (
    <div className="cart-modern">
      {/* Toast Notification */}
      {toast && (
        <div className={`cart-toast cart-toast--${toast.type}`} role="status">
          <i className={toast.type === 'ok' ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'} />
          {toast.msg}
        </div>
      )}

      <div className="cart-container">
        {/* Left: Cart Items */}
        <div className="cart-items-section">
          <h2 className="cart-title">
            <i className="ri-shopping-cart-line" />
            {t('आपको कार्ट', 'Your Cart')}
          </h2>

          {cart.length === 0 ? (
            <div className="cart-empty">
              <i className="ri-shopping-cart-2-line" />
              <p>{t('कार्ट खाली छ', 'Your cart is empty')}</p>
              <p className="cart-empty-hint">{t('वस्तुहरू थप्नुहोस्', 'Add items to get started')}</p>
            </div>
          ) : (
            <div className="cart-items-list">
              {cart.map((item) => (
                <div key={item.product.id} className="cart-item">
                  <div className="cart-item-image">
                    <span className="cart-item-emoji">{item.product.emoji}</span>
                  </div>

                  <div className="cart-item-details">
                    <h3 className="cart-item-name">
                      {t(item.product.nameNe, item.product.nameEn)}
                    </h3>
                    <div className="cart-item-prices">
                      <span className="cart-price-current">
                        Rs. {item.product.sellingPrice}
                      </span>
                      <span className="cart-price-original">
                        Rs. {Math.round(item.product.sellingPrice * 1.1)}
                      </span>
                    </div>
                  </div>

                  <div className="cart-item-controls">
                    <button
                      className="cart-qty-btn cart-qty-minus"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      title={t('कम गर्नुहोस्', 'Decrease')}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="cart-qty-input"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                      min="1"
                      max={item.product.stock}
                    />
                    <button
                      className="cart-qty-btn cart-qty-plus"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      title={t('बढ्नुहोस्', 'Increase')}
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-item-total">
                    Rs. {(item.product.sellingPrice * item.quantity).toFixed(2)}
                  </div>

                  <button
                    className="cart-item-remove"
                    onClick={() => removeItem(item.product.id)}
                    title={t('हटाउनुहोस्', 'Remove')}
                  >
                    <i className="ri-close-line" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Order Summary (Sticky) */}
        <div className="cart-summary-section">
          <div className="cart-summary-sticky">
            <h2 className="cart-summary-title">
              {t('अर्डर सारांश', 'Order Summary')}
            </h2>

            {/* Summary Details */}
            <div className="cart-summary-details">
              <div className="cart-summary-row">
                <span>{t('उप-जम्मा', 'Subtotal')}</span>
                <span>Rs. {subtotal.toFixed(2)}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="cart-summary-row cart-summary-discount">
                  <span>{t('छूट', 'Discount')} ({couponDiscount}%)</span>
                  <span>-Rs. {discountAmt.toFixed(2)}</span>
                </div>
              )}

              <div className="cart-summary-row">
                <span>{t('कर (13%)', 'Tax (13%)')}</span>
                <span>Rs. {tax.toFixed(2)}</span>
              </div>

              <div className="cart-summary-row cart-summary-total">
                <span>{t('कुल', 'Total')}</span>
                <span>Rs. {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Coupon Section */}
            <div className="cart-coupon-section">
              <label className="cart-coupon-label">
                {t('कुपन कोड', 'Coupon Code')}
              </label>
              <div className="cart-coupon-input-group">
                <input
                  type="text"
                  className="cart-coupon-input"
                  placeholder={t('कोड दर्ता गर्नुहोस्', 'Enter code')}
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <button
                  className="cart-coupon-apply"
                  onClick={applyCoupon}
                  disabled={!couponCode.trim()}
                >
                  {t('लागू गर्नुहोस्', 'Apply')}
                </button>
              </div>
            </div>

            {/* Payment Mode */}
            <div className="cart-payment-section">
              <label className="cart-payment-label">
                {t('भुक्तानी विधि', 'Payment Method')}
              </label>
              <div className="cart-payment-modes">
                {['Cash', 'Card', 'E-Sewa', 'Khalti', 'QR'].map(mode => (
                  <button
                    key={mode}
                    className={`cart-payment-mode ${paymentMode === mode ? 'active' : ''}`}
                    onClick={() => setPaymentMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="cart-actions">
              <button
                className="cart-btn cart-btn-continue"
                onClick={() => window.history.back()}
              >
                <i className="ri-arrow-left-line" />
                {t('खरिदारी जारी राख्नुहोस्', 'Continue Shopping')}
              </button>
              <button
                className="cart-btn cart-btn-checkout"
                onClick={checkout}
                disabled={cart.length === 0}
              >
                <i className="ri-check-line" />
                {t('चेकआउट', 'Checkout')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
