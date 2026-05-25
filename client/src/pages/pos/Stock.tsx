// ─── POS Page: Stock / Expiry — redirects to ProductEntry list ────────────────
// Stock is now managed from ProductEntry (combined view). This is kept for nav compatibility.
import React from 'react';
import ProductEntryPage from './ProductEntry';

export default function StockPage() {
  return <ProductEntryPage />;
}
