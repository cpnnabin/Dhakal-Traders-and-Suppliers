import React from 'react';
import { useBilling } from '../context/BillingContext';

export default function StepIndicator() {
  const { step, setStep, t } = useBilling();
  const steps: { key: 'select' | 'cart' | 'checkout' | 'receipt', icon: string, label: string }[] = [
    { key: 'select', icon: 'ri-apps-2-line', label: t('सामान छान्नुहोस्', 'Select Items') },
    { key: 'cart', icon: 'ri-shopping-cart-2-line', label: t('कार्ट', 'Cart') },
    { key: 'checkout', icon: 'ri-secure-payment-line', label: t('चेकआउट', 'Checkout') },
    { key: 'receipt', icon: 'ri-file-paper-line', label: t('रसिद', 'Receipt') },
  ];
  return (
    <div className="pos-step-indicator">
      {steps.map(s => (
        <button
          key={s.key}
          className={`step-pill ${step === s.key ? 'active' : ''}`}
          onClick={() => setStep(s.key)}
        >
          <i className={s.icon}></i> {s.label}
        </button>
      ))}
    </div>
  );
}
