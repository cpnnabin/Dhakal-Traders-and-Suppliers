// ─── POS Page: Sales Reports ──────────────────────────────────────────────────
import React from 'react';
import { usePOS } from './POSContext';

export default function ReportsPage() {
  const { sales, setReceiptData, t } = usePOS();
  const [ledgerPaper, setLedgerPaper] = React.useState<'thermal'|'a5'|'a4'>('a4');
  const [plPaper, setPlPaper] = React.useState<'thermal'|'a5'|'a4'>('a4');
  const [bsPaper, setBsPaper] = React.useState<'thermal'|'a5'|'a4'>('a4');

  const totalRevenue  = sales.reduce((a, s) => a + s.subtotal, 0);
  const totalVAT      = sales.reduce((a, s) => a + s.tax, 0);
  const totalDiscount = sales.reduce((a, s) => a + s.discount, 0);
  const netReceipts   = sales.reduce((a, s) => a + s.total, 0);
  // Simple P&L and Balance calculations (basic placeholders)
  const totalCost = sales.reduce((a, s) => {
    const itemCost = (s.items || []).reduce((ia, it) => ia + ((it.cost || 0) * (it.qty || 1)), 0);
    return a + itemCost;
  }, 0);
  const grossProfit = netReceipts - totalCost;
  const assets = netReceipts; // placeholder
  const liabilities = totalDiscount; // placeholder
  const equity = assets - liabilities;

  const exportCSV = () => {
    const rows = [
      ['Invoice ID', 'Date', 'Customer', 'Cashier', 'Subtotal', 'Discount', 'Tax (VAT)', 'Advance', 'Due', 'Total'],
      ...sales.map(s => [s.id, s.date, s.customerName || 'Walk-in', s.cashier, s.subtotal, s.discount, s.tax, s.amountPaid ?? 0, s.amountDue ?? 0, s.total]),
    ];
    const csv = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'dhakal_traders_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* ── KPI row ── */}
      <div className="pos-metrics-grid" style={{ marginBottom: 24 }}>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('कुल राजश्व', 'Gross Revenue')}</h4>
            <span className="pos-metric-val">NRS {totalRevenue.toLocaleString()}</span>
          </div>
          <div className="pos-metric-icon blue"><i className="ri-funds-line" /></div>
        </div>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('VAT संकलन (13%)', 'VAT Collected (13%)')}</h4>
            <span className="pos-metric-val">NRS {totalVAT.toFixed(2)}</span>
          </div>
          <div className="pos-metric-icon yellow"><i className="ri-government-line" /></div>
        </div>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('कुल छुट दिइएको', 'Total Discounts')}</h4>
            <span className="pos-metric-val">NRS {totalDiscount.toLocaleString()}</span>
          </div>
          <div className="pos-metric-icon red"><i className="ri-coupon-3-line" /></div>
        </div>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('खुद प्राप्ति', 'Net Receipts')}</h4>
            <span className="pos-metric-val" style={{ color: 'var(--pos-success)' }}>NRS {netReceipts.toLocaleString()}</span>
          </div>
          <div className="pos-metric-icon green"><i className="ri-bank-card-2-line" /></div>
        </div>
      </div>

      {/* ── Ledger table ── */}
      <div className="pos-panel">
        <div className="pos-panel-header">
          <h3 className="pos-panel-title">
            <i className="ri-file-excel-2-line" />
            {t('दैनिक बिक्री खाता विवरण', 'Daily Transaction Ledger')}
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: '#666' }}>Paper:</label>
            <select value={ledgerPaper} onChange={e => setLedgerPaper(e.target.value as any)} className="pos-form-input">
              <option value="a4">A4</option>
              <option value="a5">A5</option>
              <option value="thermal">Thermal 80mm</option>
            </select>
            <button className="pos-form-submit" onClick={() => import('../../utils/printHelper').then(m => m.printSection(document.querySelector('.pos-panel') as HTMLElement, { size: ledgerPaper, title: 'Daily Ledger' }))}>
              🖨️ {t('प्रिन्ट', 'Print')}
            </button>
            <button className="pos-form-submit" onClick={exportCSV}>
              📥 {t('CSV डाउनलोड', 'Export CSV')}
            </button>
          </div>
        </div>
        <div className="pos-table-wrap">
          <table className="pos-table">
            <thead>
              <tr>
                <th>{t('बिजक', 'Invoice')}</th>
                <th>{t('ग्राहक', 'Customer')}</th>
                <th>{t('मिति', 'Date')}</th>
                <th>{t('उप-जम्मा', 'Sub')}</th>
                <th>{t('छुट', 'Disc')}</th>
                <th>{t('VAT', 'VAT')}</th>
                <th>{t('अग्रिम', 'Advance')}</th>
                <th>{t('बाँकी', 'Due')}</th>
                <th>{t('कुल', 'Total')}</th>
                <th>{t('क्यासियर', 'Cashier')}</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s, i) => (
                <tr key={i}>
                  <td>
                    <button
                      onClick={() => setReceiptData(s)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--pos-primary)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        padding: 0,
                        textDecoration: 'underline',
                        textAlign: 'left'
                      }}
                      title={t('रसिद छाप्नुहोस् / हेर्नुहोस्', 'Print / View Receipt')}
                    >
                      {s.id}
                    </button>
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.customerName || 'Walk-in'}</td>
                  <td>{s.date}</td>
                  <td>NRS {s.subtotal}</td>
                  <td style={{ color: 'var(--pos-danger)' }}>−NRS {s.discount}</td>
                  <td>NRS {s.tax}</td>
                  <td style={{ color: 'var(--pos-success)' }}>NRS {(s.amountPaid ?? 0).toFixed(2)}</td>
                  <td style={{ color: (s.amountDue ?? 0) > 0 ? 'var(--pos-danger)' : 'var(--pos-success)' }}>{(s.amountDue ?? 0) > 0 ? `NRS ${(s.amountDue ?? 0).toFixed(2)}` : <i className="ri-check-double-line" />}</td>
                  <td style={{ fontWeight: 700, color: 'var(--pos-success)' }}>NRS {s.total}</td>
                  <td>{s.cashier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profit & Loss section */}
      <div className="pos-panel" style={{ marginTop: 18 }}>
        <div className="pos-panel-header">
          <h3 className="pos-panel-title"><i className="ri-stats-line" /> {t('मुनाफा (P&L)', 'Profit & Loss')}</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: '#666' }}>Paper:</label>
            <select value={plPaper} onChange={e => setPlPaper(e.target.value as any)} className="pos-form-input">
              <option value="a4">A4</option>
              <option value="a5">A5</option>
              <option value="thermal">Thermal 80mm</option>
            </select>
            <button className="pos-form-submit" onClick={() => import('../../utils/printHelper').then(m => m.printSection(document.querySelectorAll('.pos-panel')[1] as HTMLElement, { size: plPaper, title: 'Profit and Loss' }))}>
              🖨️ {t('प्रिन्ट', 'Print')}
            </button>
          </div>
        </div>
        <div className="pos-panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <h4>{t('आय', 'Income')}</h4>
              <div>NRS {totalRevenue.toLocaleString()}</div>
              <div>VAT: NRS {totalVAT.toLocaleString()}</div>
            </div>
            <div>
              <h4>{t('खर्च', 'Expenses')}</h4>
              <div>Cost: NRS {totalCost.toLocaleString()}</div>
              <div>Discounts: NRS {totalDiscount.toLocaleString()}</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <strong>{t('सकल नाफा', 'Gross Profit')}:</strong> NRS {grossProfit.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Balance Sheet section */}
      <div className="pos-panel" style={{ marginTop: 18 }}>
        <div className="pos-panel-header">
          <h3 className="pos-panel-title"><i className="ri-bank-line" /> {t('वित्तीय अवस्था', 'Balance Sheet')}</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: '#666' }}>Paper:</label>
            <select value={bsPaper} onChange={e => setBsPaper(e.target.value as any)} className="pos-form-input">
              <option value="a4">A4</option>
              <option value="a5">A5</option>
              <option value="thermal">Thermal 80mm</option>
            </select>
            <button className="pos-form-submit" onClick={() => import('../../utils/printHelper').then(m => m.printSection(document.querySelectorAll('.pos-panel')[2] as HTMLElement, { size: bsPaper, title: 'Balance Sheet' }))}>
              🖨️ {t('प्रिन्ट', 'Print')}
            </button>
          </div>
        </div>
        <div className="pos-panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <h4>{t('सम्पत्ति', 'Assets')}</h4>
              <div>NRS {assets.toLocaleString()}</div>
            </div>
            <div>
              <h4>{t('जिम्मेवारी', 'Liabilities')}</h4>
              <div>NRS {liabilities.toLocaleString()}</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <strong>{t('इक्विटी', 'Equity')}:</strong> NRS {equity.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
