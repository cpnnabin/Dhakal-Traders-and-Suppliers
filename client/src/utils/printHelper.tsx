import React from 'react';

export type PaperSize = 'thermal' | 'a5' | 'a4';

function pageSizeCss(size: PaperSize) {
  if (size === 'thermal') return `@page { size: 80mm auto; margin: 6mm; }`;
  if (size === 'a5') return `@page { size: 148mm 210mm; margin: 10mm; }`;
  return `@page { size: 210mm 297mm; margin: 12mm; }`;
}

function layoutCss(size: PaperSize) {
  return `
  body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
  .print-root { width: 100%; max-width: 100%; box-sizing: border-box; }
  .print-meta-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .print-meta-single { display: block; }
  .print-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .print-table th, .print-table td { padding: 6px 8px; border: 1px solid #ddd; }
  .print-footer { margin-top: 12px; font-size: 13px; }
  ${size === 'thermal' ? `.print-meta { display: block; } .print-root { max-width: 80mm; margin: 0 auto; }` : `.print-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }`}
  `;
}

export async function printSection(element: HTMLElement | null, options?: { size?: PaperSize; title?: string }) {
  if (!element) return;
  const size = options?.size || 'thermal';
  const title = options?.title || document.title || 'Print';

  // Clone node to avoid layout side-effects
  const cloned = element.cloneNode(true) as HTMLElement;

  // map some known app classes to print-friendly classes
  try {
    const metas = cloned.querySelectorAll('.pos-receipt-meta, .pos-panel-header, .pos-metric-card');
    metas.forEach((el) => el.classList.add('print-meta'));
    const tables = cloned.querySelectorAll('.pos-table, .pos-receipt-table');
    tables.forEach((t) => t.classList.add('print-table'));
  } catch (e) {}

  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;

  const doc = win.document;
  doc.open();
  const style = `
    <style>
      ${pageSizeCss(size)}
      ${layoutCss(size)}
      /* hide interactive UI if present */
      .no-print, button, .pos-modal-actions { display: none !important; }
    </style>`;

  const head = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${style}</head><body>`;
  const foot = `</body></html>`;

  const wrapper = doc.createElement('div');
  wrapper.className = 'print-root';
  wrapper.appendChild(cloned);

  doc.write(head + wrapper.outerHTML + foot);
  doc.close();

  // Wait for resources/styles to load then print
  setTimeout(() => {
    try { win.focus(); win.print(); } catch (e) { console.error('Print failed', e); }
    // keep window open for user to confirm; optionally close after short delay
    // setTimeout(() => win.close(), 1000);
  }, 500);
}

export default printSection;
