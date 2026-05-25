// ─── POS: Thermal Receipt Modal ───────────────────────────────────────────────
import React, { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { usePOS } from './POSContext';
import type { SaleRecord } from './posTypes';

type PosCustomer = {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  login_id?: string;
  address?: string;
  panNo?: string;
  alternativeAddress?: string;
  alternativePhone?: string;
};

type ReceiptCustomer = {
  name?: string;
  phone?: string;
  loginId?: string;
  pan?: string;
  address?: string;
  email?: string;
  altAddress?: string;
  altPhone?: string;
};

function str(v: unknown): string {
  return v != null ? String(v).trim() : '';
}

function findCustomerRecord(receipt: SaleRecord, customers: PosCustomer[]): PosCustomer | null {
  if (receipt.customerId) {
    const byId = customers.find((c) => String(c._id) === String(receipt.customerId));
    if (byId) return byId;
  }
  const name = str(receipt.customerName);
  if (name) {
    const lower = name.toLowerCase();
    const byName = customers.find((c) => str(c.name).toLowerCase() === lower);
    if (byName) return byName;
    const byPhone = customers.find((c) => str(c.phone) === name);
    if (byPhone) return byPhone;
  }
  return null;
}

// Updated receipt layout to match user format
// Helper to convert number to words (English only, simple implementation)
function numberToWords(num: number): string {
  const a = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
  const b = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
  if (num < 20) return a[num];
  if (num < 100) return b[Math.floor(num/10)] + (num%10===0?"":" " + a[num%10]);
  if (num < 1000) return a[Math.floor(num/100)] + " hundred" + (num%100===0?"":" and " + numberToWords(num%100));
  if (num < 1000000) return numberToWords(Math.floor(num/1000)) + " thousand" + (num%1000===0?"":" " + numberToWords(num%1000));
  return numberToWords(Math.floor(num/1000000)) + " million" + (num%1000000===0?"":" " + numberToWords(num%1000000));
}

// Helper to format date in Nepali (Miti) – simple fallback to Nepali locale
function formatMiti(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ne-NP', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function resolveReceiptCustomer(receipt: SaleRecord, customers: PosCustomer[]): ReceiptCustomer | null {
  const fromDb = findCustomerRecord(receipt, customers);

  const info: ReceiptCustomer = {
    name: str(receipt.customerName) || str(fromDb?.name),
    phone: str(receipt.customerPhone) || str(fromDb?.phone),
    loginId: str(receipt.customerLoginId) || str(fromDb?.login_id),
    pan: str(receipt.customerPan) || str(fromDb?.panNo),
    address: str(receipt.customerAddress) || str(fromDb?.address),
    email: str(receipt.customerEmail) || str(fromDb?.email),
    altAddress: str(receipt.customerAlternativeAddress) || str(fromDb?.alternativeAddress),
    altPhone: str(receipt.customerAlternativePhone) || str(fromDb?.alternativePhone),
  };

  if (!info.name && !info.phone && !info.pan) return null;
  return info;
}

function ReceiptCustomerBlock({
  customer,
  t,
}: {
  customer: ReceiptCustomer;
  t: (ne: string, en: string) => string;
}) {
  const rows: { label: string; value?: string }[] = [
    { label: t('नाम:', 'Name:'), value: customer.name },
    { label: t('फोन:', 'Phone:'), value: customer.phone },
    { label: t('प्रयोगकर्ता आईडी:', 'User ID:'), value: customer.loginId },
    { label: t('प्यान नं:', 'PAN No:'), value: customer.pan },
    { label: t('ठेगाना:', 'Address:'), value: customer.address },
    { label: t('इमेल:', 'Email:'), value: customer.email },
    { label: t('वैकल्पिक ठेगाना:', 'Alt. address:'), value: customer.altAddress },
    { label: t('वैकल्पिक फोन:', 'Alt. phone:'), value: customer.altPhone },
  ];

  return (
    <div className="pos-receipt-customer">
      <div className="pos-receipt-customer-title">{t('ग्राहक विवरण', 'BILL TO / CUSTOMER')}</div>
      {rows.map(
        (row) =>
          row.value && (
            <div key={row.label}>
              <strong>{row.label}</strong> {row.value}
            </div>
          )
      )}
    </div>
  );
}

export default function ReceiptModal() {
  const { receiptData, setReceiptData, customers, setReceiptEditTarget, t } = usePOS();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [paperSize, setPaperSize] = useState<'thermal'|'a5'|'a4'>('thermal');

  const customer = useMemo(
    () => (receiptData ? resolveReceiptCustomer(receiptData, customers as PosCustomer[]) : null),
    [receiptData, customers]
  );

  const handleDownloadPDF = async () => {
    const element = receiptRef.current;
    if (!element || !receiptData) return;

    setDownloading(true);
    try {
      const canvas = await html2canvas(element, ({
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      } as any));
      const imgData = canvas.toDataURL('image/png');
      let pdf;
      if (paperSize === 'thermal') {
        const imgWidth = 80; // mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [imgWidth, imgHeight] });
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else if (paperSize === 'a5') {
        pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
        pdf.addImage(imgData, 'PNG', 10, 10, 128, (canvas.height * 128) / canvas.width);
      } else {
        pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        pdf.addImage(imgData, 'PNG', 10, 10, 190, (canvas.height * 190) / canvas.width);
      }
      pdf.save(`receipt_${receiptData.id || Date.now()}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  if (!receiptData) return null;
  return (
    <div className="pos-modal-overlay">
      <div className="pos-modal">
        <div className="pos-modal-actions no-print">
          <span style={{ color: '#FFF', fontWeight: 600, fontSize: 14 }}>
            📄 {t('कर बिजक', 'Tax Invoice / Receipt')}
          </span>
            <div style={{ display: 'flex', gap: 10 }}>
            {/* Paper size selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 6 }}>
              <label style={{ color: '#FFF', fontSize: 12 }}>Paper:</label>
              <button className={`pos-sec-btn${paperSize==='thermal'?' active':''}`} onClick={() => setPaperSize('thermal')}>🧾 80mm</button>
              <button className={`pos-sec-btn${paperSize==='a5'?' active':''}`} onClick={() => setPaperSize('a5')}>📐 A5</button>
              <button className={`pos-sec-btn${paperSize==='a4'?' active':''}`} onClick={() => setPaperSize('a4')}>📄 A4</button>
            </div>
            <button
              className="download-btn"
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              style={{
                background: 'var(--pos-success, #10B981)',
                color: '#FFF',
                padding: '8px 14px',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {downloading ? '⏳ ...' : `📥 ${t('डाउनलोड', 'Download')}`}
            </button>
            <button className="print-btn" type="button" onClick={() => import('../../utils/printHelper').then(m => m.printSection(receiptRef.current as HTMLElement, { size: paperSize, title: `Receipt ${receiptData.id}` }))}>
              🖨️ {t('प्रिन्ट', 'Print')}
            </button>
              <button className="pos-sec-btn" type="button" onClick={() => { if (receiptData) setReceiptEditTarget(receiptData); }}>
                ✏️ {t('सम्पादन', 'Edit')}
              </button>
            <button className="close-btn" type="button" onClick={() => setReceiptData(null)}>
              ✕ {t('बन्द', 'Close')}
            </button>
          </div>
        </div>

        <div ref={receiptRef} className="pos-thermal-paper">
          <div className="pos-receipt-header">
            <div className="pos-receipt-store">{t('ढकाल ट्रेडर्स एण्ड सप्लायर्स', 'DHAKAL TRADERS & SUPPLIERS')}</div>
            <div className="pos-receipt-meta">
              <div>
                <strong>{t('बिल नं:', 'Bill No:')}</strong> {receiptData.id}
              </div>
              <div>
                <strong>{t('मिति:', 'Date:')}</strong> {receiptData.date}
              </div>
              <div>
                <strong>{t('मिति (मिति):', 'Miti:')}</strong> {formatMiti(receiptData.date)}
              </div>
              <div>
                <strong>{t('नाम:', 'Name:')}</strong> {customer?.name || t('अतिथि', 'Guest')}
              </div>
              {customer?.address && (
                <div>
                  <strong>{t('ठेगाना:', 'Address:')}</strong> {customer.address}
                </div>
              )}
              {customer?.phone && (
                <div>
                  <strong>{t('मोबाइल नं:', 'MOB No:')}</strong> {customer.phone}
                </div>
              )}
              {customer?.pan && (
                <div>
                  <strong>{t('प्यान नं:', 'PAN No:')}</strong> {customer.pan}
                </div>
              )}
              <div>
                <strong>{t('भुक्तानी:', 'Payment:')}</strong> {receiptData.paymentMode}
              </div>
              {receiptData.note && (
                <div>
                  <strong>{t('सन्देश:', 'Message:')}</strong> {receiptData.note}
                </div>
              )}
            </div>
            <div className="pos-receipt-divider" />
            <strong>{t('कर बिजक (TAX INVOICE)', 'TAX INVOICE / RECEIPT')}</strong>
          </div>

          <table className="pos-receipt-table">
            <thead>
              <tr>
                <th>{t('क्र.सं.', 'SN')}</th>
                <th>{t('विवरण', 'Product')}</th>
                <th style={{ textAlign: 'right' }}>{t('दर', 'Rate')}</th>
                <th style={{ textAlign: 'right' }}>{t('मात्रा', 'Qty')}</th>
                <th style={{ textAlign: 'right' }}>{t('रकम', 'Amount')}</th>
              </tr>
            </thead>
            <tbody>
              {receiptData.items.map((item, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{item.name}</td>
                  <td style={{ textAlign: 'right' }}>Rs. {item.rate ?? ''}</td>
                  <td style={{ textAlign: 'right' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right' }}>Rs. {item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pos-receipt-summary">
            <div>
              <strong>{t('ग्रॉस रकम', 'Gross Amount')}:</strong> Rs. {receiptData.subtotal}
            </div>
            <div>
              <strong>{t('भ्याट (13%)', 'VAT (13%)')}:</strong> Rs. {receiptData.tax}
            </div>
            <div>
              <strong>{t('कुल जम्मा', 'Net Amount')}:</strong> Rs. {receiptData.total}
            </div>
            <div>
              <strong>{t('रुपी शब्दमा', 'In words')}:</strong> Rs. {numberToWords(Math.round(receiptData.total))} only.
            </div>
          </div>

          <div className="pos-receipt-divider" />
          <div className="pos-receipt-footer" style={{ textAlign: 'center', marginTop: 10 }}>
            <strong>{t('धन्यवाद! पुनः पधार्नुहोला।', 'THANK YOU! VISIT AGAIN.')}</strong>
            <div>Dhakal Traders POS</div>
          </div>
        </div>
        {/* Bottom actions (also printable controls hidden via .no-print) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '12px 18px' }} className="no-print">
          <div>
            <button className="download-btn" type="button" onClick={handleDownloadPDF} disabled={downloading}>{downloading ? '⏳ ...' : `📥 ${t('डाउनलोड', 'Download')}`}</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="print-btn" type="button" onClick={() => import('../../utils/printHelper').then(m => m.printSection(receiptRef.current as HTMLElement, { size: paperSize, title: `Receipt ${receiptData.id}` }))}>🖨️ {t('प्रिन्ट', 'Print')}</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#666' }}>Selected: <strong>{paperSize === 'thermal' ? 'Thermal 80mm' : paperSize === 'a5' ? 'A5' : 'A4'}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
