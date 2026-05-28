// src/features/billing/hooks/useStepper.ts
import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export type Step = 'items' | 'cart' | 'checkout' | 'receipt';

// Simple step manager – syncs with URL query ?step=... for direct linking.
export function useStepper(initialStep: Step = 'items'): {
  step: Step;
  goTo: (next: Step) => void;
  next: () => void;
  prev: () => void;
} {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const urlStep = params.get('step') as Step | null;
  const [step, setStep] = useState<Step>(urlStep || initialStep);

  const sync = useCallback((newStep: Step) => {
    setStep(newStep);
    params.set('step', newStep);
    navigate({ search: params.toString() }, { replace: true });
  }, [navigate, params]);

  const goTo = useCallback((next: Step) => sync(next), [sync]);
  const next = useCallback(() => {
    const order: Step[] = ['items', 'cart', 'checkout', 'receipt'];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) sync(order[idx + 1]);
  }, [step, sync]);
  const prev = useCallback(() => {
    const order: Step[] = ['items', 'cart', 'checkout', 'receipt'];
    const idx = order.indexOf(step);
    if (idx > 0) sync(order[idx - 1]);
  }, [step, sync]);

  // Keep URL in sync on mount (in case user navigated directly)
  useEffect(() => {
    if (!urlStep) {
      params.set('step', step);
      navigate({ search: params.toString() }, { replace: true });
    }
  }, []);

  return { step, goTo, next, prev };
}
