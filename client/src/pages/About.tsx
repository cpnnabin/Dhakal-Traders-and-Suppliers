import { useLanguage } from '../LanguageContext';
import { useReveal } from '../hooks/useReveal';
import { aboutCards } from '../data/aboutCards';

const About = () => {
  const { lang } = useLanguage();
  const ref = useReveal();
  const t = (ne: string, en: string) => lang === 'en' ? en : ne;

  return (
    <section id="about" ref={ref}>
      {/* Cinematic background */}
      <div className="about-bg-photo" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1600&q=80"
          alt="Nepali hills and medicinal herbs / नेपाली पहाड र जडीबुटी"
          loading="lazy"
        />
        <div className="about-bg-overlay" />
      </div>

      <div className="about-wrap">
        <div className="reveal">
          <span className="section-label">{t('हाम्रो कथा', 'Our Story')}</span>
          <h2 className="section-title">{t('हाम्रो बारेमा', 'About Us')}</h2>
          <p className="section-subtitle">
            {t('वि.सं. २०६२ देखि — दुई दशकको विश्वास', 'Since 2062 B.S. — Two Decades of Trust')}
          </p>
          <div className="section-line" />
        </div>

        <div className="about-grid">
          {/* LEFT — Text + badges */}
          <div className="about-text reveal-left">
            <p>{t(
              'ढकाल ट्रेडर्स एण्ड सप्लायर्स सल्यान जिल्लाको बागचौर नगरपालिका–९, बथानमा अवस्थित वि.सं. २०६२ देखि दर्ता भई सञ्चालनमा रहेको एक विश्वसनीय तथा स्थापित व्यापारिक संस्था हो। विगत दुई दशकदेखि स्थानीय किसानहरूको भरोसाको साझेदारका रूपमा कार्य गर्दै आएको यस प्रतिष्ठानले दैनिक उपभोग्य सामग्रीसँगै विभिन्न जडीबुटीहरूको खरिद–बिक्री सेवा प्रदान गर्दै आएको छ।',
              'Dhakal Traders and Suppliers is a trusted and well-established trading institution located in Bagchaur–9, Bathan, Salyan, operating since 2062 B.S. For two decades, it has been a reliable partner of local farmers, offering daily goods and herbal trading services.'
            )}</p>

            <p>{t(
              'स्थानीय स्तरमा उत्पादन हुने जडीबुटीहरूलाई उचित मूल्यमा बजारसम्म पुर्‍याई किसानहरूको आम्दानी वृद्धि गर्ने उद्देश्यका साथ संस्थाको सुरुवात गरिएको हो। गुणस्तर, पारदर्शिता र विश्वासलाई मुख्य आधार मान्दै संस्थाले जिम्मेवार व्यापारिक अभ्यास अपनाउँदै आएको छ।',
              "The organization was established to ensure fair market access for locally produced herbs and to improve farmers' income. It prioritizes quality, transparency, and trust, with wholesale supply, organized transportation, proper storage, and clear trading processes."
            )}</p>

            <p>{t(
              'टिमुर (Zanthoxylum armatum) लगायत विभिन्न जडीबुटीहरू माग अनुसार आवश्यक मात्रामा उपलब्ध गराइन्छन् र कार्यस्थलमै परामर्श सेवा पनि प्रदान गरिन्छ। किसान, संकलनकर्ता, व्यापारी तथा उपभोक्ताबीच पारदर्शी र दीगो कारोबार प्रणाली विकास गर्दै स्थानीय अर्थतन्त्रमा योगदान पुर्‍याउने लक्ष्यसहित संस्था सक्रिय रहेको छ।',
              'Various herbs including Timur (Zanthoxylum armatum) are supplied as per demand along with on-site consultation. The organization promotes transparent and sustainable trade among farmers, collectors, traders, and consumers while contributing to the local economy.'
            )}</p>

            {/* Registration badge */}
            <div className="reg-badge">
              <div className="reg-badge-icon">📋</div>
              <div>
                <span className="reg-badge-label">{t('दर्ता विवरण', 'Registration Details')}</span>
                <div
                  className="reg-badge-text"
                  dangerouslySetInnerHTML={{
                    __html: lang === 'en'
                      ? 'Treasury &amp; Accounts Controller Office, Salyan<br/>Effective Registration Date: <strong>2062/08/23 B.S.</strong>'
                      : 'कोष तथा लेखा नियन्त्रक कार्यालय, सल्यान<br/>प्रभावकारी दर्ता मिति: <strong>२०६२/०८/२३</strong>',
                  }}
                />
              </div>
            </div>

            {/* Removed Bharat/leadership/achievements section per request */}
          </div>

          {/* RIGHT — Floating photo stack + feature cards */}
          <div className="about-right reveal-right">
            <div className="about-photo-stack">
              <div className="about-photo-frame about-photo-frame--back">
                <img
                  src="https://images.unsplash.com/photo-1611735341450-74d61e660ad2?w=600&q=80"
                  alt="Nepali mountain landscape / नेपाली पहाडी परिदृश्य"
                  loading="lazy"
                />
              </div>
              <div className="about-photo-frame about-photo-frame--front">
                <img
                  src="https://images.unsplash.com/photo-1605711285791-0219e80e43a3?w=600&q=80"
                  alt="Herbs and spices / जडीबुटी र मसला"
                  loading="lazy"
                />
              </div>
              <div className="about-years-badge">
                <span className="about-years-num">20+</span>
                <span className="about-years-label">{t('वर्षको विश्वास', 'Years of Trust')}</span>
              </div>
            </div>

            <div className="about-cards">
              {aboutCards.map((card, i) => (
                <div
                  className="about-card reveal"
                  key={i}
                  style={{ transitionDelay: `${i * 0.12}s` }}
                >
                  <div className="ac-icon">{card.icon}</div>
                  <div>
                    <div className="ac-title">{t(card.ne_title, card.en_title)}</div>
                    <div className="ac-desc">{t(card.ne_desc, card.en_desc)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
