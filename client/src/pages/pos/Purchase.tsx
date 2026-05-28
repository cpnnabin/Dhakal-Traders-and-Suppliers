// ─── POS Page: Farmer Purchase (Wholesale Procurement) ───────────────────────
import React from 'react';
import { usePOS } from './POSContext';
import { FarmerPurchase } from './posTypes';

export default function PurchasePage() {
  const { products, setProducts, purchases, setPurchases, apiCall, t, cashier, reloadProducts } = usePOS();

  const [farmerName, setFarmerName] = React.useState('');
  const [prodId,     setProdId]     = React.useState(products[0]?.id || '');
  const [qty,        setQty]        = React.useState(0);
  const [rate,       setRate]       = React.useState(0);
  const [paymentMode, setPaymentMode] = React.useState('Cash');

  const PAYMENT_MODES = [
    { id: 'Cash', label: t('नगद', 'Cash') },
    { id: 'Bank', label: t('बैंक', 'Bank') },
    { id: 'Card', label: t('कार्ड', 'Card') },
    { id: 'QR', label: t('क्यूआर', 'QR') },
    { id: 'Credit', label: t('उधारो', 'Credit') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerName.trim() || qty <= 0 || rate <= 0) {
      alert(t('सबै विवरणहरू भर्नुहोस्!', 'Please fill all fields correctly!')); return;
    }
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    const log: FarmerPurchase = {
      id: `P-${101 + purchases.length}`,
      bill_no: `P-${101 + purchases.length}`,
      farmerName: farmerName.trim(),
      productName: t(prod.nameNe, prod.nameEn),
      qtyKg: qty, rate, total: qty * rate,
      date: new Date().toISOString().split('T')[0],
      paymentMode,
      supplierId: undefined,
      login_id: cashier && typeof cashier === 'object' && cashier.id ? Number(cashier.id) : undefined,
      warehouse_id: 1,
      purchase_date: new Date().toISOString().split('T')[0],
      gross_amount: qty * rate,
      discount_amount: 0,
      taxable_amount: qty * rate,
      vat_amount: 0,
      net_amount: qty * rate,
      paid_amount: qty * rate,
      due_amount: 0,
      note: undefined,
      items: [{ productId: prod.id, productName: t(prod.nameNe, prod.nameEn), qtyKg: qty, rate, total: qty * rate }],
    };

    const updatedProduct = { ...prod, stock: prod.stock + qty, purchasePrice: rate };

    const purchaseRes = await apiCall('/purchases', 'POST', log);
    const productRes = await apiCall('/products', 'POST', updatedProduct);

    if (purchaseRes.success || purchaseRes.offline) {
      setProducts(prev => prev.map(p => p.id === prodId ? updatedProduct : p));
      setPurchases(prev => [log, ...prev]);
      alert(
        purchaseRes.offline
          ? t('खरिद स्थानीय रूपमा सुरक्षित (अफलाइन)।', 'Purchase saved locally (offline).')
          : t('खरिद रेकर्ड सुरक्षित गरियो!', 'Procurement saved!')
      );
      setFarmerName('');
      setQty(0);
      setRate(0);
      setPaymentMode('Cash');
      try { reloadProducts(); } catch (e) { /* ignore */ }
    } else {
      alert(t('बचत गर्न असफल भयो: ', 'Failed to save: ') + (purchaseRes.error || productRes.error || ''));
    }
  };

  return (
    <div>
      {/* ── Purchase form ── */}
      <div className="pos-form-panel">
        <h3 className="pos-panel-title" style={{ marginBottom: 16 }}>
          <i className="ri-hand-heart-line" />
          {t('सल्यानी कृषकबाट थोक खरिद प्रविष्टि', 'Bulk Procurement from Local Salyan Farmers')}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="pos-form-grid">
            <div className="pos-input-group">
              <label>{t('किसानको नाम', 'Farmer / Grower Name')}</label>
              <input type="text" className="pos-form-input" value={farmerName} onChange={e => setFarmerName(e.target.value)} placeholder="उदा: बीरबहादुर वली, बागचौर-९" />
            </div>
            <div className="pos-input-group">
              <label>{t('खरिद गर्ने फसल', 'Crop / Product')}</label>
              <select className="pos-form-select" value={prodId} onChange={e => setProdId(e.target.value)}>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji} {t(p.nameNe, p.nameEn)}</option>
                ))}
              </select>
            </div>
            <div className="pos-input-group">
              <label>{t('मात्रा (केजी)', 'Quantity (Kg)')}</label>
              <input type="number" className="pos-form-input" value={qty} onChange={e => setQty(Math.max(0, +e.target.value))} />
            </div>
            <div className="pos-input-group">
              <label>{t('प्रति केजी दर (NRS)', 'Rate per Kg (NRS)')}</label>
              <input type="number" className="pos-form-input" value={rate} onChange={e => setRate(Math.max(0, +e.target.value))} />
            </div>
            <div className="pos-input-group">
              <label>{t('भुक्तानी मोड', 'Payment Mode')}</label>
              <select className="pos-form-select" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode.id} value={mode.id}>{mode.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pos-form-actions">
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {t('किसानलाई भुक्तानी:', 'Farmer Payout:')}
              <span style={{ color: 'var(--pos-success)', marginLeft: 8 }}>NRS {(qty * rate).toLocaleString()}</span>
              <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--pos-text-muted)' }}>
                {t('मोड', 'Mode')}: {paymentMode}
              </span>
            </div>
            <button type="submit" className="pos-form-submit">
              {t('खरिद रेकर्ड थप्नुहोस्', 'Save Procurement')}
            </button>
          </div>
        </form>
      </div>

      {/* ── Purchase ledger ── */}
      <div className="pos-panel">
        <div className="pos-panel-header">
          <h3 className="pos-panel-title">
            <i className="ri-history-line" />
            {t('थोक खरिद रेकर्ड खाता', 'Wholesale Purchase Ledger')}
          </h3>
        </div>
        <div className="pos-table-wrap">
          <table className="pos-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t('किसान', 'Farmer')}</th>
                <th>{t('उपज', 'Product')}</th>
                <th>{t('मात्रा', 'Qty (kg)')}</th>
                <th>{t('दर', 'Rate')}</th>
                  <th>{t('मोड', 'Mode')}</th>
                <th>{t('कुल', 'Total Paid')}</th>
                <th>{t('मिति', 'Date')}</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: 'var(--pos-secondary)' }}>{p.id}</td>
                  <td><strong>{p.farmerName}</strong></td>
                  <td>{p.productName}</td>
                  <td>{p.qtyKg} kg</td>
                  <td>NRS {p.rate}/kg</td>
                  <td>{p.paymentMode || 'Cash'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--pos-success)' }}>NRS {p.total.toLocaleString()}</td>
                  <td>{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
