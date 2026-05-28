// src/pages/pos/components/ReceiptView.tsx
import React, { Suspense } from 'react';
import { useBilling } from '../context/BillingContext';

export default function ReceiptView() {
  const { completedSale, t } = useBilling();

  if (!completedSale) return null;

  return (
    <div className="receipt-view">
      {/* Simplified receipt – replace with full markup as needed */}
      <h2 className="text-lg font-bold">{t('Receipt', 'Receipt')}</h2>
      <p>{t('Bill No', 'Bill No')}: {completedSale.id}</p>
      <p>{t('Customer', 'Customer')}: {completedSale.customerName || t('Guest', 'Guest')}</p>
      <p>{t('Total', 'Total')}: {completedSale.total?.toLocaleString()}</p>
    </div>
  );
}
