import { useLanguage } from '../LanguageContext';
import { useReveal } from '../hooks/useReveal';
import CopyableContact from '../components/CopyableContact';

const Location = () => {
  const { lang } = useLanguage();
  const ref = useReveal();
  const t = (ne: string, en: string) => lang === 'en' ? en : ne;

  const cards = [
    {
      bg: '#fee2e2', color: '#dc2626', icon: '📍',
      ne_title: 'ठेगाना', en_title: 'Address',
      ne_desc: 'बागचौर नगरपालिका–९, सल्यान, नेपाल',
      en_desc: 'Bagchaur Municipality–9, Salyan, Nepal',
      html: false,
      phone: false,
    },
    {
      bg: '#dcfce7', color: '#16a34a', icon: '📞',
      ne_title: 'फोन', en_title: 'Phone',
      ne_desc: '', en_desc: '',
      html: false,
      phone: true,
    },
    // Registration card removed per request
  ];

  return (
    <section id="location" ref={ref}>
      <div className="map-wrap">
        <div className="reveal">
          <span className="section-label">{t('हाम्रो स्थान', 'Our Location')}</span>
          <h2 className="section-title">{t('हामीलाई भेट्नुहोस्', 'Visit Us')}</h2>
          <div className="section-line" />
        </div>

        <div className="map-grid">
          {/* Google Maps */}
          <div id="map" className="map-container reveal-left">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d878.5!2d82.3414681!3d28.4291147!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3997fdd370b54dc7%3A0x25bc7cd16c8d0f8c!2sDhakal%20Traders%20and%20Suppliers!5e0!3m2!1sen!2snp!4v1700000000000!5m2!1sen!2snp"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Dhakal Traders Location — Bagchaur, Salyan"
            />
          </div>

          {/* Info cards */}
          <div className="map-info-cards reveal-right">
            {cards.map((card, i) => (
              <div
                className="map-card-new"
                key={i}
                id={i === 0 ? 'office' : undefined}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="map-card-icon-circle" style={{ background: card.bg, color: card.color }}>
                  {card.icon}
                </div>
                <div className="map-card-body">
                  <div className="map-card-title">{t(card.ne_title, card.en_title)}</div>
                  {card.phone ? (
                    <div className="map-card-desc">
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
                  ) : card.html ? (
                    <div
                      className="map-card-desc"
                      dangerouslySetInnerHTML={{ __html: t(card.ne_desc, card.en_desc) }}
                    />
                  ) : (
                    <div className="map-card-desc">{t(card.ne_desc, card.en_desc)}</div>
                  )}
                </div>
              </div>
            ))}

            <div className="map-btns-new">
              <a
                href="https://www.google.com/maps/place/Dhakal+Traders+and+Suppliers/@28.4291147,82.3414681,19z/"
                target="_blank"
                rel="noopener noreferrer"
                className="map-pill map-pill--maps"
              >
                <span>📍</span>
                {t('गुगल म्याप', 'Google Maps')}
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61563117696366"
                target="_blank"
                rel="noopener noreferrer"
                className="map-pill map-pill--fb"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                {t('फेसबुक', 'Facebook')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Location;
