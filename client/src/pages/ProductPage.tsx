import { useLanguage } from '../LanguageContext';
import { useReveal } from '../hooks/useReveal';
import { productPagesData } from '../data/productPages';

interface ProductPageProps {
  category: string;
}

const ProductPage = ({ category }: ProductPageProps) => {
  const { lang } = useLanguage();
  const ref = useReveal();
  const t = (ne: string, en: string) => lang === 'en' ? en : ne;

  const data = productPagesData[category];
  
  if (!data) {
    return (
      <section style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>{t('पृष्ठ फेला परेन', 'Page Not Found')}</h2>
      </section>
    );
  }

  return (
    <section id={data.id} ref={ref} className="product-page-section" style={{ paddingTop: '92px' }}>
      {/* We reuse the Timur CSS classes since the layout is identical and they are already styled perfectly */}
      <div className="timur-bg-photo" aria-hidden="true">
        <img
          src={data.bgImage}
          alt={data.bgAlt}
          loading="lazy"
        />
        <div className="timur-bg-overlay" />
      </div>

      <div className="timur-wrap">
        <div className="reveal" style={{ marginTop: '1.2rem' }}>
          <span className="section-label">{t(data.sectionLabelNe, data.sectionLabelEn)}</span>
          <h3 className="section-title" style={{ color: 'var(--gold)', marginTop: '.25rem' }}>
            {t(data.titleNe, data.titleEn)}
          </h3>
          <p className="section-subtitle" style={{ color: 'rgba(255,255,255,.5)', marginTop: '.25rem' }}>
            {t(data.subtitleNe, data.subtitleEn)}
          </p>
          <div className="section-line" />
        </div>

        <div className="timur-grid">
          <div className="timur-info reveal-left">
            {data.paragraphsNe.map((_, i) => (
              <p key={i}>{t(data.paragraphsNe[i], data.paragraphsEn[i])}</p>
            ))}
          </div>

          <div className="timur-stats reveal-right">
            {data.stats.map((stat, i) => (
              <div className="timur-stat" key={i} style={{ transitionDelay: `${i * 0.1}s` }}>
                <span className="timur-stat-icon">{stat.icon}</span>
                <span className="timur-stat-num">{t(stat.ne_num, stat.en_num)}</span>
                <span className="timur-stat-label">{t(stat.ne_label, stat.en_label)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="product-order-btn"
            onClick={() => {
              try {
                const url = new URL(window.location.href);
                url.searchParams.set('product', data.titleEn || data.titleNe);
                url.searchParams.set('qty', '1');
                history.replaceState({}, '', url.toString());
              } catch {}
              window.location.hash = '#contact';
              setTimeout(() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' }), 50);
            }}
          >
            {t('यो अर्डर गर्नुहोस्', 'Order this')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductPage;
