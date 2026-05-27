import React from 'react';
import { usePOS } from './POSContext';

export default function CustomersPage() {
  const { customers, setCustomers, sales, apiCall, t, products, users, cashier } = usePOS();
  
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [loginId, setLoginId] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [alternativeAddress, setAlternativeAddress] = React.useState('');
  const [alternativePhone, setAlternativePhone] = React.useState('');
  const [panNo, setPanNo] = React.useState('');
  const [productToBuy, setProductToBuy] = React.useState('');
  const [type, setType] = React.useState('retail');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const [editId, setEditId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<any>({});
  
  const [selectedAccountCustomer, setSelectedAccountCustomer] = React.useState<any>(null);
  const [searchQ, setSearchQ] = React.useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { alert(t('नाम र फोन अनिवार्य छ!', 'Name and phone required!')); return; }
    
    // Default password to phone number if empty
    const finalPassword = password.trim() || phone.trim();
    const newCustomer = { 
      name: name.trim(), 
      phone: phone.trim(), 
      email: email.trim(), 
      login_id: loginId.trim(),
      address: address.trim(), 
      alternativeAddress: alternativeAddress.trim(),
      alternativePhone: alternativePhone.trim(),
      panNo: panNo.trim(), 
      productToBuy: productToBuy.trim(),
      type, 
      password: finalPassword 
    };
    const res = await apiCall('/customers', 'POST', newCustomer);
    if (res.success) {
      setCustomers(prev => [...prev, res.customer]);
      alert(t('नयाँ ग्राहक थपियो!', 'Customer added!'));
      setName(''); setPhone(''); setEmail(''); setLoginId(''); setAddress(''); setAlternativeAddress(''); setAlternativePhone(''); setPanNo(''); setPassword(''); setProductToBuy('');
    } else {
      alert(t('त्रुटि भयो: ' + res.error, 'Error: ' + res.error));
    }
  };

  const startEdit = (customer: any) => {
    setEditId(customer._id);
    setEditForm({ 
      name: customer.name, 
      phone: customer.phone, 
      email: customer.email || '', 
      login_id: customer.login_id || '',
      address: customer.address || '', 
      alternativeAddress: customer.alternativeAddress || '',
      alternativePhone: customer.alternativePhone || '',
      panNo: customer.panNo || '', 
      productToBuy: customer.productToBuy || '',
      type: customer.type || 'retail', 
      password: customer.password || '' 
    });
  };

  const saveEdit = async (customer: any) => {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      alert(t('नाम र फोन अनिवार्य छ!', 'Name and phone are required!'));
      return;
    }
    const payload = { _id: customer._id, ...editForm };
    const res = await apiCall('/customers', 'POST', payload);
    if (res.success) {
      setCustomers(prev => prev.map(c => c._id === customer._id ? { ...c, ...payload } : c));
      setEditId(null);
      alert(t('ग्राहक विवरण अपडेट भयो!', 'Customer details updated!'));
    } else {
      alert(t('त्रुटि भयो: ' + res.error, 'Error: ' + res.error));
    }
  };

  const mergedCustomers = customers.map(c => {
    const linked = users.find((u: any) => String(u._id) === String(c.login_id) || String(u.username || '').toLowerCase() === String(c.login_id || '').toLowerCase());
    return {
      ...c,
      displayName: c.full_name || c.name || linked?.full_name || linked?.name || c.login_id || 'Customer',
      displayEmail: c.email || linked?.email || '',
      displayPhone: c.phone || linked?.phone || '',
      displayPan: c.pan_no || c.panNo || linked?.pan_no || linked?.panNo || ''
    };
  });

  const filteredCustomers = mergedCustomers.filter((c: any) => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return true;
    return [c.displayName, c.displayPhone, c.displayEmail, c.displayPan]
      .filter(Boolean)
      .some((v: any) => String(v).toLowerCase().includes(q));
  });


  return (
    <div>
      <div className="pos-form-panel">
        <h3 className="pos-panel-title" style={{ marginBottom: 16 }}>
          <i className="ri-user-add-line" />
          {t('नयाँ ग्राहक थप्नुहोस्', 'Add New Customer')}
        </h3>
        <form onSubmit={handleAdd}>
          <div className="pos-form-grid">
            <div className="pos-input-group">
              <label>{t('पूरा नाम', 'Full Name')}</label>
              <input type="text" className="pos-form-input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="pos-input-group">
              <label>{t('फोन नम्बर', 'Phone Number')}</label>
              <input type="text" className="pos-form-input" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
            <div className="pos-input-group">
              <label>{t('इमेल', 'Email')}</label>
              <input type="email" className="pos-form-input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="pos-input-group">
              <label>{t('लगइन आईडी (Login ID)', 'Login ID / Username')}</label>
              <input type="text" className="pos-form-input" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="customer123" />
            </div>
            <div className="pos-input-group">
              <label>{t('ठेगाना', 'Address')}</label>
              <input type="text" className="pos-form-input" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="pos-input-group">
              <label>{t('वैकल्पिक ठेगाना', 'Alternative Address')}</label>
              <input type="text" className="pos-form-input" value={alternativeAddress} onChange={e => setAlternativeAddress(e.target.value)} />
            </div>
            <div className="pos-input-group">
              <label>{t('वैकल्पिक फोन नम्बर', 'Alternative Phone')}</label>
              <input type="text" className="pos-form-input" value={alternativePhone} onChange={e => setAlternativePhone(e.target.value)} />
            </div>
            <div className="pos-input-group">
              <label>{t('प्यान नम्बर (ग्राहक)', 'Customer PAN No')}</label>
              <input type="text" className="pos-form-input" value={panNo} onChange={e => setPanNo(e.target.value)} />
            </div>
              <div className="pos-input-group">
                <label>{t('अर्डर गर्ने उत्पादन', 'Product to buy')}</label>
                <select className="pos-form-input" value={productToBuy} onChange={e => setProductToBuy(e.target.value)}>
                  <option value="">{t('कुनै चयन छैन', 'None')}</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.nameEn}>{p.nameEn} / {p.nameNe}</option>
                  ))}
                </select>
              </div>
            <div className="pos-input-group">
              <label>{t('प्रकार', 'Type')}</label>
              <select className="pos-form-input" value={type} onChange={e => setType(e.target.value)}>
                <option value="retail">{t('खुद्रा (Retail)', 'Retail')}</option>
                <option value="wholesale">{t('थोक (Wholesale)', 'Wholesale')}</option>
                <option value="farmer">{t('किसान (Farmer)', 'Farmer')}</option>
              </select>
            </div>
            <div className="pos-input-group">
              <label>{t('पासवर्ड / पिन (पूर्वनिर्धारित: फोन)', 'Password / PIN (Default: Phone)')}</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="pos-form-input" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder={phone || ''} 
                  style={{ paddingRight: 40 }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(s => !s)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                >
                  <i className={showPassword ? "ri-eye-line" : "ri-eye-off-line"} style={{ fontSize: 16 }} />
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="submit" className="pos-form-submit">
              {t('ग्राहक दर्ता गर्नुहोस्', 'Register Customer')}
            </button>
          </div>
        </form>
      </div>

      <div className="pos-panel">
          <div className="pos-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 className="pos-panel-title" style={{ margin: 0 }}>
            <i className="ri-team-line" />
            {t('ग्राहक सूची', 'Customer List')}
          </h3>
          {cashier?.role === 'admin' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={t('नाम, फोन, इमेल वा PAN खोज्नुहोस्...', 'Search name, phone, email or PAN...')} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid #CBD5E1' }} />
            </div>
          ) : null}
        </div>
        <div className="pos-table-wrap">
          <table className="pos-table">
            <thead>
              <tr>
                <th>{t('पूरा नाम', 'Name')}</th>
                <th>{t('फोन नम्बर', 'Phone')}</th>
                <th>{t('इमेल', 'Email')}</th>
                <th>{t('लगइन आईडी', 'Login ID')}</th>
                <th>{t('ठेगाना', 'Address')}</th>
                <th>{t('वैकल्पिक ठेगाना', 'Alt Address')}</th>
                <th>{t('वैकल्पिक नम्बर', 'Alt Phone')}</th>
                <th>{t('प्यान', 'PAN')}</th>
                  <th>{t('अर्डर गर्ने उत्पादन', 'Product')}</th>
                <th>{t('प्रकार', 'Type')}</th>
                <th>{t('पासवर्ड', 'Password')}</th>
                <th>{t('कार्य', 'Action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c: any, idx: number) => {
                const isEditing = editId === c._id;
                return (
                <tr key={c._id || idx}>
                  <td>
                    {isEditing ? (
                      <input className="pos-form-input" style={{ width: 120, padding: 4 }} value={editForm.full_name || editForm.name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value, name: e.target.value })} />
                    ) : (
                      <strong>{c.displayName || c.full_name || c.name}</strong>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="pos-form-input" style={{ width: 100, padding: 4 }} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                    ) : (
                      c.displayPhone || c.phone
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="email" className="pos-form-input" style={{ width: 140, padding: 4 }} value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                    ) : (
                      c.displayEmail || c.email
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="pos-form-input" style={{ width: 140, padding: 4 }} value={editForm.login_id} onChange={e => setEditForm({ ...editForm, login_id: e.target.value })} />
                    ) : (
                      c.login_id || '-'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="pos-form-input" style={{ width: 140, padding: 4 }} value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                    ) : (
                      c.address || '-'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="pos-form-input" style={{ width: 140, padding: 4 }} value={editForm.alternativeAddress || ''} onChange={e => setEditForm({ ...editForm, alternativeAddress: e.target.value })} />
                    ) : (
                      c.alternativeAddress || '-'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="pos-form-input" style={{ width: 100, padding: 4 }} value={editForm.alternativePhone || ''} onChange={e => setEditForm({ ...editForm, alternativePhone: e.target.value })} />
                    ) : (
                      c.alternativePhone || '-'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="pos-form-input" style={{ width: 100, padding: 4 }} value={editForm.pan_no || editForm.panNo} onChange={e => setEditForm({ ...editForm, pan_no: e.target.value, panNo: e.target.value })} />
                    ) : (
                      c.displayPan || c.pan_no || c.panNo || '-'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="pos-form-input" style={{ width: 140, padding: 4 }} value={editForm.productToBuy || ''} onChange={e => setEditForm({ ...editForm, productToBuy: e.target.value })} />
                    ) : (
                      c.productToBuy || '-'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select className="pos-form-select" style={{ padding: 4 }} value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                        <option value="retail">Retail</option>
                        <option value="wholesale">Wholesale</option>
                        <option value="farmer">Farmer</option>
                      </select>
                    ) : (
                      c.type === 'retail' ? t('खुद्रा', 'Retail') : c.type === 'wholesale' ? t('थोक', 'Wholesale') : t('किसान', 'Farmer')
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="pos-form-input" style={{ width: 100, padding: 4 }} value={editForm.password || ''} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                    ) : (
                      c.password || c.phone || '12345'
                    )}
                  </td>
                  <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                      {isEditing ? (
                        <>
                          <button className="pos-form-submit" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => saveEdit(c)}>Save</button>
                          <button className="pos-sec-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setEditId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="pos-form-submit" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setSelectedAccountCustomer(c)}>
                            {t('खाता', 'Account')}
                          </button>
                          {cashier?.role === 'admin' && (
                            <button className="pos-form-submit" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { window.location.href = `/pos?customerId=${c._id}`; }}>
                              {t('बिलिङ (POS)', 'Billing (POS)')}
                            </button>
                          )}
                          <button className="pos-sec-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startEdit(c)}>
                            {t('परिमार्जन', 'Edit')}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Customer Account Ledger Modal ── */}
      {selectedAccountCustomer && (() => {
        const customerSales = sales.filter(s => s.customerId === selectedAccountCustomer._id || s.customerId === selectedAccountCustomer.id);
        const totalSpent = customerSales.reduce((sum, s) => sum + s.total, 0);
        return (
          <div className="pos-modal-overlay">
            <div className="pos-modal" style={{ width: 600, background: 'var(--pos-sidebar-bg)', color: 'var(--pos-text)' }}>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-card-border)', paddingBottom: 10, marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>
                    👤 {selectedAccountCustomer.full_name || selectedAccountCustomer.name} - {t('खाता विवरण', 'Account Ledger')}
                  </h3>
                  <button className="pos-table-delete" style={{ fontSize: 20 }} onClick={() => setSelectedAccountCustomer(null)}>✕</button>
                </div>
                
                {/* Stats cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, border: '1px solid var(--pos-card-border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--pos-text-muted)' }}>{t('कुल खरिद (Total Purchases)', 'Total Visits / Orders')}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{customerSales.length}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, border: '1px solid var(--pos-card-border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--pos-text-muted)' }}>{t('कुल खर्च (Total Spent)', 'Total Spent')}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: 'var(--pos-success)' }}>NRS {totalSpent.toLocaleString()}</div>
                  </div>
                </div>

                <h4 style={{ margin: '0 0 10px 0', fontSize: 14 }}>{t('खरिद इतिहास (Purchase History)', 'Purchase History')}</h4>
                <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid var(--pos-card-border)', borderRadius: 8 }}>
                  <table className="pos-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>{t('मिति', 'Date')}</th>
                        <th>{t('बिल ID', 'Invoice ID')}</th>
                        <th>{t('सामानहरू', 'Items')}</th>
                        <th>{t('जम्मा', 'Total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerSales.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--pos-text-muted)' }}>
                            {t('कुनै रेकर्ड फेला परेन।', 'No purchase records found.')}
                          </td>
                        </tr>
                      ) : (
                        customerSales.map(s => (
                          <tr key={s.id}>
                            <td>{s.date.split(',')[0]}</td>
                            <td><strong style={{ color: 'var(--pos-primary)' }}>{s.id}</strong></td>
                            <td style={{ fontSize: 12 }}>
                              {s.items.map(i => `${i.name} (x${i.qty})`).join(', ')}
                            </td>
                            <td style={{ fontWeight: 700 }}>NRS {s.total}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <button className="pos-sec-btn" onClick={() => setSelectedAccountCustomer(null)}>{t('बन्द गर्नुहोस्', 'Close')}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
