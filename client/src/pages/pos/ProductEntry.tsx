// ─── POS Page: Product Entry + Stock/Expiry (Combined) ───────────────────────
import React, { useEffect, useState, useRef } from 'react';
import { usePOS } from './POSContext';
import { Product } from './posTypes';
import ImageUpload from '../../components/ImageUpload';
import { resolveProductImageUrl } from '../../utils/productImage';

const EMOJIS = ['📦','🌿','🫚','🌾','🥫','🌻','🍃','🧂','🫙','🫛','🍵','🥜','🧴','🌶️','🫑'];

export default function ProductEntryPage() {
  const { products, setProducts, apiCall, t, reloadProducts } = usePOS();
  const uploadRef = useRef<any>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  const [tab, setTab] = useState<'add' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStock, setFilterStock] = useState('all');

  const [nameNe,   setNameNe]   = useState('');
  const [nameEn,   setNameEn]   = useState('');
  const [id,       setId]       = useState('');
  const [unit,     setUnit]     = useState('kg');
  const [stock,    setStock]    = useState(0);
  const [purPrice, setPurPrice] = useState(0);
  const [selPrice, setSelPrice] = useState(0);
  const [emoji,    setEmoji]    = useState('📦');
  const [cat,      setCat]      = useState<Product['category']>('herbs');
  const [expiry,   setExpiry]   = useState('');
  const [batch,    setBatch]    = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-category from product name
  useEffect(() => {
    const name = nameEn.toLowerCase();
    if (/rice|dal|grain|wheat|corn|maize/.test(name)) setCat('grains');
    else if (/herb|ginger|garlic|timur|hemp|beans|turmeric/.test(name)) setCat('herbs');
    else if (/oil|salt|sugar|spice|soap|tea/.test(name)) setCat('daily');
  }, [nameEn]);

  const margin = selPrice > 0 && purPrice > 0 ? ((selPrice - purPrice) / selPrice * 100).toFixed(1) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim() || !nameNe.trim()) { alert(t('कृपया नाम भर्नुहोस्!', 'Please fill in both product names!')); return; }
    setSaving(true);
    // If user selected a file in the ImageUpload but didn't click Upload, try to upload now
    try {
      if (!imageUrl && uploadRef.current && typeof uploadRef.current.upload === 'function') {
        // wait for any in-progress upload to finish (ImageUpload.auto-upload may be running)
        const uploaded = await uploadRef.current.upload();
        if (uploaded) setImageUrl(uploaded);
      }
    } catch (err) {
      console.warn('Image auto-upload failed', err);
    }
    const next: Product = {
      id: id.trim() || editingId || String(1001 + products.length),
      nameEn: nameEn.trim(), nameNe: nameNe.trim(),
      category: cat, stock, unit,
      purchasePrice: purPrice, sellingPrice: selPrice, emoji,
      expiryDate: expiry, batchNo: batch, imageUrl
    };
    const res = await apiCall('/products', 'POST', next);
    const saved = res.success ? res.product : next;
    setProducts(prev => {
      const existing = prev.find(p => p.id === next.id);
      const updated = existing ? prev.map(p => p.id === next.id ? saved : p) : [...prev, saved];
      localStorage.setItem('dt_pos_products', JSON.stringify(updated));
      return updated;
    });
    setSaving(false);
    alert(t('उत्पादन सुरक्षित गरियो!', 'Product saved!'));
    resetForm();
    setTab('list');
    // Ensure canonical server data is loaded (in case other clients modified DB)
    try { reloadProducts(); } catch (e) { /* ignore */ }
  };

  const resetForm = () => {
    setNameEn(''); setNameNe(''); setId(''); setStock(0); setPurPrice(0); setSelPrice(0);
    setExpiry(''); setBatch(''); setImageUrl(''); setEditingId(null); setEmoji('📦'); setCat('herbs');
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id); setId(p.id); setNameEn(p.nameEn); setNameNe(p.nameNe); setUnit(p.unit);
    setStock(p.stock); setPurPrice(p.purchasePrice); setSelPrice(p.sellingPrice);
    setEmoji(p.emoji); setCat(p.category); setExpiry(p.expiryDate || ''); setBatch(p.batchNo || ''); setImageUrl(p.imageUrl || p.image || '');
    setTab('add');
  };

  const handleUpdateStock = async (pid: string, delta: number) => {
    setProducts(prev => {
      const updated = prev.map(p => p.id === pid ? { ...p, stock: Math.max(0, p.stock + delta) } : p);
      localStorage.setItem('dt_pos_products', JSON.stringify(updated));
      return updated;
    });
  };

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.nameEn.toLowerCase().includes(q) || p.nameNe.includes(q) || p.id.includes(q);
    const matchCat = filterCat === 'all' || p.category === filterCat;
    const matchStock = filterStock === 'all' || (filterStock === 'out' && p.stock <= 0) || (filterStock === 'low' && p.stock > 0 && p.stock < 50) || (filterStock === 'ok' && p.stock >= 50);
    return matchSearch && matchCat && matchStock;
  });

  const expiryDays = (date: string) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 86400));
  };

  return (
    <div className="product-entry-wrap">
      <div className="pe-tabs">
        <button className={`pe-tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>
          <i className="ri-list-check-2" /> {t('सामान सूची', 'Product List')}
          <span className="tab-count">{products.length}</span>
        </button>
        <button className={`pe-tab ${tab === 'add' ? 'active' : ''}`} onClick={() => { resetForm(); setTab('add'); }}>
          <i className="ri-add-box-line" /> {editingId ? t('सम्पादन', 'Edit Product') : t('नयाँ सामान', 'Add Product')}
        </button>
      </div>

      {/* ── Product List + Stock ── */}
      {tab === 'list' && (
        <div className="pe-list-view">
          <div className="pe-filters">
            <div className="pe-search-wrap">
              <i className="ri-search-line" />
              <input type="text" className="pe-search" placeholder={t('नाम वा बारकोड खोज्नुहोस्...', 'Search by name or barcode...')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="pos-form-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">{t('सबै श्रेणी', 'All Categories')}</option>
              <option value="herbs">{t('जडीबुटी', 'Herbs')}</option>
              <option value="grains">{t('अन्न', 'Grains')}</option>
              <option value="daily">{t('दैनिक', 'Daily Items')}</option>
              <option value="supplies">{t('सामग्री', 'Supplies')}</option>
            </select>
            <select className="pos-form-select" value={filterStock} onChange={e => setFilterStock(e.target.value)}>
              <option value="all">{t('सबै स्टक', 'All Stock')}</option>
              <option value="out">{t('स्टक छैन', 'Out of Stock')}</option>
              <option value="low">{t('कम स्टक', 'Low Stock (&lt;50)')}</option>
              <option value="ok">{t('ठीक स्टक', 'Stock OK')}</option>
            </select>
          </div>

          <div className="pe-product-table-wrap">
            <table className="pos-table pe-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>{t('सामान', 'Product')}</th>
                  <th>{t('श्रेणी', 'Category')}</th>
                  <th>{t('खरिद मूल्य', 'Purchase')}</th>
                  <th>{t('बिक्री मूल्य', 'Selling')}</th>
                  <th>{t('मार्जिन', 'Margin')}</th>
                  <th>{t('स्टक', 'Stock')}</th>
                  <th>{t('म्याद', 'Expiry')}</th>
                  <th>{t('कार्य', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32 }}><i className="ri-inbox-line" style={{ fontSize: 24 }} /> <br />{t('कुनै सामान भेटिएन', 'No products found')}</td></tr>
                )}
                {filteredProducts.map(p => {
                  const days = expiryDays(p.expiryDate || '');
                  const stockStatus = p.stock <= 0 ? 'out' : p.stock < 50 ? 'low' : 'ok';
                  const margin = p.sellingPrice > 0 ? ((p.sellingPrice - p.purchasePrice) / p.sellingPrice * 100).toFixed(0) : '0';
                  const thumb = resolveProductImageUrl(p.imageUrl || p.image || '');
                  return (
                    <tr key={p.id} className={`pe-row pe-row--${stockStatus}`}>
                      <td className="pe-emoji">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={p.nameEn}
                            style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.style.display = 'inline-flex';
                            }}
                          />
                        ) : null}
                        <span style={{ display: thumb ? 'none' : 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {p.emoji}
                        </span>
                      </td>
                      <td>
                        <div className="pe-product-name">
                          <strong>{t(p.nameNe, p.nameEn)}</strong>
                          <span className="pe-sku">{p.id}</span>
                        </div>
                      </td>
                      <td><span className={`pos-badge ${p.category === 'herbs' ? 'green' : p.category === 'grains' ? 'blue' : 'yellow'}`}>{p.category}</span></td>
                      <td>रू {p.purchasePrice}/{p.unit}</td>
                      <td>रू {p.sellingPrice}/{p.unit}</td>
                      <td><span className={`pe-margin ${Number(margin) < 10 ? 'low' : ''}`}>{margin}%</span></td>
                      <td>
                        <div className="pe-stock-ctrl">
                          <button className="pe-stock-btn" onClick={() => handleUpdateStock(p.id, -10)}>-10</button>
                          <span className={`pe-stock-val ${stockStatus}`}>{p.stock}</span>
                          <button className="pe-stock-btn" onClick={() => handleUpdateStock(p.id, 10)}>+10</button>
                        </div>
                        <div className="pe-stock-unit">{p.unit}</div>
                        {stockStatus === 'out' && <span className="pe-out-badge">{t('स्टक छैन!', 'OUT')}</span>}
                      </td>
                      <td>
                        {p.expiryDate ? (
                          <span className={`pe-expiry ${days !== null && days < 30 ? (days < 0 ? 'expired' : 'expiring') : 'ok'}`}>
                            {p.expiryDate}
                            {days !== null && days < 30 && <><br /><small>{days < 0 ? t('म्याद सकियो!', 'Expired!') : `${days}d ${t('बाँकी', 'left')}`}</small></>}
                          </span>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td>
                        <button className="pos-sec-btn small" onClick={() => handleEdit(p)}><i className="ri-edit-line" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Stock summary bar */}
          <div className="pe-stock-summary">
            <div className="pss-item red"><i className="ri-close-circle-line" /> {products.filter(p => p.stock <= 0).length} {t('स्टक छैन', 'Out of Stock')}</div>
            <div className="pss-item yellow"><i className="ri-alert-line" /> {products.filter(p => p.stock > 0 && p.stock < 50).length} {t('कम स्टक', 'Low Stock')}</div>
            <div className="pss-item orange"><i className="ri-time-line" /> {products.filter(p => { const d = expiryDays(p.expiryDate || ''); return d !== null && d > 0 && d < 30; }).length} {t('म्याद सकिन लागेको', 'Expiring Soon')}</div>
            <div className="pss-item green"><i className="ri-checkbox-circle-line" /> {products.filter(p => p.stock >= 50).length} {t('स्टक ठीक', 'Good Stock')}</div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form ── */}
      {tab === 'add' && (
        <div className="pe-add-form">
          <form onSubmit={handleSubmit}>
            <div className="pe-form-header">
              <h3>{editingId ? t('उत्पादन सम्पादन गर्नुहोस्', 'Edit Product') : t('नयाँ उत्पादन दर्ता', 'Register New Product')}</h3>
              {editingId && <span className="pe-editing-id">ID: {editingId}</span>}
            </div>

            {/* Emoji picker */}
            <div className="pe-emoji-picker">
              <label>{t('आइकन छान्नुहोस्', 'Pick Icon')}</label>
              <div className="pe-emoji-grid">
                {EMOJIS.map(e => (
                  <button type="button" key={e} className={`pe-emoji-btn ${emoji === e ? 'active' : ''}`} onClick={() => setEmoji(e)}>{e}</button>
                ))}
                <input type="text" className="pos-form-input" style={{ width: 60 }} value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2} />
              </div>
            </div>

            <div className="pos-form-grid thirds">
              <div className="pos-input-group">
                <label>{t('बारकोड / SKU', 'Barcode / SKU')}</label>
                <input type="text" className="pos-form-input" value={id} onChange={e => setId(e.target.value)} placeholder={t('खाली राख्नुहोस् स्वतः बन्नेछ', 'Leave blank for auto')} />
              </div>
              <div className="pos-input-group">
                <label>{t('नाम (नेपाली) *', 'Name (Nepali) *')}</label>
                <input type="text" className="pos-form-input" value={nameNe} onChange={e => setNameNe(e.target.value)} required />
              </div>
              <div className="pos-input-group">
                <label>{t('Name (English) *', 'Name (English) *')}</label>
                <input type="text" className="pos-form-input" value={nameEn} onChange={e => setNameEn(e.target.value)} required />
              </div>
            </div>

            <div className="pos-form-grid thirds">
              <div className="pos-input-group">
                <label>{t('श्रेणी', 'Category')}</label>
                <select className="pos-form-select" value={cat} onChange={e => setCat(e.target.value as Product['category'])}>
                  <option value="herbs">{t('जडीबुटी', 'Herbs')}</option>
                  <option value="grains">{t('अन्न', 'Grains')}</option>
                  <option value="daily">{t('दैनिक', 'Daily Items')}</option>
                  <option value="supplies">{t('सामग्री', 'Supplies')}</option>
                </select>
              </div>
              <div className="pos-input-group">
                <label>{t('एकाइ', 'Unit')}</label>
                <select className="pos-form-select" value={unit} onChange={e => setUnit(e.target.value)}>
                  <option value="kg">kg</option>
                  <option value="gram">gram</option>
                  <option value="liter">liter</option>
                  <option value="ml">ml</option>
                  <option value="packet">packet</option>
                  <option value="piece">piece</option>
                  <option value="dozen">dozen</option>
                  <option value="quintal">quintal</option>
                </select>
              </div>
              <div className="pos-input-group">
                <label>{t('प्रारम्भिक स्टक', 'Initial Stock')}</label>
                <input type="number" min={0} className="pos-form-input" value={stock} onChange={e => setStock(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <div className="pos-form-grid thirds">
              <div className="pos-input-group">
                <label>{t('खरिद मूल्य (रू)', 'Purchase Price (NRS)')}</label>
                <input type="number" min={0} className="pos-form-input" value={purPrice} onChange={e => setPurPrice(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="pos-input-group">
                <label>{t('बिक्री मूल्य (रू)', 'Selling Price (NRS)')}</label>
                <input type="number" min={0} className="pos-form-input" value={selPrice} onChange={e => setSelPrice(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="pos-input-group">
                <label>{t('मार्जिन', 'Margin')}</label>
                <div className={`pe-margin-display ${margin && Number(margin) < 10 ? 'low' : 'ok'}`}>
                  {margin ? `${margin}%` : '-'}
                  {margin && Number(margin) < 10 && <span className="pe-margin-warn">⚠️ {t('कम मार्जिन', 'Low margin')}</span>}
                </div>
              </div>
            </div>

            <div className="pos-form-grid thirds">
              <div className="pos-input-group">
                <label>{t('म्याद मिति', 'Expiry Date')}</label>
                <input type="date" className="pos-form-input" value={expiry} onChange={e => setExpiry(e.target.value)} />
              </div>
              <div className="pos-input-group">
                <label>{t('ब्याच नं', 'Batch No.')}</label>
                <input type="text" className="pos-form-input" value={batch} onChange={e => setBatch(e.target.value)} placeholder={t('ऐच्छिक', 'Optional')} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
                <ImageUpload
                title={t('उत्पादन फोटो', 'Product Image')}
                initialImageUrl={imageUrl || ''}
                buttonLabel={t('फोटो अपलोड', 'Upload Product Image')}
                onUploaded={(url) => setImageUrl(url)}
                ref={uploadRef}
                onUploadingChange={(is, prog) => { setUploading(is); setUploadProgress(prog || 0); }}
              />
            </div>

            <div className="form-actions">
              <button type="button" className="pos-sec-btn" onClick={() => { resetForm(); setTab('list'); }}>{t('रद्द', 'Cancel')}</button>
              <button type="submit" className="pos-form-submit" disabled={saving || uploading}>
                <i className="ri-save-line" /> {saving ? t('सुरक्षित हुँदैछ...', 'Saving...') : uploading ? `${t('अपलोड हुँदैछ', 'Uploading')} ${uploadProgress}%` : t('सुरक्षित गर्नुहोस्', 'Save Product')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
