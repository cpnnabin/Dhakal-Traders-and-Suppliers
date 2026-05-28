import React from 'react';
import { POSProvider, usePOS } from '../../pages/pos/POSContext';

/**
 * BillingProvider – thin wrapper around existing POSProvider.
 * Preserves all state logic, API calls, undo stack, etc.
 */
export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <POSProvider>{children}</POSProvider>;
};

/**
 * Re-export the POS context hook for convenience.
 */
export { usePOS } from '../../pages/pos/POSContext';
