// ─── POS Page: Dashboard (charts + real sales analytics) ───────────────────
import React, { useMemo, useState } from 'react';
import { usePOS } from './POSContext';
import RoleDashboard from '../../features/sales/pos/RoleDashboard';
import { getPOSSession } from '../POSLogin';
import {
  buildDailyBuckets,
  isRealSale,
  paymentBreakdown,
  saleCustomerLabel,
  saleDateStr,
  saleInvoiceNo,
  salesByCategory,
  sortSalesNewestFirst,
} from './dashboardAnalytics';

type Props = {
  role?: string;
};

function BarChart({ buckets, valuePrefix = 'NRS ' }: { buckets: { label: string; total: number }[]; valuePrefix?: string }) {
  const max = Math.max(...buckets.map(b => b.total), 1);
  return (
    <div className="pos-crop-chart">
      {buckets.map(b => (
        <div key={b.label} className="pos-crop-bar-item">
          <div className="pos-crop-bar-info">
            <span>{b.label}</span>
            <span>{valuePrefix}{b.total.toLocaleString()}</span>
          </div>
          <div className="pos-crop-bar-track">
            <div className="pos-crop-bar-fill" style={{ width: `${Math.round((b.total / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ buckets }: { buckets: { label: string; total: number }[] }) {
  const w = 100;
  const h = 48;
  const max = Math.max(...buckets.map(b => b.total), 1);
  const points = buckets.map((b, i) => {
    const x = buckets.length <= 1 ? w / 2 : (i / (buckets.length - 1)) * w;
    const y = h - (b.total / max) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="pos-line-chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="pos-line-chart-svg" aria-hidden>
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
      </svg>
      <div className="pos-line-chart-labels">
        {buckets.map(b => (
          <span key={b.label}>{b.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function POSDashboardPage({ role: roleProp }: Props) {
  const { products, purchases, sales, t } = usePOS();
  const role = roleProp || getPOSSession().role || 'owner';
  const [chartDays, setChartDays] = useState<7 | 30>(7);

  const realSales = useMemo(() => sortSalesNewestFirst(sales.filter(isRealSale)), [sales]);
  const recentSales = useMemo(() => realSales.slice(0, 10), [realSales]);

  const totalSales = realSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  const realPurchases = useMemo(() => purchases.filter(p => !String(p.id || '').toUpperCase().startsWith('TEST')), [purchases]);
  const totalPurchases = realPurchases.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  const totalDue = realSales.reduce((acc, s) => acc + (Number(s.amountDue) || 0), 0);

  const totalProfit = realSales.reduce((acc, s) => {
    const saleCost = (s.items || []).reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    return acc + ((Number(s.subtotal) || 0) - saleCost);
  }, 0);

  const lowStock = products.filter(p => p.stock < 50 && p.stock > 0);
  const outOfStock = products.filter(p => p.stock <= 0);
  const expiringSoon = products.filter(p => {
    if (!p.expiryDate) return false;
    const days = (new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return days > 0 && days < 30;
  });

  const topSelling = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        const aSales = realSales.reduce((sum, s) => sum + (s.items || []).filter(i => i.productId === a.id).reduce((isum, item) => isum + (item.qty || 0), 0), 0);
        const bSales = realSales.reduce((sum, s) => sum + (s.items || []).filter(i => i.productId === b.id).reduce((isum, item) => isum + (item.qty || 0), 0), 0);
        return bSales - aSales;
      })
      .slice(0, 5);
  }, [products, realSales]);

  const dailyBuckets = useMemo(() => buildDailyBuckets(realSales, chartDays), [realSales, chartDays]);
  const categoryBuckets = useMemo(() => salesByCategory(realSales, products), [realSales, products]);
  const payments = useMemo(() => paymentBreakdown(realSales), [realSales]);
  const paymentMax = Math.max(payments.paid, payments.partial, payments.unpaid, 1);

  const salesVsPurchase = useMemo(() => [
    { label: t('बिक्री', 'Sales'), total: totalSales },
    { label: t('खरिद', 'Purchases'), total: totalPurchases },
  ], [totalSales, totalPurchases, t]);

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
          recentTransactionCount: recentSales.length,
        }}
      />

      <div className="pos-metrics-grid">
        <div className="pos-metric-card">
          <div className="pos-metric-info">
            <h4>{t('कुल बिक्री', 'Total Sales')}</h4>
            <span className="pos-metric-val">NRS {totalSales.toLocaleString()}</span>
            <small className="muted">{realSales.length} {t('वास्तविक बिल', 'real invoices')}</small>
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

      <div className="pos-dashboard-charts-row">
        <div className="pos-panel">
          <div className="pos-panel-header">
            <h3><i className="ri-bar-chart-grouped-line" /> {t('दैनिक बिक्री', 'Daily Sales')}</h3>
            <div className="pos-chart-period">
              <button type="button" className={chartDays === 7 ? 'active' : ''} onClick={() => setChartDays(7)}>7 {t('दिन', 'days')}</button>
              <button type="button" className={chartDays === 30 ? 'active' : ''} onClick={() => setChartDays(30)}>30 {t('दिन', 'days')}</button>
            </div>
          </div>
          {realSales.length === 0 ? (
            <p className="pos-chart-empty">{t('अहिलेसम्म कुनै वास्तविक बिक्री छैन।', 'No real sales yet — complete a bill in Billing.')}</p>
          ) : (
            <>
              <LineChart buckets={dailyBuckets} />
              <BarChart buckets={dailyBuckets} />
            </>
          )}
        </div>

        <div className="pos-panel">
          <div className="pos-panel-header">
            <h3><i className="ri-pie-chart-line" /> {t('भुक्तानी स्थिति', 'Payment Status')}</h3>
          </div>
          <div className="pos-crop-chart">
            {[
              { key: 'paid', label: t('भुक्तानी भयो', 'Paid'), count: payments.paid, tone: 'green' },
              { key: 'partial', label: t('आंशिक', 'Partial'), count: payments.partial, tone: 'yellow' },
              { key: 'unpaid', label: t('बाँकी', 'Unpaid'), count: payments.unpaid, tone: 'red' },
            ].map(row => (
              <div key={row.key} className="pos-crop-bar-item">
                <div className="pos-crop-bar-info">
                  <span>{row.label}</span>
                  <span>{row.count}</span>
                </div>
                <div className="pos-crop-bar-track">
                  <div className={`pos-crop-bar-fill pos-crop-bar-fill--${row.tone}`} style={{ width: `${Math.round((row.count / paymentMax) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pos-dashboard-charts-row">
        <div className="pos-panel">
          <div className="pos-panel-header">
            <h3><i className="ri-funds-line" /> {t('बिक्री बनाम खरिद', 'Sales vs Purchases')}</h3>
          </div>
          <BarChart buckets={salesVsPurchase} />
        </div>

        <div className="pos-panel">
          <div className="pos-panel-header">
            <h3><i className="ri-stack-line" /> {t('श्रेणी अनुसार बिक्री', 'Sales by Category')}</h3>
          </div>
          {categoryBuckets.length === 0 ? (
            <p className="pos-chart-empty">{t('श्रेणी डेटा उपलब्ध छैन।', 'No category breakdown yet.')}</p>
          ) : (
            <BarChart buckets={categoryBuckets.map(c => ({ label: c.name, total: c.total }))} />
          )}
        </div>
      </div>

      <div className="pos-dashboard-grid">
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
            {outOfStock.length === 0 && lowStock.length === 0 && expiringSoon.length === 0 && (
              <p className="muted" style={{ padding: 12 }}>{t('कुनै अलर्ट छैन।', 'No alerts right now.')}</p>
            )}
          </div>
        </div>

        <div className="pos-panel">
          <div className="pos-panel-header">
            <h3><i className="ri-medal-line" /> {t('उत्कृष्ट बिक्री हुने सामान', 'Top Selling Products')}</h3>
          </div>
          <div className="top-products-list">
            {topSelling.length === 0 ? (
              <div className="pos-empty-state" style={{ padding: '18px 12px', color: 'var(--pos-text-muted)' }}>
                {t('बिक्री डेटा छैन।', 'No sales data yet.')}
              </div>
            ) : (
              topSelling.map((p, i) => (
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

        <div className="pos-panel full-width">
          <div className="pos-panel-header">
            <h3><i className="ri-history-line" /> {t('भर्खरका कारोबारहरू', 'Recent Transactions')}</h3>
            <span className="muted" style={{ fontSize: 13 }}>{t('वास्तविक बिक्री मात्र', 'Real sales only')}</span>
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
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--pos-text-muted)' }}>
                      {t('कुनै वास्तविक बिक्री भेटिएन। बिलिङबाट बिक्री गर्नुहोस्।', 'No real sales yet. Create a sale from Billing.')}
                    </td>
                  </tr>
                ) : (
                  recentSales.map(s => {
                    const due = Number(s.amountDue) || 0;
                    const status = due <= 0 ? 'Paid' : due >= Number(s.total) ? 'Unpaid' : 'Partial';
                    return (
                      <tr key={saleInvoiceNo(s) || String(s.date)}>
                        <td>{saleInvoiceNo(s)}</td>
                        <td>{saleCustomerLabel(s)}</td>
                        <td>{saleDateStr(s)}</td>
                        <td>NRS {Number(s.total).toLocaleString()}</td>
                        <td>
                          <span className={`pos-badge ${status === 'Paid' ? 'green' : status === 'Partial' ? 'yellow' : 'red'}`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
