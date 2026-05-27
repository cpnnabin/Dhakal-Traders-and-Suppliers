import React from 'react';
import InventoryDashboard from './InventoryDashboard';
import ProductList from './ProductList';
import StockList from './StockList';
import LowStock from './LowStock';
import Categories from './Categories';
import Brands from './Brands';
import Warehouses from './Warehouses';
import Batches from './Batches';
import ExpiryAlerts from './ExpiryAlerts';

export type InventoryViewId =
  | 'inventory'
  | 'inventory-products'
  | 'inventory-stock'
  | 'inventory-low'
  | 'inventory-categories'
  | 'inventory-brands'
  | 'inventory-warehouses'
  | 'inventory-batches'
  | 'inventory-expiry';

type InventorySection = {
  id: InventoryViewId;
  title: string;
  subtitle: string;
  icon: string;
  render: () => React.ReactNode;
};

const SECTIONS: InventorySection[] = [
  {
    id: 'inventory',
    title: 'Inventory Dashboard',
    subtitle: 'Overview, shortcuts, and stock health',
    icon: 'ri-dashboard-3-line',
    render: () => <InventoryDashboard />,
  },
  {
    id: 'inventory-products',
    title: 'Products',
    subtitle: 'Unified product master with pricing and stock',
    icon: 'ri-box-3-line',
    render: () => <ProductList />,
  },
  {
    id: 'inventory-stock',
    title: 'Stock IN / OUT',
    subtitle: 'Stock movements and warehouse levels',
    icon: 'ri-exchange-funds-line',
    render: () => <StockList />,
  },
  {
    id: 'inventory-low',
    title: 'Low Stock',
    subtitle: 'Reorder quickly before items run out',
    icon: 'ri-alert-line',
    render: () => <LowStock />,
  },
  {
    id: 'inventory-categories',
    title: 'Categories',
    subtitle: 'Product grouping for reporting and filtering',
    icon: 'ri-folder-3-line',
    render: () => <Categories />,
  },
  {
    id: 'inventory-brands',
    title: 'Brands',
    subtitle: 'Brand master for inventory records',
    icon: 'ri-price-tag-3-line',
    render: () => <Brands />,
  },
  {
    id: 'inventory-warehouses',
    title: 'Warehouses',
    subtitle: 'Warehouse master and transfer tools',
    icon: 'ri-store-2-line',
    render: () => <Warehouses />,
  },
  {
    id: 'inventory-batches',
    title: 'Batch Tracking',
    subtitle: 'Batch numbers and expiry management',
    icon: 'ri-archive-2-line',
    render: () => <Batches />,
  },
  {
    id: 'inventory-expiry',
    title: 'Expiry Alerts',
    subtitle: 'Track expiring lots and alert status',
    icon: 'ri-time-line',
    render: () => <ExpiryAlerts />,
  },
];

export default function InventoryHub({ view }: { view: InventoryViewId }) {
  const section = SECTIONS.find((s) => s.id === view) || SECTIONS[0];

  return (
    <div className="inventory-hub" style={{ display: 'grid', gap: 18 }}>
      <div className="pos-panel" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div className="pos-panel-title" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className={section.icon} />
              {section.title}
            </div>
            <div style={{ color: 'var(--pos-text-muted)', fontSize: 13 }}>{section.subtitle}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SECTIONS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`pos-sec-btn${item.id === view ? ' active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <i className={item.icon} style={{ marginRight: 6 }} />
                {item.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="inventory-hub-body">
        {section.render()}
      </div>
    </div>
  );
}