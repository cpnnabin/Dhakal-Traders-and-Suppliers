import React from 'react';

export type PaperSize = 'thermal' | 'thermal58' | 'thermal80' | 'a5' | 'a4';

function pageSizeCss(size: PaperSize) {
  if (size === 'thermal58') return `@page { size: 58mm auto; margin: 6mm; }`;
  if (size === 'thermal80' || size === 'thermal') return `@page { size: 80mm auto; margin: 6mm; }`;
  if (size === 'a5') return `@page { size: 148mm 210mm; margin: 10mm; }`;
  return `@page { size: 210mm 297mm; margin: 12mm; }`;
}

function layoutCss(size: PaperSize) {
  return `
  html, body { margin: 0; padding: 0; background: #fff; color: #111; }
  body { font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-root { width: 100%; max-width: 100%; box-sizing: border-box; }
  .print-root, .print-root * { box-sizing: border-box; }
  .print-root img { max-width: 100%; height: auto; }
  .print-meta-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .print-meta-single { display: block; }
  .print-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .print-table th, .print-table td { padding: 6px 8px; border: 1px solid #ddd; }
  .print-footer { margin-top: 12px; font-size: 13px; }
  .bill-receipt { background: #fff !important; color: #111 !important; box-shadow: none !important; border-radius: 0 !important; }
  .bill-receipt, .bill-receipt * { color: #111 !important; }
  .bill-receipt .receipt-header,
  .bill-receipt .receipt-footer { text-align: center; }
  .bill-receipt .receipt-items { width: 100%; border-collapse: collapse; }
  .bill-receipt .receipt-items th,
  .bill-receipt .receipt-items td { border-bottom: 1px solid #e5e7eb; padding: 4px 2px; }
  .bill-receipt .receipt-divider { border-top: 1px dashed #111; margin: 8px 0; }
  .bill-receipt .receipt-meta { font-size: 11px; line-height: 1.45; }
  .bill-receipt .receipt-totals,
  .bill-receipt .rt-row { margin: 0; }
  ${size === 'thermal' || size === 'thermal80' ? `.print-meta { display: block; } .print-root { max-width: 80mm; margin: 0 auto; }` : size === 'thermal58' ? `.print-meta { display: block; } .print-root { max-width: 58mm; margin: 0 auto; }` : `.print-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }`}
  `;
}

async function waitForImages(root: HTMLElement, timeoutMs = 1200) {
  const imgs = Array.from(root.querySelectorAll('img'));
  if (imgs.length === 0) return;
  await Promise.race([
    Promise.all(
      imgs.map((img) => (
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
      ))
    ),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

export async function printSection(element: HTMLElement | null, options?: { size?: PaperSize; title?: string }) {
  if (!element) return false;
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
  if (!win) return false;

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

  await waitForImages(cloned);

  try {
    if ((doc as any).fonts?.ready) await (doc as any).fonts.ready;
  } catch (e) {}

  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  try {
    win.focus();
    win.print();
  } catch (e) {
    console.error('Print failed', e);
    return false;
  }

  // keep window open for user to confirm; optionally close after short delay
  // setTimeout(() => win.close(), 1000);
  return true;
}

export default printSection;
