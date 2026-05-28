// src/features/billing/components/Sidebar.tsx
import React from 'react';
import { useStepper } from '../hooks/useStepper';
import './Sidebar.css';

interface StepItem {
  key: string;
  label: string;
  icon?: string;
}

const steps: StepItem[] = [
  { key: 'items', label: 'Items', icon: '🍱' },
  { key: 'cart', label: 'Cart', icon: '🛒' },
  { key: 'checkout', label: 'Checkout', icon: '💳' },
  { key: 'receipt', label: 'Receipt', icon: '🧾' },
];

export default function Sidebar() {
  const { goTo } = useStepper();
  return (
    <nav className="sidebar">
      <ul className="sidebar-list">
        {steps.map((s) => (
          <li key={s.key} className="sidebar-item" onClick={() => goTo(s.key)}>
            <span className="sidebar-icon">{s.icon}</span>
            <span className="sidebar-label">{s.label}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
