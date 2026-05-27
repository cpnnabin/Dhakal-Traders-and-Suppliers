// ─── POS Page: Dashboard (Improved Analytics) ──────────────────────────────
import React from 'react';
import { usePOS } from './POSContext';
import { useEffect, useState } from 'react';
import RoleDashboard from '../../features/sales/pos/RoleDashboard';
import { getPOSSession } from '../POSLogin';

type Props = {
  role?: string;
};

export default function POSDashboardPage({ role: roleProp }: Props) {
  const { products, purchases, sales, t } = usePOS();
  const role = roleProp || getPOSSession().role || 'owner';

  const saleInvoice = (s: any) => String(s.invoice_no || s.id || '');
  const saleDate = (s: any) => String(s.bill_date || s.date || s.created_at || s.createdAt || '');
  const saleCustomerName = (s: any) => String(s.customerName || s.full_name || 'Walk-in');

  const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
  const totalPurchases = purchases.reduce((acc, p) => acc + p.total, 0);
  const totalDue = sales.reduce((acc, s) => acc + (s.amountDue || 0), 0);
  
  // Calculate profit based on cost fields in sales
  const totalProfit = sales.reduce((acc, s) => {
    const saleCost = s.items.reduce((sum, item) => sum + (item.cost || 0), 0);
    return acc + (s.subtotal - saleCost);
  }, 0);

  const lowStock = products.filter(p => p.stock < 50 && p.stock > 0);
  const outOfStock = products.filter(p => p.stock <= 0);
  const expiringSoon = products.filter(p => {
    if (!p.expiryDate) return false;
    const days = (new Date(p.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return days > 0 && days < 30;
  });

  const topSelling = [...products].sort((a, b) => {
    const aSales = sales.reduce((sum, s) => sum + s.items.filter(i => i.productId === a.id).reduce((isum, item) => isum + item.qty, 0), 0);
    const bSales = sales.reduce((sum, s) => sum + s.items.filter(i => i.productId === b.id).reduce((isum, item) => isum + item.qty, 0), 0);
    return bSales - aSales;
  }).slice(0, 5);

  const displayTop = topSelling;
  const displaySales = sales.slice(0, 5);

  // Party Statement date range and Nepali conversion
  const todayISO = new Date().toISOString().slice(0, 10);
  const weekAgoISO = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(weekAgoISO);
  const [toDate, setToDate] = useState(todayISO);
  const [convertedRange, setConvertedRange] = useState({ fromNep: '', toNep: '' });

  // Convert a single date via server endpoint
  async function convertToNepali(dateStr: string): Promise<string> {
    try {
      const param = dateStr.split('T')[0] || dateStr;
      const r = await fetch(`/api/convert-date?date=${encodeURIComponent(param)}`);
      if (!r.ok) return '';
      const j = await r.json();
      return j.nepali || j.converted || j.date || '';
    } catch (err) {
      return '';
    }
  }

  // convert the from/to when they change
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [f, t] = await Promise.all([convertToNepali(fromDate), convertToNepali(toDate)]);
      if (!mounted) return;
      setConvertedRange({ fromNep: f, toNep: t });
    })();
    return () => { mounted = false; };
  }, [fromDate, toDate]);

  // Convert dates for each displayed sale (cache by sale id)
  const [saleNepaliMap, setSaleNepaliMap] = useState<Record<string, string>>({});
  useEffect(() => {
    let mounted = true;
    (async () => {
      const entries = displaySales.map(async (s) => {
        const anyS: any = s;
        const id = saleInvoice(anyS) || anyS._id || JSON.stringify(anyS);
        // extract YYYY-MM-DD
        const datePart = String(saleDate(anyS)).split(' ')[0].split('T')[0];
        const nep = await convertToNepali(datePart || todayISO);
        return [id, nep];
      });
      const resolved = await Promise.all(entries);
      if (!mounted) return;
      const map: Record<string, string> = {};
      resolved.forEach(([id, nep]) => { map[String(id)] = String(nep || ''); });
      setSaleNepaliMap(map);
    })();
    return () => { mounted = false; };
  }, [displaySales]);

  // Party statement generation
  const [partyQuery, setPartyQuery] = useState('');
  const [statementResults, setStatementResults] = useState<any[]>([]);

  function parseDateOnly(d: string) {
    if (!d) return '';
    return String(d).split(' ')[0].split('T')[0];
  }

  function generateStatement() {
    // filter displaySales by date range and partyQuery (by customerName or id)
    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T23:59:59');
    const results = sales.filter(s0 => {
      const s: any = s0;
      const dateStr = parseDateOnly(saleDate(s));
      const dt = new Date(dateStr + 'T00:00:00');
      if (isNaN(dt.getTime())) return false;
      if (dt < from || dt > to) return false;
      if (!partyQuery) return true;
      const q = partyQuery.toLowerCase();
      return (saleCustomerName(s).toLowerCase().includes(q) || String(s.customerPhone || '').includes(q) || saleInvoice(s).toLowerCase().includes(q));
    });
    setStatementResults(results);
  }

  function exportStatementCSV() {
    if (!statementResults || !statementResults.length) return;
    const headers = ['Invoice','Date (AD)','Date (BS)','Customer','Total','Status'];
    const rows = statementResults.map(s => {
      const dateAD = parseDateOnly(saleDate(s));
      const dateBS = saleNepaliMap[String(saleInvoice(s) || s._id || JSON.stringify(s))] || '';
      const status = (s.amountDue && Number(s.amountDue) > 0) ? 'Partial' : 'Paid';
      return [saleInvoice(s), dateAD, dateBS, saleCustomerName(s), s.total, status];
    });
    const csv = [headers, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `party-statement-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printStatement() {
    if (!statementResults || !statementResults.length) return;
    const w = window.open('', '_blank');
    if (!w) return alert('Popup blocked — allow popups to print');
    const html = `<html><head><title>Party Statement</title><style>body{font-family:sans-serif;padding:20px;color:#111}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd;text-align:left}th{background:#f4f4f4}</style></head><body>` +
      `<h2>Party Statement (${fromDate} to ${toDate})</h2>` +
      `<table><thead><tr><th>Invoice</th><th>Date (AD)</th><th>Date (BS)</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>` +
      statementResults.map(s => {
        const dateAD = parseDateOnly(saleDate(s));
        const dateBS = saleNepaliMap[String(saleInvoice(s) || s._id || JSON.stringify(s))] || '';
        const status = (s.amountDue && Number(s.amountDue) > 0) ? 'Partial' : 'Paid';
        return `<tr><td>${saleInvoice(s)}</td><td>${dateAD}</td><td>${dateBS}</td><td>${saleCustomerName(s)}</td><td>NRS ${Number(s.total).toLocaleString()}</td><td>${status}</td></tr>`;
      }).join('') +
      `</tbody></table></body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  }

  return (
    <div className="pos-dashboard-container">
      <RoleDashboard
        role={role}
        cashierName={getPOSSession().cashier || ''}
        t={t}
        stats={{
          totalSales,
          totalPurchases,
          totalProfit,
          totalDue,
          lowStockCount: lowStock.length,
          outOfStockCount: outOfStock.length,
          expiringSoonCount: expiringSoon.length,
          recentTransactionCount: displaySales.length,
        }}
      />

      {/* ── Main KPI Metrics ── */}
      <div className="pos-metrics-grid">
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('कुल बिक्री', 'Total Sales')}</h4>
            <span className="pos-metric-val">NRS {totalSales.toLocaleString()}</span>
          </div>
          <div className="pos-metric-icon blue"><i className="ri-shopping-cart-2-line" /></div>
        </div>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('कुल खरिद', 'Total Purchases')}</h4>
            <span className="pos-metric-val">NRS {totalPurchases.toLocaleString()}</span>
          </div>
          <div className="pos-metric-icon green"><i className="ri-shopping-basket-line" /></div>
        </div>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('कुल नाफा', 'Total Profit')}</h4>
            <span className="pos-metric-val">NRS {totalProfit.toLocaleString()}</span>
          </div>
          <div className="pos-metric-icon yellow"><i className="ri-money-dollar-circle-line" /></div>
        </div>
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('बाँकी रकम', 'Due Amount')}</h4>
            <span className="pos-metric-val">NRS {totalDue.toLocaleString()}</span>
          </div>
          <div className="pos-metric-icon red"><i className="ri-error-warning-line" /></div>
        </div>
      </div>

      <div className="pos-dashboard-grid">
        {/* Alerts Section */}
        <div className="pos-panel alerts-panel">
          <div className="pos-panel-header">
            <h3><i className="ri-notification-3-line" /> {t('महत्त्वपूर्ण अलर्टहरू', 'Critical Alerts')}</h3>
          </div>
          <div className="alerts-list">
            {outOfStock.length > 0 && (
              <div className="alert-item error">
                <i className="ri-close-circle-line" />
                <span>{outOfStock.length} {t('सामान स्टक छैन', 'Items Out of Stock')}</span>
              </div>
            )}
            {lowStock.length > 0 && (
              <div className="alert-item warning">
                <i className="ri-alert-line" />
                <span>{lowStock.length} {t('सामान कम स्टक', 'Items Low Stock')}</span>
              </div>
            )}
            {expiringSoon.length > 0 && (
              <div className="alert-item info">
                <i className="ri-time-line" />
                <span>{expiringSoon.length} {t('सामान म्याद सकिन लागेको', 'Items Expiring Soon')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="pos-panel">
          <div className="pos-panel-header">
            <h3><i className="ri-medal-line" /> {t('उत्कृष्ट बिक्री हुने सामान', 'Top Selling Products')}</h3>
          </div>
          <div className="top-products-list">
            {displayTop.length === 0 ? (
              <div className="pos-empty-state" style={{ padding: '18px 12px', color: 'var(--pos-text-muted)' }}>
                {t('डेटाबाट कुनै उत्पादन भेटिएन।', 'No products found in the database.')}
              </div>
            ) : (
              displayTop.map((p, i) => (
                <div key={p.id} className="top-product-item">
                  <div className="left">
                    <span className="rank">{i + 1}</span>
                    <div className="emoji">{p.emoji}</div>
                  </div>
                  <div className="info">
                    <strong className="product-name">{t(p.nameNe || p.nameEn, p.nameEn || p.nameNe)}</strong>
                    <div className="meta muted">{p.category} • <span className="stock">{p.stock} left</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="pos-panel full-width">
          <div className="pos-panel-header">
            <h3><i className="ri-history-line" /> {t('भर्खरका कारोबारहरू', 'Recent Transactions')}</h3>
          </div>
          {/* Party Statement panel above the recent transactions list */}
          <div className="pos-panel" style={{ marginBottom: 12 }}>
            <div className="pos-panel-header">
              <h3><i className="ri-file-chart-line" /> {t('पार्टी स्टेटमेन्ट', 'Party Statement')}</h3>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="muted">{t('From', 'From')}</span>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                <small className="muted">AD: {fromDate} {convertedRange.fromNep ? ` • BS: ${convertedRange.fromNep}` : ''}</small>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="muted">{t('To', 'To')}</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                <small className="muted">AD: {toDate} {convertedRange.toNep ? ` • BS: ${convertedRange.toNep}` : ''}</small>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                <span className="muted">{t('Party (name/phone/invoice)', 'Party (name/phone/invoice)')}</span>
                <input type="text" placeholder="e.g. Ram Bahadur or 9847... or S-9812" value={partyQuery} onChange={e => setPartyQuery(e.target.value)} />
                <small className="muted">{t('Leave blank for all', 'Leave blank for all')}</small>
              </label>
              <div style={{ marginLeft: 'auto' }}>
                <button className="pos-sec-btn" onClick={generateStatement}>{t('Generate', 'Generate')}</button>
                <button className="pos-sec-btn" style={{ marginLeft: 8 }} onClick={exportStatementCSV}>{t('Export CSV', 'Export CSV')}</button>
                <button className="pos-sec-btn" style={{ marginLeft: 8 }} onClick={printStatement}>{t('Print', 'Print')}</button>
              </div>
            </div>
          </div>
          <div className="pos-table-wrap">
            <table className="pos-table">
              <thead>
                <tr>
                  <th>{t('इनभ्वाइस', 'Invoice')}</th>
                  <th>{t('ग्राहक', 'Customer')}</th>
                  <th>{t('मिति', 'Date')}</th>
                  <th>{t('कुल रकम', 'Total')}</th>
                  <th>{t('अवस्था', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {displaySales.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--pos-text-muted)' }}>
                      {t('डेटाबाट कुनै बिक्री भेटिएन।', 'No sales found in the database.')}
                    </td>
                  </tr>
                ) : (
                  displaySales.map(s => (
                    <tr key={s.id}>
                      <td>{saleInvoice(s)}</td>
                      <td>{saleCustomerName(s)}</td>
                      <td>{saleDate(s)}</td>
                      <td>NRS {Number(s.total).toLocaleString()}</td>
                      <td><span className={`pos-badge ${s.amountDue > 0 ? 'yellow' : 'green'}`}>{s.amountDue > 0 ? 'Partial' : 'Paid'}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
