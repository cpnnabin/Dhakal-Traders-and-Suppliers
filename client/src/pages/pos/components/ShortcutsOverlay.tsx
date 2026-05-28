// src/pages/pos/components/ShortcutsOverlay.tsx
import React from 'react';
import { useBilling } from '../context/BillingContext';

export default function ShortcutsOverlay() {
  const { showShortcuts, setShowShortcuts } = useBilling();
  // Placeholder: implement actual shortcuts UI later
  if (!showShortcuts) return null;
  return (
    <div className="shortcuts-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow">
        <h3>Shortcuts</h3>
        <button onClick={() => setShowShortcuts(false)}>Close</button>
      </div>
    </div>
  );
}
