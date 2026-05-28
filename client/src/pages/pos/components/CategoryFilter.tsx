import React, { useMemo } from 'react';
import { useBilling } from '../context/BillingContext';
import { CATS } from "../posTypes";

export default function CategoryFilter() {
  const { activeCat, setActiveCat, t } = useBilling();
  const categories = useMemo(() => CATS, []);
  return (
    <div className="pos-category-filter">
      {CATS.map((cat: string) => (
        <button
          key={cat}
          className={`cat-pill ${activeCat === cat ? 'active' : ''}`}
          onClick={() => setActiveCat(cat)}
        >
          {t(cat, cat)}
        </button>
      ))}
    </div>
  );
}
