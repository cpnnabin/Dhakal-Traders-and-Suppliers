import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { useLanguage } from '../LanguageContext';
import { useReveal } from '../hooks/useReveal';
import CopyableContact from '../components/CopyableContact';
import { productsGrid } from '../data/productsGrid';
import { getPOSSession } from './POSLogin';

const Contact = () => {
  const { lang } = useLanguage();
  const ref = useReveal();
  const t = (ne: string, en: string) => lang === 'en' ? en : ne;

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [orderMode, setOrderMode] = useState(false);
  const [orderProduct, setOrderProduct] = useState<{ name: string } | null>(null);
  const [orderQty, setOrderQty] = useState<number>(1);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ id?: string; order?: any } | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.name) return setError(t('नाम आवश्यक छ', 'Name is required'));
    if (!formData.email) return setError(t('इमेल आवश्यक छ', 'Email is required'));
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) return setError(t('मान्य इमेल लेख्नुहोस्', 'Please enter a valid email'));
    if (!formData.subject) return setError(t('विषय आवश्यक छ', 'Subject is required'));
    if (!formData.message) return setError(t('सन्देश आवश्यक छ', 'Message is required'));
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSuccess(true);
        setError('');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || t('केही समस्या भयो', 'Something went wrong'));
      }
    } catch {
      setError(t('केही समस्या भयो', 'Something went wrong'));
    }
    setSubmitting(false);
  };

  // Initialize order mode from URL params (product, qty)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const product = url.searchParams.get('product');
      const qty = parseInt(url.searchParams.get('qty') || '1', 10) || 1;
      if (product) {
        setOrderMode(true);
        // Prefer matching product from grid (by English name) to show nicer label
        const p = productsGrid.find((x) => x.nameEn === product || x.href === product) || null;
        setOrderProduct(p ? { name: (p as any).nameEn } : { name: product });
        setOrderQty(qty);
        // scroll to form
        setTimeout(() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    } catch {}
  }, []);

  // Prefill form from POS session (if customer logged in via POS flow)
  useEffect(() => {
    try {
      const sess = getPOSSession();
      if (!sess) return;
      // sess.cashier is the display name; sess.username may be email
      const nameFromSess = sess.cashier || '';
      const username = sess.username || '';
      setFormData(fd => ({
        ...fd,
        name: fd.name || nameFromSess,
        email: fd.email || (username.includes('@') ? username : ''),
        phone: fd.phone || (username && !username.includes('@') ? username : ''),
      }));
    } catch {}
  }, []);

  const placeOrder = async () => {
    if (!orderProduct) return;
    if (!formData.name) return setError(t('नाम आवश्यक छ', 'Name is required'));
    if (!formData.phone) return setError(t('फोन आवश्यक छ', 'Phone is required'));
    setOrdering(true);
    setError('');
    try {
      // Create or get customer
      let customerId = null;
      try {
        const custRes = await fetch('/api/customers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name, phone: formData.phone, email: formData.email }),
        });
        const data = await custRes.json().catch(() => ({}));
        if (data?.success && data.customer) customerId = data.customer._id || data.customer.id || null;
      } catch (e) {
        // ignore
      }

      const orderPayload = {
        id: `O-${Math.floor(1000 + Math.random() * 9000)}`,
        productName: orderProduct.name,
        qty: orderQty,
        customerName: formData.name,
        customerPhone: formData.phone,
        customerEmail: formData.email || undefined,
        address: formData.message || undefined,
        note: formData.subject || undefined,
        status: 'pending',
      };

      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload),
      });
      const j = await res.json().catch(() => ({}));
      if (j?.success) {
        setOrderSuccess({ id: orderPayload.id, order: j.order });
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        // clear URL params
        try { const url = new URL(window.location.href); url.searchParams.delete('product'); url.searchParams.delete('qty'); history.replaceState({}, '', url.toString()); } catch {}
      } else {
        setError(j?.error || t('अर्डर पठाउन सकिएन', 'Failed to place order'));
      }
    } catch (e) {
      setError(t('नेटवर्क त्रुटि', 'Network error'));
    }
    setOrdering(false);
  };

  return (
    <section id="contact" ref={ref}>
      <div className="contact-wrap">
        <div className="reveal">
          <span className="section-label">{t('सम्पर्क गर्नुहोस्', 'Get In Touch')}</span>
          <h2 className="section-title">{t('सम्पर्क', 'Contact Us')}</h2>
          <div className="section-line" />
        </div>

        {/* Compact three-box row (phone / email / address) */}
        <div className="contact-compact-row reveal">
          <div className="contact-card-compact" id="compact-phone">
            <div className="compact-icon" style={{ background: '#dcfce7', color: '#166534' }}>📞</div>
            <div className="compact-body">
              <div className="compact-label">{t('फोन', 'Phone')}</div>
              <CopyableContact
                href="tel:+9779857823400"
                value="+977-9857823400"
                displayValue={t('९८५७८२३४००', '9857823400')}
                label={t('फोन नम्बर', 'Phone number')}
                className="compact-copy"
                copyText={t('कपी', 'Copy')}
                copiedText={t('कपी भयो', 'Copied')}
              />
            </div>
          </div>

          <div className="contact-card-compact" id="compact-email">
            <div className="compact-icon" style={{ background: '#eef2ff', color: '#3730a3' }}>✉️</div>
            <div className="compact-body">
              <div className="compact-label">{t('इमेल', 'Email')}</div>
              <CopyableContact
                href="mailto:info@dhakaltradersandsuppliers.com.np"
                value="info@dhakaltradersandsuppliers.com.np"
                displayValue={t('इन्फो@ईमेल', 'info@...')}
                label={t('इमेल ठेगाना', 'Email address')}
                className="compact-copy"
                copyText={t('कपी', 'Copy')}
                copiedText={t('कपी भयो', 'Copied')}
              />
            </div>
          </div>

          <div className="contact-card-compact" id="compact-address">
            <div className="compact-icon" style={{ background: '#f0fdf4', color: '#166534' }}>📍</div>
            <div className="compact-body">
              <div className="compact-label">{t('ठेगाना', 'Address')}</div>
              <a href="https://maps.app.goo.gl/" target="_blank" rel="noopener noreferrer" className="compact-link">
                {t('बागचौर–९, सल्यान', 'Bagchaur–9, Salyan')}
              </a>
            </div>
          </div>
        </div>

        <div className="contact-grid">
          {/* LEFT — Contact info cards */}
          <div className="contact-info reveal-left">
            <div id="owner-contact" className="contact-info-card">
              <div className="contact-info-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>👤</div>
              <div>
                <div className="contact-info-label">{t('प्रोपाइटर', 'Proprietor')}</div>
                <div className="contact-info-value">{t('प्रो. दिपक शर्मा', 'Dipak Sharma')}</div>
              </div>
            </div>

            <div id="phone" className="contact-info-card">
              <div className="contact-info-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>📞</div>
              <div>
                <div className="contact-info-label">{t('फोन', 'Phone')}</div>
                <div className="contact-info-value">
                  <CopyableContact
                    href="tel:+9779857823400"
                    value="+977-9857823400"
                    displayValue={t('९८५७८२३४००', '9857823400')}
                    label={t('फोन नम्बर', 'Phone number')}
                    copyText={t('कपी', 'Copy')}
                    copiedText={t('कपी भयो', 'Copied')}
                  />
                  <br />
                  <CopyableContact
                    href="tel:+9779844966734"
                    value="+977-9844966734"
                    displayValue={t('९८४४९६६७३४', '9844966734')}
                    label={t('फोन नम्बर', 'Phone number')}
                    copyText={t('कपी', 'Copy')}
                    copiedText={t('कपी भयो', 'Copied')}
                  />
                </div>
              </div>
            </div>

            <div id="address" className="contact-info-card">
              <div className="contact-info-icon" style={{ background: '#fef3c7', color: '#d97706' }}>📍</div>
              <div>
                <div className="contact-info-label">{t('ठेगाना', 'Address')}</div>
                <div className="contact-info-value">
                  {t('बागचौर–९, सल्यान, नेपाल', 'Bagchaur–9, Salyan, Nepal')}
                </div>
              </div>
            </div>

            <div id="registration" className="contact-info-card">
              <div className="contact-info-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>📋</div>
              <div>
                <div className="contact-info-label">{t('दर्ता', 'Registration')}</div>
                <div className="contact-info-value">
                  {t('वि.सं. २०६२/०८/२३', '2062/08/23 B.S.')}
                  <br />
                  {t('कोष तथा लेखा नियन्त्रक, सल्यान', 'Treasury & Accounts Controller, Salyan')}
                </div>
              </div>
            </div>

            <a
              id="social"
              href="https://www.facebook.com/profile.php?id=61563117696366"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-fb-btn"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              {t('फेसबुकमा भेट्नुहोस्', 'Find us on Facebook')}
            </a>
          </div>

          {/* RIGHT — Form */}
          <div id="contact-form" className="contact-form-wrap reveal-right">
            {orderMode ? (
              orderSuccess ? (
                <div className="contact-success">
                  <div className="contact-success-icon">✅</div>
                  <div className="contact-success-title">{t('अर्डर सफल', 'Order placed')}</div>
                  <div className="contact-success-desc">
                    {t('धन्यबाद — हामी छिट्टै सम्पर्क गर्नेछौं।', "Thanks — we'll get back to you shortly.")}
                  </div>
                  <button className="contact-success-back" onClick={() => { setOrderSuccess(null); setOrderMode(false); }}>
                    {t('फर्कनुहोस्', 'Go Back')}
                  </button>
                </div>
              ) : (
                <div className="contact-form">
                  <h3 style={{ marginTop: 0 }}>{t('अर्डर', 'Place Order')}</h3>
                  <p>{t('उत्पादन:', 'Product:')} <strong>{orderProduct?.name}</strong></p>
                  <label className="cf-label">{t('परिमाण', 'Quantity')}</label>
                  <input className="cf-input" type="number" min={1} value={orderQty} onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value || '1', 10)))} />
                  <input className="cf-input" type="text" id="name" value={formData.name} onChange={handleChange} placeholder={t('तपाईंको नाम', 'Your Name')} />
                  <input className="cf-input" type="email" id="email" value={formData.email} onChange={handleChange} placeholder={t('इमेल ठेगाना', 'Email Address')} />
                  <input className="cf-input" type="tel" id="phone" value={formData.phone} onChange={handleChange} placeholder={t('फोन नम्बर', 'Phone Number')} />
                  <textarea className="cf-input cf-textarea" id="message" value={formData.message} onChange={handleChange} placeholder={t('ठेगाना / नोट (वैकल्पिक)', 'Address / Note (optional)')} />
                  {error && <div className="cf-error">{error}</div>}
                  <button className="cf-submit" onClick={placeOrder} disabled={ordering}>
                    {ordering ? t('पठाउँदै...', 'Placing...') : t('अर्डर पठाउनुहोस् →', 'Place Order →')}
                  </button>
                </div>
              )
            ) : success ? (
              <div className="contact-success">
                <div className="contact-success-icon">✅</div>
                <div className="contact-success-title">{t('सन्देश पठाइयो!', 'Message Sent!')}</div>
                <div className="contact-success-desc">
                  {t('हामी चाँडै सम्पर्क गर्नेछौं।', "We'll get back to you shortly.")}
                </div>
                <button className="contact-success-back" onClick={() => setSuccess(false)}>
                  {t('फर्कनुहोस्', 'Go Back')}
                </button>
              </div>
            ) : (
              <div className="contact-form">
                <input
                  className="cf-input"
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('तपाईंको नाम', 'Your Name')}
                />
                <input
                  className="cf-input"
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('इमेल ठेगाना', 'Email Address')}
                />
                <input
                  className="cf-input"
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('फोन नम्बर', 'Phone Number')}
                />
                <select className="cf-input" id="subject" value={formData.subject} onChange={handleChange}>
                  <option value="">{t('विषय छान्नुहोस्', 'Select Subject')}</option>
                  <option value="timur">🌿 {t('टिमुर व्यापार', 'Timur Trade')}</option>
                  <option value="herbs">🌱 {t('जडीबुटी', 'Herbs')}</option>
                  <option value="daily">🛒 {t('दैनिक सामान', 'Daily Goods')}</option>
                  <option value="wholesale">📦 {t('थोक अर्डर', 'Wholesale Order')}</option>
                  <option value="inquiry">❓ {t('सामान्य जानकारी', 'General Inquiry')}</option>
                </select>
                <textarea
                  className="cf-input cf-textarea"
                  id="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t('सन्देश लेख्नुहोस्...', 'Write your message...')}
                />
                {error && <div className="cf-error">{error}</div>}
                <button className="cf-submit" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? t('पठाउँदै...', 'Sending...') : t('सन्देश पठाउनुहोस् →', 'Send Message →')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;