import { useLanguage } from '../LanguageContext';
import { useReveal } from '../hooks/useReveal';
import { productsGrid } from '../data/productsGrid';

const Products = () => {
  const { lang } = useLanguage();
  const ref = useReveal();
  const t = (ne: string, en: string) => lang === 'en' ? en : ne;

  return (
    <section id="products" ref={ref} style={{ paddingTop: '92px' }}>
      <div className="products-wrap">
        {/* Header */}
        <div className="reveal products-header">
          <span className="section-label">{t('हाम्रो सूची', 'Our Range')}</span>
          <h2 className="section-title">{t('उत्पादनहरू', 'Products')}</h2>
          <p className="section-subtitle products-cats">
            <span>{t('जडीबुटी', 'Herbs')}</span>
            <span className="prod-cat-dot">◆</span>
            <span>{t('खाद्यान्न', 'Grains')}</span>
            <span className="prod-cat-dot">◆</span>
            <span>{t('कृषि सामग्री', 'Agri Materials')}</span>
            <span className="prod-cat-dot">◆</span>
            <span>{t('दैनिक उपभोग्य वस्तुहरू', 'Daily Consumables')}</span>
          </p>
          <div className="section-line" />
        </div>

        {/* Grid */}
        <div className="products-photo-grid">
          {productsGrid.map((p, i) => (
            <div
              className={`prod-photo-card reveal${p.highlight ? ' prod-photo-card--highlight' : ''}`}
              key={i}
              style={{ transitionDelay: `${i * 0.06}s`, textDecoration: 'none' }}
            >
              <img
                src={p.img}
                alt={p.nameEn}
                loading="lazy"
                decoding="async"
              />
              <div className="prod-photo-overlay" />
              <div className="prod-photo-info">
                <span className="prod-photo-name">
                  {lang === 'en' ? p.nameEn : p.nameNe}
                </span>
                <span className="prod-photo-ne">
                  {lang === 'en' ? p.subEn : p.subNe}
                </span>
              </div>
              <div className="prod-photo-actions">
                <a href={p.href} className="prod-photo-view">{t('हेर्नुहोस्', 'View')}</a>
                <button
                  type="button"
                  className="prod-photo-order"
                  onClick={() => {
                    try {
                      const url = new URL(window.location.href);
                      url.searchParams.set('product', p.nameEn);
                      url.searchParams.set('qty', '1');
                      history.replaceState({}, '', url.toString());
                    } catch {}
                    window.location.hash = '#contact';
                    // smooth scroll
                    setTimeout(() => {
                      const el = document.getElementById('contact-form');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }}
                >
                  {t('अर्डर गर्नुहोस्', 'Order')}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Products;