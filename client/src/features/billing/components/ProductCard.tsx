// src/features/billing/components/ProductCard.tsx
import React, { useState } from 'react';
import './ProductCard.css';

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  qty: number; // stock quantity
}

type Props = {
  product: Product;
  shortcut?: number; // 1-9 badge
  inCart: boolean;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
};

export default React.memo(function ProductCard({
  product,
  shortcut,
  inCart,
  onAdd,
  onIncrease,
  onDecrease,
}: Props) {
  const [imgError, setImgError] = useState(false);

  const initials = product.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Stock badge logic
  let stockBadge = null;
  if (product.qty === 0) {
    stockBadge = (
      <div className="stock-badge out-of-stock">Out of Stock</div>
    );
  } else if (product.qty < 10) {
    stockBadge = (
      <div className="stock-badge low-stock">Low Stock {product.qty} left</div>
    );
  }

  return (
    <div className={`product-card ${inCart ? 'in-cart' : ''} ${stockBadge ? 'has-badge' : ''}`}>
      {shortcut && shortcut <= 9 && (
        <div className="shortcut-badge">{shortcut}</div>
      )}
      {stockBadge}
      {imgError ? (
        <div className="img-fallback">{initials}</div>
      ) : (
        <img
          loading="lazy"
          src={product.image}
          alt={product.name}
          onError={e => {
            setImgError(true);
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <div className="card-body">
        <h3 className="product-name" title={product.name}>{product.name}</h3>
        <div className="price">Rs. {product.price.toFixed(2)}</div>
        {inCart ? (
          <div className="qty-controls">
            <button className="decr" onClick={onDecrease}>−</button>
            <span className="qty">1</span>
            <button className="incr" onClick={onIncrease}>+</button>
          </div>
        ) : (
          <button
            className="add-btn"
            disabled={product.qty === 0}
            onClick={onAdd}
          >
            + Add
          </button>
        )}
      </div>
    </div>
  );
});
