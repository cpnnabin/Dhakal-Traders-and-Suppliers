/**
 * site.ts — DOM utilities that work alongside React.
 * Handles: scroll-based nav, back-to-top, language DOM sync.
 */
(() => {
  'use strict';

  // Expose switchLang for React to call (updates DOM data-ne/data-en elements)
  (window as any).switchLang = (lang: 'ne' | 'en') => {
    document.querySelectorAll<HTMLElement>('[data-ne][data-en]').forEach((el) => {
      const text = el.getAttribute(`data-${lang}`);
      if (text) el.innerHTML = text;
    });
    document.querySelectorAll<HTMLInputElement>('[data-ph-ne][data-ph-en]').forEach((el) => {
      const ph = el.getAttribute(`data-ph-${lang}`);
      if (ph != null) el.placeholder = ph;
    });
    try { localStorage.setItem('dhakal-lang', lang); } catch { /* ignore */ }
  };

  // Scroll: back-to-top button visibility
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const backTop = document.getElementById('backTop') as HTMLButtonElement | null;
      if (backTop) backTop.style.opacity = window.scrollY > 300 ? '1' : '0';
      ticking = false;
    });
  }, { passive: true });

  // Smooth anchor scrolling (for links not handled by React)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
    if (!anchor) return;
    const id = anchor.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
})();
