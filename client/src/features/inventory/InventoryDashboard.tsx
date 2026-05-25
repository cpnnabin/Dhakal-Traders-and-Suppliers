import React, { useEffect, useState } from 'react';
import { inventoryService } from './inventoryService';
import { Product } from './inventoryTypes';

export default function InventoryDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockCount, setStockCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const p = await inventoryService.listProducts();
      if (!mounted) return;
      setProducts(p);
      setStockCount(p.reduce((s, x) => s + (x.stock || 0), 0));
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ padding: 18 }}>
      <h2>Inventory Dashboard</h2>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, minWidth: 180 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Products</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{products.length}</div>
        </div>
        <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, minWidth: 180 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Total Stock</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{stockCount}</div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <a href="#inventory-products" style={{ marginRight: 8 }}>Manage Products</a>
        <a href="#inventory-stock">Stock IN / OUT</a>
        <a href="#inventory-categories" style={{ marginLeft: 12, marginRight: 8 }}>Categories</a>
        <a href="#inventory-brands" style={{ marginRight: 8 }}>Brands</a>
        <a href="#inventory-warehouses" style={{ marginRight: 8 }}>Warehouses</a>
        <button style={{ marginLeft: 12 }} onClick={async () => { const ok = await inventoryService.seedInventory(); if (ok) window.alert('Seeded demo data'); else window.alert('Seed failed or unauthorized'); }}>Quick Seed</button>
      </div>
    </div>
  );
}
