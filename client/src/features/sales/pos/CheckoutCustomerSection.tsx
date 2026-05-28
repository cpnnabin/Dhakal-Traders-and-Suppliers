import React from 'react';

export type CheckoutMode = 'staff' | 'customer';

export type CheckoutCustomerSectionProps = {
  mode: CheckoutMode;
  t: (ne: string, en: string) => string;
  apiCall: (endpoint: string, method?: string, body?: any) => Promise<any>;
  companyAddress: string;
  customerProfile?: any;
  selectedCustomer: any;
  setSelectedCustomer: (value: any) => void;
  customerSearch: string;
  setCustomerSearch: (value: string) => void;
  customerDropdown: boolean;
  setCustomerDropdown: (value: boolean) => void;
  filteredCustomers: any[];
  allCustomers: any[];
  checkoutPhone: string;
  setCheckoutPhone: (value: string) => void;
  customerAddress: string;
  setCustomerAddress: (value: string) => void;
  customerPan: string;
  setCustomerPan: (value: string) => void;
  showAddressPicker: boolean;
  setShowAddressPicker: (value: boolean) => void;
  newAddrName: string;
  setNewAddrName: (value: string) => void;
  newAddrPhone: string;
  setNewAddrPhone: (value: string) => void;
  newAddrAlias: string;
  setNewAddrAlias: (value: string) => void;
  newAddrLandmark: string;
  setNewAddrLandmark: (value: string) => void;
  newAddrAddress: string;
  setNewAddrAddress: (value: string) => void;
  newAddrCity: string;
  setNewAddrCity: (value: string) => void;
  newAddrZip: string;
  setNewAddrZip: (value: string) => void;
  invoiceMessage: string;
  setInvoiceMessage: (value: string) => void;
  deliveryType: string;
  setDeliveryType: (value: any) => void;
  eta: 'ASAP' | '15' | '30' | '60' | 'custom';
  setEta: (value: any) => void;
  customEta: string;
  setCustomEta: (value: string) => void;
  showToast: (message: string, type?: 'ok' | 'err') => void;
};

