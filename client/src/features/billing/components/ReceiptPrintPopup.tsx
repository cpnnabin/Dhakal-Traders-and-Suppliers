// src/features/billing/components/ReceiptPrintPopup.tsx
// Print popup: thermal/A5/A4 receipt renderer
import React, { useEffect, useState, useRef, memo } from 'react';
import { COMPONENT_NAME, COMPANY, toMiti } from '../utils/posUtils';
import './ReceiptPrintPopup.css';
const { name: COMPANY_NAME, address: COMPANY_ADDRESS, pan: COMPANY_PAN } = COMPANY;
import { amountToWords } from '../utils/posUtils';
import type { ReceiptData } from '../types/posTypes';

interface ReceiptPrintPopupProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
}

type PaperSize = 'thermal' | 'a5' | 'a4';

export const ReceiptPrintPopup: React.FC<ReceiptPrintPopupProps> = memo(
  ({ isOpen, onClose, receiptData }) => {
    const [size, setSize] = useState<PaperSize>('thermal');
    const overlayRef = useRef<HTMLDivElement>(null);
    const firstBtnRef = useRef<HTMLButtonElement>(null);

    // focus trap & ESC close
    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        // keep focus inside overlay
        if (e.key === 'Tab' && overlayRef.current) {
          const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };
      if (isOpen) {
        document.addEventListener('keydown', handleKey);
        firstBtnRef.current?.focus();
      }
      return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const handleDownload = async () => {
      const area = document.getElementById('receipt-print-area');
      if (!area) return;
      // Load libraries if not already present
      // @ts-ignore
      const html2canvas = (window as any).html2canvas;
      // @ts-ignore
      const jsPDF = (window as any).jsPDF;
      if (!html2canvas || !jsPDF) {
        // load from CDN (already used elsewhere in project)
        await import('html2canvas');
        await import('jspdf');
      }
      const canvas = await (window as any).html2canvas(area, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new (window as any).jsPDF({ unit: 'mm', format: size === 'thermal' ? [80, 200] : size.toUpperCase() as any });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const filename = `receipt-${receiptData.billNo}-${receiptData.date}.pdf`;
      pdf.save(filename);
    };

    if (!isOpen) return null;

    const { billNo, date, miti, customerName, customerAddress, customerPhone, customerPAN, items, grossAmount, discount, netAmount, paymentMode, tender, change, totalQty, pointEarned, totalPoints, cashierName, counter } = receiptData;
    const words = amountToWords(netAmount);

    // Helper to render items rows (used in all layouts)
    const renderItems = () => (
      <>{
        items.map((it, idx) => (
          <tr key={idx} style={{ verticalAlign: 'top' }}>
            <td>{idx + 1}</td>
            <td>{it.name}</td>
            <td style={{ textAlign: 'right' }}>{it.qty}</td>
            <td style={{ textAlign: 'right' }}>{it.rate.toFixed(2)}</td>
            <td style={{ textAlign: 'right' }}>{it.amount.toFixed(2)}</td>
          </tr>
        ))
      }</>
    );

    const renderThermal = () => (
      <div className="receipt" id="receipt-print-area" style={{ fontFamily: "'Courier New', monospace", fontSize: '11px', width: '302px', margin: '0 auto', color: 'var(--text-color)' }}>
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <div>{COMPANY_NAME}</div>
          <div>{COMPANY_ADDRESS}</div>
          <div>VAT No: {COMPANY_PAN}</div>
          <div>{customerPAN ? 'ABBREVIATED TAX INVOICE' : 'RETAIL INVOICE'}</div>
        </div>
        <div style={{ marginBottom: '4px' }}>
          <div>Bill NO : {billNo}</div>
          <div>Date    : {date}</div>
          <div>Miti    : {toMiti(date)}</div>
          <div>Name    : {customerName}</div>
          <div>Address : {customerAddress}</div>
          <div>MOB No  : {customerPhone}</div>
          {customerPAN && <div>PAN No  : {customerPAN}</div>}
          <div>Payment Mode : {paymentMode}</div>
          {pointEarned && <div>Point Earned : {pointEarned}</div>}
          {totalPoints && <div>Total Points : {totalPoints}</div>}
        </div>
        <div style={{ borderTop: '1px dashed', margin: '4px 0' }} />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Sn</th>
              <th style={{ textAlign: 'left' }}>Particulars</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Rate</th>
              <th style={{ textAlign: 'right' }}>Amt</th>
            </tr>
          </thead>
          <tbody>{renderItems()}</tbody>
        </table>
        <div style={{ borderTop: '1px dashed', margin: '4px 0' }} />
        <div style={{ textAlign: 'right' }}>
          <div>Gross Amount : {grossAmount.toFixed(2)}</div>
          <div>Discount     : {discount.toFixed(2)}</div>
          <div>Net Amount   : {netAmount.toFixed(2)}</div>
          <div>------</div>
          <div>Tender       : {tender.toFixed(2)}</div>
          <div>Change       : {change.toFixed(2)}</div>
          <div>------</div>
          <div>Total Qty    : {totalQty}</div>
        </div>
        <div style={{ fontStyle: 'italic', marginTop: '4px' }}>Rs. {words} only</div>
        <div style={{ borderTop: '1px dashed', margin: '4px 0' }} />
        <div style={{ fontSize: '9px', textAlign: 'center' }}>
          Goods will be exchanged within 7 days with original bill.<br />
          Counter: {counter}   Cashier: {cashierName}
        </div>
      </div>
    );

    const renderA5A4 = (isA4: boolean) => (
      <div className="receipt" id="receipt-print-area" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', width: isA4 ? '210mm' : '148mm', margin: '0 auto', color: 'var(--text-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{COMPANY_NAME}</div>
          {isA4 && (
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc', textAlign: 'center', lineHeight: '40px' }}>DL</div>
          )}
        </div>
        <div style={{ borderBottom: '1px solid', marginBottom: '8px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div>{customerName}</div>
            <div>{customerAddress}</div>
            {customerPAN && <div>PAN: {customerPAN}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>Bill No: {billNo}</div>
            <div>Date: {date}</div>
            <div>Miti: {toMiti(date)}</div>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid', padding: '4px' }}>S.No</th>
              <th style={{ border: '1px solid', padding: '4px' }}>Description</th>
              <th style={{ border: '1px solid', padding: '4px' }}>Qty</th>
              <th style={{ border: '1px solid', padding: '4px' }}>Rate</th>
              <th style={{ border: '1px solid', padding: '4px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>{renderItems()}</tbody>
        </table>
        <div style={{ marginTop: '8px', textAlign: 'right' }}>
          <div>Gross: {grossAmount.toFixed(2)}</div>
          <div>Discount: {discount.toFixed(2)}</div>
          <div>Net: {netAmount.toFixed(2)}</div>
          <div>Payment: {paymentMode}</div>
          <div>Tender: {tender.toFixed(2)}</div>
          <div>Change: {change.toFixed(2)}</div>
          <div>Total Qty: {totalQty}</div>
        </div>
        <div style={{ fontStyle: 'italic', marginTop: '4px' }}>Rs. {words} only</div>
        <table style={{ width: '100%', marginTop: '8px', borderTop: '1px solid' }}>
          <tr>
            <td style={{ border: '1px solid', padding: '4px' }}>In Words:</td>
            <td style={{ border: '1px solid', padding: '4px' }}>{words}</td>
          </tr>
        </table>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <div>Prepared By __________</div>
          <div>Received By __________</div>
          <div>Authorized By __________</div>
        </div>
      </div>
    );

    return (
      <div
        ref={overlayRef}
        className="receipt-print-popup"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        aria-modal="true"
        role="dialog"
      >
        <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px', maxWidth: 'min(680px, 95vw)', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
          {/* Header controls */}
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Receipt</h2>
            <button ref={firstBtnRef} onClick={onClose} aria-label="Close receipt popup" className="btn-close">
              ×
            </button>
          </header>
          <div className="paper-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button onClick={() => setSize('thermal')} className={size === 'thermal' ? 'tab active' : 'tab'}>Thermal 80mm</button>
            <button onClick={() => setSize('a5')} className={size === 'a5' ? 'tab active' : 'tab'}>A5</button>
            <button onClick={() => setSize('a4')} className={size === 'a4' ? 'tab active' : 'tab'}>A4</button>
          </div>
          {size === 'thermal' && renderThermal()}
          {size === 'a5' && renderA5A4(false)}
          {size === 'a4' && renderA5A4(true)}
          <div className="action-buttons" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleDownload} className="btn-download">Download PDF</button>
            <button onClick={() => window.print()} className="btn-print">Print</button>
          </div>
        </div>
      </div>
    );
  }
);

export default ReceiptPrintPopup;
