// src/pages/pos/components/ProductPage.tsx
import React from 'react';
import { useBilling } from '../context/BillingContext';
import StepIndicator from './StepIndicator';
import CategoryFilter from './CategoryFilter';
import ProductGrid from './ProductGrid';

export default function ProductPage() {
  return (
    <>
      <StepIndicator />
      <CategoryFilter />
      <ProductGrid />
    </>
  );
}
