// ─── POS Page: Order History (Sales + Sales Return) ───────────────────────────
import React, { useState, useMemo } from 'react';
import { usePOS } from './POSContext';
import { SaleRecord } from './posTypes';

function NRS(n: number) {
  return 'रू ' + n.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const saleRef = (s: any) => String(s.invoice_no || s.id || '');
const saleDate = (s: any) => String(s.bill_date || s.date || s.created_at || '');
const salePaymentMode = (s: any) => String(s.paymentMode || 'Cash');
const saleCustomerName = (s: any) => String(s.customerName || s.full_name || 'Walk-in');
const saleAmount = (s: any) => Number(s.total ?? 0);
const saleAmountPaid = (s: any) => Number(s.amountPaid ?? 0);
const saleAmountDue = (s: any) => Number(s.amountDue ?? 0);

export default function OrdersPage() {
  const { sales, setSales, setReceiptData, cashier, products, setProducts, t } = usePOS();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayMode, setFilterPayMode] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [returnNote, setReturnNote] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const isCustomer = cashier?.role === 'customer';

  const visibleSales = useMemo(() => {
    return isCustomer
      ? sales.filter(s => s.customerId === cashier?.id || s.customerLoginId === cashier?.id || s.customerName === cashier?.full_name || s.customerName === cashier?.name)
      : sales;
  }, [sales, cashier, isCustomer]);

  const filteredSales = useMemo(() => {
    const q = search.toLowerCase();
    return visibleSales.filter(s => {
      if (q && !saleRef(s).toLowerCase().includes(q) && !String(saleCustomerName(s)).toLowerCase().includes(q) && !(String(s.cashier || '').toLowerCase().includes(q))) return false;
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (filterPayMode !== 'all' && salePaymentMode(s) !== filterPayMode) return false;
      if (dateFrom && saleDate(s) < dateFrom) return false;
      if (dateTo && saleDate(s) > dateTo) return false;
      return true;
    });
  }, [visibleSales, search, filterStatus, filterPayMode, dateFrom, dateTo]);

  const totalRevenue = filteredSales.filter(s => !s.isReturn).reduce((a, s) => a + saleAmount(s), 0);
  const totalDue = filteredSales.reduce((a, s) => a + saleAmountDue(s), 0);
  const totalReturns = filteredSales.filter(s => s.isReturn).reduce((a, s) => a + saleAmount(s), 0);

  const handleReturn = () => {
    if (!selectedSale) return;
    // Create a return sale
    const returnRecord: SaleRecord = {
      ...selectedSale,
      id: `RET-${Date.now().toString().slice(-6)}`,
      isReturn: true,
      returnOf: selectedSale.id,
      status: 'returned',
      date: new Date().toLocaleString(),
      note: returnNote,
      total: -selectedSale.total,
      amountPaid: -selectedSale.amountPaid,
      amountDue: 0,
    };
    // Restore stock
    const updatedProducts = products.map(p => {
      const item = selectedSale.items.find(i => i.productId === p.id);
      return item ? { ...p, stock: p.stock + item.qty } : p;
    });
    setProducts(updatedProducts);
    localStorage.setItem('dt_pos_products', JSON.stringify(updatedProducts));
    setSales(prev => {
      const updated = [returnRecord, ...prev.map(s => s.id === selectedSale.id ? { ...s, status: 'returned' as const } : s)];
      localStorage.setItem('dt_pos_sales', JSON.stringify(updated));
      return updated;
    });
    setShowReturnModal(false);
    setSelectedSale(null);
    setReturnNote('');
    showToast(t('सामान फिर्ता प्रक्रिया सम्पन्न! स्टक अपडेट भयो।', 'Return processed! Stock updated.'));
  };

  return (
    <div className="orders-wrap">
      {toast && <div className="pos-bill-toast pos-bill-toast--ok"><i className="ri-checkbox-circle-line" /> {toast}</div>}

      {/* Summary Stats */}
      <div className="orders-stats">
        <div className="ord-stat">
          <i className="ri-file-list-3-line" />
          <div><span className="os-label">{t('कुल अर्डर', 'Total Orders')}</span><strong>{filteredSales.filter(s => !s.isReturn).length}</strong></div>
        </div>
        <div className="ord-stat">
          <i className="ri-money-dollar-circle-line" style={{ color: 'var(--pos-success)' }} />
          <div><span className="os-label">{t('कुल बिक्री', 'Revenue')}</span><strong>{NRS(totalRevenue)}</strong></div>
        </div>
        <div className="ord-stat">
          <i className="ri-error-warning-line" style={{ color: 'var(--pos-danger)' }} />
          <div><span className="os-label">{t('बाँकी', 'Total Due')}</span><strong>{NRS(totalDue)}</strong></div>
        </div>
        <div className="ord-stat">
          <i className="ri-arrow-go-back-line" style={{ color: 'var(--pos-warning)' }} />
          <div><span className="os-label">{t('फिर्ता', 'Returns')}</span><strong>{NRS(Math.abs(totalReturns))}</strong></div>
        </div>
      </div>

      {/* Filters */}
      <div className="orders-filters">
        <div className="pe-search-wrap" style={{ flex: 1 }}>
          <i className="ri-search-line" />
          <input type="text" className="pe-search" placeholder={t('बिल नं, ग्राहक वा क्यासियर खोज्नुहोस्...', 'Search by invoice, customer or cashier...')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="pos-form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">{t('सबै अवस्था', 'All Status')}</option>
          <option value="completed">{t('सम्पन्न', 'Completed')}</option>
          <option value="pending">{t('बाँकी', 'Pending')}</option>
          <option value="returned">{t('फिर्ता', 'Returned')}</option>
          <option value="cancelled">{t('रद्द', 'Cancelled')}</option>
        </select>
        <select className="pos-form-select" value={filterPayMode} onChange={e => setFilterPayMode(e.target.value)}>
          <option value="all">{t('सबै भुक्तानी', 'All Payment')}</option>
          <option>Cash</option><option>Card</option><option>E-Sewa</option><option>Khalti</option><option>Credit</option>
          <option>QR</option>
        </select>
        <input type="date" className="pos-form-input" style={{ width: 150 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title={t('देखि', 'From')} />
        <input type="date" className="pos-form-input" style={{ width: 150 }} value={dateTo} onChange={e => setDateTo(e.target.value)} title={t('सम्म', 'To')} />
        {(dateFrom || dateTo || search || filterStatus !== 'all') && (
          <button className="pos-sec-btn" onClick={() => { setSearch(''); setFilterStatus('all'); setFilterPayMode('all'); setDateFrom(''); setDateTo(''); }}>
            <i className="ri-close-line" /> {t('साफ', 'Clear')}
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="pos-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="pos-table-wrap" style={{ flex: 1, overflow: 'auto' }}>
          <table className="pos-table orders-table">
            <thead>
              <tr>
                <th>{t('बिल नं', 'Invoice')}</th>
                <th>{t('ग्राहक', 'Customer')}</th>
                <th>{t('मिति', 'Date')}</th>
                <th>{t('भुक्तानी', 'Payment')}</th>
                <th>{t('सामानहरू', 'Items')}</th>
                <th className="num">{t('जम्मा', 'Total')}</th>
                <th className="num">{t('अग्रिम', 'Advance')}</th>
                <th className="num">{t('बाँकी', 'Due')}</th>
                <th>{t('अवस्था', 'Status')}</th>
                {!isCustomer && <th>{t('कार्य', 'Actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--pos-text-muted)' }}>
                  <i className="ri-inbox-line" style={{ fontSize: 28 }} /><br />{t('कुनै अर्डर भेटिएन', 'No orders found')}
                </td></tr>
              )}
              {filteredSales.map(s => (
                <tr key={s.id} className={`ord-row ${s.isReturn ? 'is-return' : ''} ${s.status}`}>
                  <td>
                    <button className="invoice-link" onClick={() => setReceiptData(s)}>{saleRef(s)}</button>
                    {s.isReturn && <span className="return-tag">{t('फिर्ता', 'RETURN')}</span>}
                    {s.returnOf && <div style={{ fontSize: 10, color: 'var(--pos-text-muted)' }}>of {s.returnOf}</div>}
                  </td>
                  <td>
                    <strong>{saleCustomerName(s) || t('Walk-in', 'Walk-in')}</strong>
                    { s.customerPhone && <div style={{ fontSize: 11, color: 'var(--pos-text-muted)' }}>{s.customerPhone}</div> }
                  </td>
                  <td style={{ fontSize: 12 }}>{saleDate(s)}</td>
                  <td>
                      <span className={`pay-mode-badge pay-mode-${(salePaymentMode(s) || 'cash').toLowerCase().replace('-', '')}`}>
                      {salePaymentMode(s) || 'Cash'}
                    </span>
                  </td>
                  <td>
                    <div className="ord-items-list">
                      {(s.items || []).slice(0, 2).map((item, i) => (
                        <div key={i} className="ord-item-chip">{item.name} ×{item.qty}</div>
                      ))}
                      {(s.items || []).length > 2 && <div className="ord-item-chip muted">+{(s.items || []).length - 2} {t('थप', 'more')}</div>}
                    </div>
                  </td>
                  <td className="num"><strong>{NRS(Math.abs(saleAmount(s)))}</strong></td>
                  <td className="num" style={{ color: 'var(--pos-success)' }}>{NRS(Math.abs(saleAmountPaid(s)))}</td>
                  <td className="num" style={{ color: saleAmountDue(s) > 0 ? 'var(--pos-danger)' : 'var(--pos-success)' }}>
                    {saleAmountDue(s) > 0 ? NRS(saleAmountDue(s)) : <i className="ri-check-double-line" />}
                  </td>
                  <td>
                    <span className={`pos-badge ${s.status === 'completed' ? 'green' : s.status === 'returned' ? 'red' : s.status === 'pending' ? 'yellow' : 'blue'}`}>
                      {s.status}
                    </span>
                  </td>
                  {!isCustomer && (
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="pos-sec-btn small" onClick={() => setReceiptData(s)} title={t('रसिद हेर्नुहोस्', 'View Receipt')}>
                          <i className="ri-printer-line" />
                        </button>
                        {!s.isReturn && s.status !== 'returned' && (
                          <button className="pos-sec-btn small" style={{ color: 'var(--pos-warning)' }} onClick={() => { setSelectedSale(s); setShowReturnModal(true); }} title={t('फिर्ता गर्नुहोस्', 'Process Return')}>
                            <i className="ri-arrow-go-back-line" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && selectedSale && (
        <div className="party-modal-overlay" onClick={() => setShowReturnModal(false)}>
          <div className="party-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="ri-arrow-go-back-line" style={{ color: 'var(--pos-warning)' }} /> {t('सामान फिर्ता', 'Process Return')} — {selectedSale.id}</h3>
              <button className="modal-close" onClick={() => setShowReturnModal(false)}><i className="ri-close-line" /></button>
            </div>
            <div className="modal-body">
              <div className="return-sale-preview">
                <strong>{saleCustomerName(selectedSale) || 'Walk-in'}</strong> · {selectedSale.date}
                <div>{NRS(selectedSale.total)}</div>
              </div>
              <div className="pos-input-group" style={{ marginTop: 12 }}>
                <label>{t('फिर्ताको कारण', 'Return Reason')}</label>
                <textarea className="pos-form-input" rows={3} value={returnNote} onChange={e => setReturnNote(e.target.value)} placeholder={t('कारण उल्लेख गर्नुहोस्...', 'Enter reason...')} style={{ resize: 'none', fontFamily: 'inherit' }} />
              </div>
              <div className="return-warning"><i className="ri-alert-line" /> {t('सामान फिर्ता गर्दा स्टक स्वतः अपडेट हुनेछ।', 'Stock will be automatically restored on return.')}</div>
            </div>
            <div className="modal-footer">
              <button className="pos-sec-btn" onClick={() => setShowReturnModal(false)}>{t('रद्द', 'Cancel')}</button>
              <button className="pos-form-submit" style={{ background: 'var(--pos-warning)', color: '#000' }} onClick={handleReturn}>
                <i className="ri-arrow-go-back-line" /> {t('फिर्ता प्रक्रिया गर्नुहोस्', 'Process Return')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
