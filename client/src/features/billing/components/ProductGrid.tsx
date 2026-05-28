// src/features/billing/components/ProductGrid.tsx
import React, { useMemo } from 'react';
import ProductCard from './ProductCard';
import './ProductGrid.css';

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  // other fields as needed
}

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  // callbacks for cart actions
  onAdd: (product: Product) => void;
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
  // optional: set of product IDs already in cart
  cartIds?: Set<string>;
}

export default function ProductGrid({
  products,
  loading,
  onAdd,
  onIncrease,
  onDecrease,
  cartIds = new Set(),
}: ProductGridProps) {
  // Skeleton placeholders – match card dimensions (220px height)
  const skeletons = useMemo(() => Array.from({ length: 5 }), []);

  if (loading) {
    return (
      <div className="product-grid">
        {skeletons.map((_, i) => (
          <div key={i} className="product-card skeleton" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="empty-grid">
        <div className="empty-icon" />
        <h2>No products found</h2>
        <p>Try a different category</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((p, idx) => (
        <ProductCard
          key={p.id}
          product={p}
          shortcut={idx < 9 ? idx + 1 : undefined}
          inCart={cartIds.has(p.id)}
          onAdd={() => onAdd(p)}
          onIncrease={() => onIncrease(p.id)}
          onDecrease={() => onDecrease(p.id)}
        />
      ))}
    </div>
  );
}
