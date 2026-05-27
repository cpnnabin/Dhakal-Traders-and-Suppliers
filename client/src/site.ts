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

  // --- Site-wide anti-export protections ---
  // Keep protections focused on protected media so normal text copy still works.
  const downloadBlackImage = (fileName = 'dhakal-black.png') => {
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleContext = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const protectedTarget = target?.closest?.('img, canvas, .protected, .no-export, [data-protected="true"]');
    if (!protectedTarget) return;
    try { e.preventDefault(); } catch (err) {}
    downloadBlackImage('dhakal-black.png');
  };

  document.addEventListener('contextmenu', handleContext, { capture: true });
  document.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement | null;
    const protectedTarget = target?.closest?.('img, canvas, .protected, .no-export, [data-protected="true"]');
    if (!protectedTarget) return;
    try { e.preventDefault(); } catch {}
  }, { capture: true });

  // Print / screenshot defenses: add class to body to show blackout overlay during print or PrintScreen
  const setPrintBlock = (on = true) => {
    if (on) document.body.classList.add('print-block', 'protected-site');
    else document.body.classList.remove('print-block');
  };

  window.addEventListener('beforeprint', () => setPrintBlock(true));
  window.addEventListener('afterprint', () => setPrintBlock(false));

  // PrintScreen key best-effort
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'PrintScreen') {
      setPrintBlock(true);
      setTimeout(() => setPrintBlock(false), 700);
    }
  });

  // Visibility change: blur when hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.body.classList.add('blurred');
    else document.body.classList.remove('blurred');
  });
})();
