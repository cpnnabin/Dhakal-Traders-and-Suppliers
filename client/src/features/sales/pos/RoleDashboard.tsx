import React from 'react';
import type { POSRole } from './posWorkflow';

type StatCard = {
  label: string;
  value: string;
  icon: string;
  tone?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
};

type Props = {
  role: POSRole;
  cashierName?: string;
  t: (ne: string, en: string) => string;
  stats: {
    totalSales: number;
    totalPurchases: number;
    totalProfit: number;
    totalDue: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringSoonCount: number;
    recentTransactionCount: number;
  };
};

const ROLE_META: Record<string, { title: [string, string]; subtitle: [string, string]; focus: [string, string][]; cards: (props: Props['stats']) => StatCard[] }> = {
  owner: {
    title: ['मालिक ड्यासबोर्ड', 'Owner Dashboard'],
    subtitle: ['व्यवसायको समग्र अवस्था र नियन्त्रण', 'Business-wide overview and control'],
    focus: [
      ['नाफा, बिक्री र जोखिम एकै ठाउँमा', 'Profit, sales, and risk in one place'],
      ['स्टक, देय, र एक्सपायरी तुरुन्त देखिन्छ', 'Stock, due, and expiry are visible instantly'],
    ],
    cards: (stats) => [
      { label: 'Sales', value: `NRS ${stats.totalSales.toLocaleString()}`, icon: 'ri-shopping-cart-2-line', tone: 'blue' },
      { label: 'Profit', value: `NRS ${stats.totalProfit.toLocaleString()}`, icon: 'ri-line-chart-line', tone: 'green' },
      { label: 'Risk Alerts', value: String(stats.lowStockCount + stats.outOfStockCount + stats.expiringSoonCount), icon: 'ri-error-warning-line', tone: 'red' },
    ],
  },
  admin: {
    title: ['एडमिन ड्यासबोर्ड', 'Admin Dashboard'],
    subtitle: ['दैनिक सञ्चालन र स्टक निरीक्षण', 'Daily operations and stock watch'],
    focus: [
      ['बिक्री, खरिद, र सूचनाहरू केन्द्रित', 'Sales, purchases, and alerts at a glance'],
      ['व्यवस्थापन ट्याबहरू छिटो खोल्न मिल्छ', 'Quick access to management tabs'],
    ],
    cards: (stats) => [
      { label: 'Sales', value: `NRS ${stats.totalSales.toLocaleString()}`, icon: 'ri-coins-line', tone: 'blue' },
      { label: 'Purchases', value: `NRS ${stats.totalPurchases.toLocaleString()}`, icon: 'ri-shopping-basket-2-line', tone: 'green' },
      { label: 'Open Alerts', value: String(stats.lowStockCount + stats.outOfStockCount), icon: 'ri-notification-3-line', tone: 'yellow' },
    ],
  },
  cashier: {
    title: ['क्यासियर ड्यासबोर्ड', 'Cashier Dashboard'],
    subtitle: ['छिटो बिक्री, देय रकम, र स्टक चेतावनी', 'Fast selling, dues, and stock warnings'],
    focus: [
      ['POS billing पहिलो प्राथमिकता', 'POS billing is the first priority'],
      ['देय रकम र स्टक त्रुटि छिट्टै देखिन्छ', 'Due amounts and stock issues show up fast'],
    ],
    cards: (stats) => [
      { label: 'Sales', value: `NRS ${stats.totalSales.toLocaleString()}`, icon: 'ri-bill-line', tone: 'blue' },
      { label: 'Due', value: `NRS ${stats.totalDue.toLocaleString()}`, icon: 'ri-wallet-3-line', tone: 'yellow' },
      { label: 'Recent Bills', value: String(stats.recentTransactionCount), icon: 'ri-file-list-3-line', tone: 'green' },
    ],
  },
  supplier: {
    title: ['सप्लायर ड्यासबोर्ड', 'Supplier Dashboard'],
    subtitle: ['खरिद, डेलिभरी, र अर्डर अपडेटहरू', 'Purchases, deliveries, and order updates'],
    focus: [
      ['खरिद र अर्डर स्टेटसमा फोकस', 'Focus on purchase and order status'],
      ['सप्लाई च्यानलको द्रुत अपडेट', 'Quick updates for the supply chain'],
    ],
    cards: (stats) => [
      { label: 'Purchases', value: `NRS ${stats.totalPurchases.toLocaleString()}`, icon: 'ri-truck-line', tone: 'green' },
      { label: 'Orders', value: String(stats.recentTransactionCount), icon: 'ri-list-check-2', tone: 'blue' },
      { label: 'Messages', value: 'Chats', icon: 'ri-chat-3-line', tone: 'purple' },
    ],
  },
  customer: {
    title: ['ग्राहक ड्यासबोर्ड', 'Customer Dashboard'],
    subtitle: ['अर्डर, बिल, र सन्देशहरूको सरल सारांश', 'Simple summary of orders, bills, and messages'],
    focus: [
      ['अर्डर इतिहास र बिल तुरुन्त हेर्न मिल्छ', 'See order history and bills quickly'],
      ['सपोर्ट च्याट र जानकारी सजिलै खुल्छ', 'Open support chats and info easily'],
    ],
    cards: (stats) => [
      { label: 'Recent Orders', value: String(stats.recentTransactionCount), icon: 'ri-shopping-bag-3-line', tone: 'blue' },
      { label: 'Due', value: `NRS ${stats.totalDue.toLocaleString()}`, icon: 'ri-wallet-3-line', tone: 'red' },
      { label: 'Support', value: 'Chats', icon: 'ri-customer-service-2-line', tone: 'purple' },
    ],
  },
};

export default function RoleDashboard({ role, cashierName, t, stats }: Props) {
  const meta = ROLE_META[role] || ROLE_META.owner;
  const cards = meta.cards(stats);

  return (
    <div className="pos-panel" style={{ marginBottom: 16 }}>
      <div className="pos-panel-header">
        <h3>
          <i className="ri-user-star-line" /> {t(meta.title[0], meta.title[1])}
        </h3>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{cashierName || t('स्वागत छ', 'Welcome')}</div>
          <div className="muted" style={{ marginTop: 4 }}>{t(meta.subtitle[0], meta.subtitle[1])}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="pos-badge blue">{String(role || 'owner').toUpperCase()}</span>
        </div>
      </div>

      <div className="pos-metrics-grid" style={{ marginBottom: 12 }}>
        {cards.map((card) => (
          <div key={card.label} className="pos-metric-card">
            <div className="pos-metric-info">
              <h4>{card.label}</h4>
              <span className="pos-metric-val">{card.value}</span>
            </div>
            <div className={`pos-metric-icon ${card.tone || 'blue'}`}>
              <i className={card.icon} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {meta.focus.map(([ne, en]) => (
          <div key={en} style={{ padding: 12, borderRadius: 14, background: 'rgba(15, 23, 42, 0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{t(ne, en)}</div>
            <div className="muted" style={{ fontSize: 13 }}>{t('भूमिका-आधारित छिटो दृष्टि', 'Role-aware quick view')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