export default function CheckoutCustomerSection(props: CheckoutCustomerSectionProps) {
  const {
    mode, t, apiCall, companyAddress, customerProfile, selectedCustomer,
    setSelectedCustomer, customerSearch, setCustomerSearch, customerDropdown,
    setCustomerDropdown, filteredCustomers, allCustomers, checkoutPhone,
    setCheckoutPhone, customerAddress, setCustomerAddress, customerPan,
    setCustomerPan, showAddressPicker, setShowAddressPicker, newAddrName,
    setNewAddrName, newAddrPhone, setNewAddrPhone, newAddrAlias, setNewAddrAlias,
    newAddrLandmark, setNewAddrLandmark, newAddrAddress, setNewAddrAddress,
    newAddrCity, setNewAddrCity, newAddrZip, setNewAddrZip,
    invoiceMessage, setInvoiceMessage, deliveryType, setDeliveryType, eta,
    setEta, customEta, setCustomEta, showToast,
  } = props;

  const customerLabel = customerProfile?.full_name || customerProfile?.name || selectedCustomer?.full_name || selectedCustomer?.name || t('Guest', 'Guest');
  const customerPhone = customerProfile?.phone || selectedCustomer?.phone || checkoutPhone || '';
  const customerEmail = customerProfile?.email || selectedCustomer?.email || '';
  const customerAddressValue = customerProfile?.address || selectedCustomer?.address || customerAddress || companyAddress || '';
  const customerPanValue = customerProfile?.pan_no || customerProfile?.panNo || selectedCustomer?.pan_no || selectedCustomer?.panNo || selectedCustomer?.pan || customerPan || '';
  const initials = String(customerLabel || 'G').charAt(0).toUpperCase();

  const clearSelection = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCheckoutPhone('');
    setCustomerAddress('');
    setCustomerPan('');
    setCustomerDropdown(false);
  };

  const saveQuickAddress = async () => {
    if (!newAddrName && !newAddrPhone && !newAddrAddress) {
      showToast(t('भर्नुहोस्: नाम वा फोन वा ठेगाना', 'Please enter name, phone or address'), 'err');
      return;
    }

    const payload: any = {
      full_name: newAddrName || (newAddrAlias || 'Unknown'),
      name: newAddrName || (newAddrAlias || 'Unknown'),
      phone: newAddrPhone || '',
      address: newAddrAddress || '',
      landmark: newAddrLandmark || '',
      alias: newAddrAlias || '',
      city: newAddrCity || '',
      zip: newAddrZip || '',
    };

    try {
      const created = await apiCall('/customers', 'POST', payload);
      if (created && (created.customer || created.data || created.id || created.success)) {
        const cust = created.customer || created.data || { id: created.id, _id: created.id, ...payload };
        setSelectedCustomer(cust);
        setCustomerAddress(cust.address || payload.address || newAddrAddress);
        setCheckoutPhone(cust.phone || payload.phone || newAddrPhone);
        showToast(t('ठेगाना सुरक्षित भयो', 'Address saved'), 'ok');
        setNewAddrAlias('');
        setNewAddrName('');
        setNewAddrPhone('');
        setNewAddrAddress('');
        setNewAddrLandmark('');
        setNewAddrCity('');
        setNewAddrZip('');
        setShowAddressPicker(false);
      } else {
        showToast(t('ठेगाना सुरक्षित भएन', 'Failed to save address'), 'err');
      }
    } catch (err) {
      console.error('save address error', err);
      showToast(t('ठेगाना सुरक्षित गर्दा समस्या', 'Error saving address'), 'err');
    }
  };

  return (
    <div className="mw-rd-wrap" style={{ color: '#e5e7eb', padding: 20, borderRadius: 24, background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)', border: '1px solid rgba(251,191,36,.18)' }}>
      <div className="mw-layout-5" style={{ marginBottom: 12 }}>
        <h2>{mode === 'staff' ? t('ग्राहक र डेलिभरी', 'Customer & Delivery') : t('ग्राहक पुष्टि', 'Customer Verification')}</h2>
      </div>

      {mode === 'staff' ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="mw-address-card mw-address-card--compact" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(15,23,42,.72)', borderColor: 'rgba(251,191,36,.18)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,.12)' }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={customerSearch || (selectedCustomer?.full_name || selectedCustomer?.name || '')}
                  onChange={(e) => { setCustomerSearch(e.target.value); setCustomerDropdown(true); }}
                  placeholder={t('ग्राहक खोज्नुहोस् वा नयाँ थप्नुहोस्', 'Search customer or add new')}
                  className="mw-input"
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(148,163,184,.28)', background: '#0b1220', color: '#fff' }}
                />
                <button type="button" className="mw-btn mw-btn-sec" onClick={clearSelection}>{t('नयाँ', 'New')}</button>
              </div>

              {customerDropdown && filteredCustomers.length > 0 && (
                <div className="mw-customer-dropdown" style={{ marginTop: 8, border: '1px solid rgba(148,163,184,.22)', borderRadius: 12, background: '#0f172a', maxHeight: 220, overflowY: 'auto', boxShadow: '0 10px 24px rgba(15,23,42,.28)' }}>
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id || c._id}
                      type="button"
                      className="mw-customer-item"
                      onClick={() => { setSelectedCustomer(c); setCustomerDropdown(false); setCustomerSearch(''); setCheckoutPhone(c.phone || ''); setCustomerAddress(c.address || ''); setCustomerPan(c.pan_no || c.panNo || c.pan || ''); }}
                      style={{ width: '100%', padding: 10, display: 'flex', justifyContent: 'space-between', gap: 12, textAlign: 'left', border: 'none', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,.06)' }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{c.full_name || c.name}</div>
                        <div style={{ fontSize: 13, color: '#cbd5e1' }}>{c.phone || c.email || ''}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#fbbf24' }}>{Number(c.loyalty_points || 0).toLocaleString()} pts</div>
                    </button>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(251,191,36,.16)', color: '#fff', fontSize: 12, fontWeight: 700 }}>{selectedCustomer ? t('Selected customer', 'Selected customer') : t('Guest checkout', 'Guest checkout')}</span>
                {selectedCustomer ? (
                  <button type="button" className="mw-btn mw-btn-sec" onClick={clearSelection}>{t('Clear', 'Clear')}</button>
                ) : null}
              </div>

              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                <label className="mw-label-small" style={{ color: '#e5e7eb' }}>{t('नाम', 'Name')}</label>
                <input value={selectedCustomer?.full_name || selectedCustomer?.name || customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="mw-input" placeholder={t('ग्राहकको नाम', 'Customer name')} style={{ color: '#fff', background: '#0b1220', border: '1px solid rgba(148,163,184,.28)' }} />

                <label className="mw-label-small" style={{ color: '#e5e7eb' }}>{t('फोन', 'Phone')}</label>
                <input value={checkoutPhone} onChange={(e) => setCheckoutPhone(e.target.value)} className="mw-input" placeholder={t('फोन नम्बर', 'Phone number')} style={{ color: '#fff', background: '#0b1220', border: '1px solid rgba(148,163,184,.28)' }} />

                <label className="mw-label-small" style={{ color: '#e5e7eb' }}>Email</label>
                <input value={customerEmail} readOnly className="mw-input" placeholder="customer@example.com" style={{ opacity: 1, color: '#cbd5e1', background: '#111827', border: '1px solid rgba(148,163,184,.18)' }} />

                <label className="mw-label-small" style={{ color: '#e5e7eb' }}>{t('PAN', 'PAN')}</label>
                <input value={customerPan} onChange={(e) => setCustomerPan(e.target.value)} className="mw-input" placeholder={t('PAN', 'PAN')} style={{ color: '#fff', background: '#0b1220', border: '1px solid rgba(148,163,184,.28)' }} />

                <label className="mw-label-small" style={{ color: '#e5e7eb' }}>{t('ठेगाना', 'Address')}</label>
                <div style={{ display: 'grid', gap: 8 }}>
                  <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder={companyAddress} rows={3} className="mw-input" style={{ resize: 'vertical', color: '#fff', background: '#0b1220', border: '1px solid rgba(148,163,184,.28)' }} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="mw-btn mw-btn-sec" onClick={() => setShowAddressPicker(!showAddressPicker)}>{showAddressPicker ? t('Hide', 'Hide') : t('Choose', 'Choose')}</button>
                    <button type="button" className="mw-btn mw-btn-sec" onClick={() => { setCustomerAddress(companyAddress || ''); setShowAddressPicker(false); }}>{t('Use Shop Addr', 'Use Shop Addr')}</button>
                  </div>
                </div>
              </div>

              {showAddressPicker ? (
                <div style={{ marginTop: 8, border: '1px solid rgba(148,163,184,.22)', borderRadius: 16, overflow: 'hidden', background: '#0f172a' }}>
                  <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,.06)', fontWeight: 700, color: '#fff' }}>{t('Saved addresses', 'Saved addresses')}</div>
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {allCustomers.filter((c) => c.address).length === 0 ? (
                      <div style={{ padding: 12, color: '#cbd5e1' }}>{t('No saved addresses found', 'No saved addresses found')}</div>
                    ) : allCustomers.filter((c) => c.address).map((c) => (
                      <div key={c.id || c._id} style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{c.full_name || c.name}</div>
                          <div style={{ fontSize: 13, color: '#cbd5e1' }}>{c.address}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.phone || ''}</div>
                        </div>
                        <button type="button" className="mw-btn" onClick={() => { setCustomerAddress(c.address); setSelectedCustomer(c); setCheckoutPhone(c.phone || ''); setCustomerPan(c.pan_no || c.panNo || c.pan || ''); setShowAddressPicker(false); }}>{t('Select', 'Select')}</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,.08)', background: '#0b1220' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, color: '#fff' }}>{t('Add New Address', 'Add New Address')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                      <input value={newAddrName} onChange={(e) => setNewAddrName(e.target.value)} placeholder={t('Receiver Name', 'Receiver Name')} className="mw-input" style={{ color: '#fff', background: '#111827', border: '1px solid rgba(148,163,184,.28)' }} />
                      <input value={newAddrPhone} onChange={(e) => setNewAddrPhone(e.target.value)} placeholder={t('Phone Number', 'Phone Number')} className="mw-input" style={{ color: '#fff', background: '#111827', border: '1px solid rgba(148,163,184,.28)' }} />
                      <input value={newAddrAlias} onChange={(e) => setNewAddrAlias(e.target.value)} placeholder={t('Alias (optional)', 'Alias (optional)')} className="mw-input" style={{ color: '#fff', background: '#111827', border: '1px solid rgba(148,163,184,.28)' }} />
                      <input value={newAddrLandmark} onChange={(e) => setNewAddrLandmark(e.target.value)} placeholder={t('Nearest Landmark (optional)', 'Nearest Landmark (optional)')} className="mw-input" style={{ color: '#fff', background: '#111827', border: '1px solid rgba(148,163,184,.28)' }} />
                      <input value={newAddrCity} onChange={(e) => setNewAddrCity(e.target.value)} placeholder={t('City', 'City')} className="mw-input" style={{ color: '#fff', background: '#111827', border: '1px solid rgba(148,163,184,.28)' }} />
                      <input value={newAddrZip} onChange={(e) => setNewAddrZip(e.target.value)} placeholder={t('ZIP code', 'ZIP code')} className="mw-input" style={{ color: '#fff', background: '#111827', border: '1px solid rgba(148,163,184,.28)' }} />
                      <textarea value={newAddrAddress} onChange={(e) => setNewAddrAddress(e.target.value)} placeholder={t('Address', 'Address')} rows={3} style={{ gridColumn: '1 / -1', borderRadius: 12, padding: 10, border: '1px solid rgba(148,163,184,.28)', color: '#fff', background: '#111827' }} />
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" className="mw-btn mw-btn-sec" onClick={() => { setNewAddrAlias(''); setNewAddrName(''); setNewAddrPhone(''); setNewAddrAddress(''); setNewAddrLandmark(''); setNewAddrCity(''); setNewAddrZip(''); }}>{t('Clear', 'Clear')}</button>
                        <button type="button" className="mw-btn" onClick={saveQuickAddress}>{t('Add New Address', 'Add New Address')}</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: 12, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <label className="mw-label-small">{t('डेलिभरी प्रकार', 'Delivery Type')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={`mw-delivery-btn ${deliveryType === 'Pickup' ? 'active' : ''}`} onClick={() => setDeliveryType('Pickup')}>{t('Pickup', 'Pickup')}</button>
                <button type="button" className={`mw-delivery-btn ${deliveryType === 'Delivery' ? 'active' : ''}`} onClick={() => setDeliveryType('Delivery')}>{t('Delivery', 'Delivery')}</button>
              </div>

              <label className="mw-label-small">{t('अनुमानित समय', 'ETA')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={eta} onChange={(e) => setEta(e.target.value as any)} className="mw-input" style={{ flex: 1 }}>
                  <option value="ASAP">{t('ASAP', 'ASAP')}</option>
                  <option value="15">{t('15 मिनेट', '15 min')}</option>
                  <option value="30">{t('30 मिनेट', '30 min')}</option>
                  <option value="60">{t('1 घण्टा', '1 hour')}</option>
                  <option value="custom">{t('अन्य', 'Other')}</option>
                </select>
                {eta === 'custom' ? (
                  <input type="time" value={customEta} onChange={(e) => setCustomEta(e.target.value)} className="mw-input" />
                ) : null}
              </div>

              <label className="mw-label-small">{t('नोट', 'Note')}</label>
              <input type="text" value={invoiceMessage} onChange={(e) => setInvoiceMessage(e.target.value)} placeholder={t('डेलिभरी निर्देशहरू', 'Delivery instructions')} className="mw-input" />
            </div>

            <div style={{ padding: 14, borderRadius: 18, background: 'rgba(15,23,42,.72)', border: '1px solid rgba(251,191,36,.18)', color: '#fff' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.16em', color: '#fbbf24', marginBottom: 8 }}>{t('Logged in customer', 'Logged in customer')}</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{customerLabel}</div>
              <div style={{ color: '#cbd5e1', marginTop: 4 }}>{customerPhone || t('No phone', 'No phone')}</div>
              <div style={{ color: '#cbd5e1', marginTop: 4 }}>{customerEmail || '—'}</div>
              <div style={{ color: '#cbd5e1', marginTop: 4 }}>{customerAddressValue}</div>
              <div style={{ marginTop: 10, fontSize: 13, color: '#fbbf24' }}>{customerPanValue ? `${t('PAN', 'PAN')}: ${customerPanValue}` : t('No PAN on file', 'No PAN on file')}</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 20, background: 'rgba(15,23,42,.72)', border: '1px solid rgba(251,191,36,.18)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(236,253,245,.95)', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, border: '1px solid rgba(16,185,129,.18)' }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: '#fbbf24' }}>{t('Self checkout mode', 'Self checkout mode')}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{customerLabel}</div>
              <div style={{ color: '#cbd5e1', marginTop: 4 }}>{customerPhone || t('No phone', 'No phone')}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <label className="mw-label-small">Email</label>
            <input value={customerEmail} readOnly className="mw-input" style={{ color: '#fff', background: '#111827', border: '1px solid rgba(148,163,184,.18)' }} />

            <label className="mw-label-small">{t('फोन', 'Phone')}</label>
            <input value={customerPhone} readOnly className="mw-input" style={{ color: '#fff', background: '#111827', border: '1px solid rgba(148,163,184,.18)' }} />

            <label className="mw-label-small">{t('ठेगाना', 'Address')}</label>
            <textarea value={customerAddressValue} readOnly rows={3} className="mw-input" style={{ color: '#fff', background: '#111827', border: '1px solid rgba(148,163,184,.18)' }} />

            <label className="mw-label-small">{t('PAN', 'PAN')}</label>
            <input value={customerPanValue} readOnly className="mw-input" style={{ color: '#fff', background: '#111827', border: '1px solid rgba(148,163,184,.18)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: 12, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <label className="mw-label-small">{t('डेलिभरी प्रकार', 'Delivery Type')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={`mw-delivery-btn ${deliveryType === 'Pickup' ? 'active' : ''}`} onClick={() => setDeliveryType('Pickup')}>{t('Pickup', 'Pickup')}</button>
                <button type="button" className={`mw-delivery-btn ${deliveryType === 'Delivery' ? 'active' : ''}`} onClick={() => setDeliveryType('Delivery')}>{t('Delivery', 'Delivery')}</button>
              </div>

              <label className="mw-label-small">{t('अनुमानित समय', 'ETA')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={eta} onChange={(e) => setEta(e.target.value as any)} className="mw-input" style={{ flex: 1 }}>
                  <option value="ASAP">{t('ASAP', 'ASAP')}</option>
                  <option value="15">{t('15 मिनेट', '15 min')}</option>
                  <option value="30">{t('30 मिनेट', '30 min')}</option>
                  <option value="60">{t('1 घण्टा', '1 hour')}</option>
                  <option value="custom">{t('अन्य', 'Other')}</option>
                </select>
                {eta === 'custom' ? (
                  <input type="time" value={customEta} onChange={(e) => setCustomEta(e.target.value)} className="mw-input" />
                ) : null}
              </div>

              <label className="mw-label-small">{t('नोट', 'Note')}</label>
              <input type="text" value={invoiceMessage} onChange={(e) => setInvoiceMessage(e.target.value)} placeholder={t('डेलिभरी निर्देशहरू', 'Delivery instructions')} className="mw-input" />
            </div>

            <div style={{ padding: 14, borderRadius: 18, background: 'rgba(15,23,42,.72)', border: '1px solid rgba(251,191,36,.18)', color: '#fff' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.16em', color: '#fbbf24', marginBottom: 8 }}>{t('Verified customer', 'Verified customer')}</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{customerLabel}</div>
              <div style={{ color: '#cbd5e1', marginTop: 4 }}>{customerProfile?.email || customerEmail || '—'}</div>
              <div style={{ color: '#cbd5e1', marginTop: 4 }}>{customerAddressValue}</div>
              <div style={{ marginTop: 10, fontSize: 13, color: '#fbbf24' }}>{customerPanValue ? `${t('PAN', 'PAN')}: ${customerPanValue}` : t('No PAN on file', 'No PAN on file')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
