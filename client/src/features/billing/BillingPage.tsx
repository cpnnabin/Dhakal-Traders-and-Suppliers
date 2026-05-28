import React from 'react';
import { BillingProvider } from './context/BillingContext';
import POSStepper from './components/POSStepper';
import ProductGrid from './components/ProductGrid';
import CartPage from './components/CartPage';
import CheckoutPage from './components/CheckoutPage';
import ReceiptView from './components/ReceiptView';
import ShortcutsOverlay from './components/ShortcutsOverlay';
import ConfirmDialog from './components/ConfirmDialog';
import useStepper from './hooks/useStepper';

const BillingPage: React.FC = () => {
  const { step } = useStepper();
  return (
    <BillingProvider>
      <POSStepper />
      {step === 'items' && <ProductGrid />}
      {step === 'cart' && <CartPage />}
      {step === 'checkout' && <CheckoutPage />}
      {step === 'receipt' && <ReceiptView />}
      <ShortcutsOverlay />
      <ConfirmDialog />
    </BillingProvider>
  );
};

export default BillingPage;
