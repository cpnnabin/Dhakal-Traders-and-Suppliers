// src/pages/pos/components/ProductGrid.tsx
import React from 'react';
import { useBilling } from '../context/BillingContext';

export default function ProductGrid() {
  const {
    filteredProducts,
    addToCart,
    updateQty,
    cart,
    justAddedId,
    t,
  } = useBilling();

  return (
    <div className="bill-product-grid">
      {filteredProducts.map((prod) => {
        const inCart = cart.find((i) => i.product.id === prod.id);
        const outOfStock = prod.stock <= 0;
        return (
          <div
            key={prod.id}
            className={`bill-product-card ${outOfStock ? 'out-of-stock' : ''} ${inCart ? 'in-cart' : ''} ${justAddedId === prod.id ? 'just-added' : ''}`}
          >
            {justAddedId === prod.id && <div className="bill-added-flash">Added ✓</div>}
            <div className="bpc-image-wrap" onClick={() => !outOfStock && addToCart(prod)}>
              <img src={prod.imageUrl || ''} alt={t(prod.nameNe, prod.nameEn)} className="bpc-product-img" />
            </div>
            <div className="bpc-name">{t(prod.nameNe, prod.nameEn)}</div>
                    <button type="button" className="bpc-addtocart-btn" disabled={outOfStock} onClick={() => {
                      const qtyInput = document.getElementById(`qty-${prod.id}`) as HTMLInputElement;
                      const qty = parseInt(qtyInput?.value || '1', 10) || 1;
                      addToCart(prod, qty);
                    }}>
                      <i className="ri-shopping-cart-line" /> {t('Add To Cart', 'Add To Cart')}
                    </button>
            </div>
        );
      })}
    </div>
  );
}
