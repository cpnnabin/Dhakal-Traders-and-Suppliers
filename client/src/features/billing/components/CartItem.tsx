// src/features/billing/components/CartItem.tsx
import React from 'react';
import './CartItem.css';

// Simple type for a cart item – aligns with the shape used in CartPage

// Simple type for a cart item – aligns with the shape used in CartPage
interface CartItemProps {
  item: {
    id: string;
    sn?: number;
    name: string;
    qty: number;
    rate: number;
    amount?: number;
    discount?: number;
    hsCode?: string;
    image?: string;
  };
  onQtyChange: (id: string, newQty: number) => void;
  onDiscountChange: (id: string, newDiscount: number) => void;
  onRemove: (id: string) => void;
}

export default function CartItem({ item, onQtyChange, onDiscountChange, onRemove }: CartItemProps) {
  const handleQty = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(1, parseInt(e.target.value) || 1);
    onQtyChange(item.id, val);
  };

  const handleDiscount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
    onDiscountChange(item.id, val);
  };

  const subtotal = (item.qty * item.rate * (1 - (item.discount ?? 0) / 100)).toFixed(2);

  // Updated CartItem with image wrapper
return (
  <div className="cart-item">
    {/* Image wrapper */}
    <div className="img-wrapper">
      {item.image ? (
        <img
          loading="lazy"
          src={item.image}
          alt={item.name}
  return (
    <div className="cart-item">
      {/* Image wrapper */}
      <div className="img-wrapper">
        {item.image ? (
          <img
            loading="lazy"
            src={item.image}
            alt={item.name}
            onError={e => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="img-fallback">
            {item.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="item-info">
        <span className="item-name">{item.name}</span>
        {item.hsCode && <span className="item-hs">HS: {item.hsCode}</span>}
      </div>
      <div className="item-controls">
        <input
          type="number"
          min={1}
          className="qty-input"
          value={item.qty}
          onChange={handleQty}
          title="Quantity"
        />
        <input
          type="number"
          min={0}
          max={100}
          className="discount-input"
          value={item.discount ?? 0}
          onChange={handleDiscount}
          title="% Discount"
        />
        <span className="item-amount">Rs. {subtotal}</span>
        <button className="remove-btn" onClick={() => onRemove(item.id)} title="Remove">
          ✕
        </button>
      </div>
    </div>
  );
}
