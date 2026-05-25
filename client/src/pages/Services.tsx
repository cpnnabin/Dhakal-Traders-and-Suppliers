import type { CSSProperties } from 'react';
import { useLanguage } from '../LanguageContext';
import { useReveal } from '../hooks/useReveal';
import { servicesGrid } from '../data/servicesGrid';

const Services = () => {
  const { lang } = useLanguage();
  const t = (ne: string, en: string) => lang === 'en' ? en : ne;
  const ref = useReveal();

  return (
    <section id="services" ref={ref}>
      {/* Background images */}
      <div className="services-bg-images" aria-hidden="true">
        <div className="services-bg-left">
          <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80" alt="" loading="lazy" />
          <div className="services-bg-overlay" />
        </div>
        <div className="services-bg-right">
          <img src="https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&q=80" alt="" loading="lazy" />
          <div className="services-bg-overlay" />
        </div>
      </div>

      <div className="services-wrap">
        <div className="services-hero reveal">
          <div className="services-hero-media" aria-hidden="true">
            <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80" alt="" loading="lazy" />
            <div className="services-hero-overlay" />
          </div>
          <div className="services-hero-content">
            <span className="section-label">{t('हामीले प्रदान गर्ने', 'What We Provide')}</span>
            <h2 className="section-title">{t('हाम्रा सेवाहरू', 'Our Services')}</h2>
            <p className="section-subtitle">
              {t('दुई दशकको अनुभव · गुणस्तरीय सेवा · पारदर्शिता', 'Two Decades of Experience · Quality Service · Transparency')}
            </p>
            <div className="section-line" />
          </div>
        </div>

        <div className="services-grid-new">
          {servicesGrid.map((svc, i) => (
            <a
              href={svc.href}
              className={`svc-card reveal${i === 4 ? ' svc-card--wide' : ''}`}
              key={i}
              style={{ '--svc-accent': svc.accent, transitionDelay: `${i * 0.1}s`, textDecoration: 'none' } as CSSProperties}
            >
              <div className="svc-card-border" />
              <span className="svc-card-icon">{svc.icon}</span>
              <div className="svc-card-title">{t(svc.ne_title, svc.en_title)}</div>
              <div className="svc-card-desc">{t(svc.ne_desc, svc.en_desc)}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
