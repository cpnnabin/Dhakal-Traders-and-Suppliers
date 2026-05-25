import { useLanguage } from '../LanguageContext';
import CopyableContact from '../components/CopyableContact';

const Footer = () => {
  const { lang } = useLanguage();
  const t = (ne: string, en: string) => lang === 'en' ? en : ne;

  return (
    <>
      <footer className="footer-new">
        {/* Top gradient border */}
        <div className="footer-top-gradient" aria-hidden="true" />

        <div className="footer-grid">
          {/* COL 1 — Brand */}
          <div className="footer-col">
            <h4>{t('ढकाल ट्रेडर्स एण्ड सप्लायर्स', 'Dhakal Traders & Suppliers')}</h4>
            <div
              dangerouslySetInnerHTML={{
                __html: lang === 'en'
                  ? 'Bagchaur Municipality–9, Salyan, Nepal<br/>Herb Collection · Trading · Daily Goods'
                  : 'बागचौर न.पा.–९, सल्यान, नेपाल<br/>जडीबुटी संकलन · खरिद बिक्री · दैनिक सामान',
              }}
            />
            <p style={{ marginTop: '.5rem', fontSize: '.8rem', color: 'rgba(255,255,255,.35)' }}>
              {t('प्रोपाइटर: दिपक शर्मा', 'Proprietor: Dipak Sharma')} |{' '}
              <CopyableContact
                href="tel:+9779857823400"
                value="+977-9857823400"
                displayValue={t('९८५७८२३४००', '9857823400')}
                label={t('फोन नम्बर', 'Phone number')}
                copyText={t('कपी', 'Copy')}
                copiedText={t('कपी भयो', 'Copied')}
              />{' '}/{' '}
              <CopyableContact
                href="tel:+9779844966734"
                value="+977-9844966734"
                displayValue={t('९८४४९६६७३४', '9844966734')}
                label={t('फोन नम्बर', 'Phone number')}
                copyText={t('कपी', 'Copy')}
                copiedText={t('कपी भयो', 'Copied')}
              />
            </p>
            <div
              className="footer-reg"
              dangerouslySetInnerHTML={{
                __html: lang === 'en'
                  ? 'Registered: Treasury &amp; Accounts Controller Office, Salyan<br/>Date: 2062/08/23 B.S.'
                  : 'दर्ता: कोष तथा लेखा नियन्त्रक कार्यालय, सल्यान<br/>मिति: वि.सं. २०६२/०८/२३',
              }}
            />
            {/* Social icons */}
            <div className="footer-socials">
              <a
                href="https://www.facebook.com/profile.php?id=61563117696366"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-icon footer-social-icon--fb"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>

          {/* COL 2 — Quick Links */}
          <div className="footer-col">
            <h4>{t('द्रुत लिंक', 'Quick Links')}</h4>
            <a href="#about">{t('हाम्रो बारेमा', 'About Us')}</a>
            <a href="#timur">{t('टिमुर व्यापार', 'Timur Trade')}</a>
            <a href="#services">{t('सेवाहरू', 'Services')}</a>
            <a href="#products">{t('उत्पादन', 'Products')}</a>
            <a href="#location">{t('स्थान', 'Location')}</a>
            <a href="#contact">{t('सम्पर्क', 'Contact')}</a>
          </div>

          {/* COL 3 — Services */}
          <div className="footer-col">
            <h4>{t('सेवाहरू', 'Services')}</h4>
            <a href="#services">{t('जडीबुटी संकलन', 'Herb Collection')}</a>
            <a href="#timur">{t('टिमुर खरिद बिक्री', 'Timur Trading')}</a>
            <a href="#services">{t('दैनिक उपभोग्य वस्तु', 'Daily Goods')}</a>
            <a href="#services">{t('थोक आपूर्ति', 'Wholesale Supply')}</a>
            <a href="#services">{t('ढुवानी सेवा', 'Transportation')}</a>
          </div>

          {/* COL 4 — Contact */}
          <div className="footer-col">
            <h4>{t('सम्पर्क', 'Contact')}</h4>
            <CopyableContact
              href="tel:+9779857823400"
              value="+977-9857823400"
              displayValue={`📞 ${t('९८५७८२३४००', '9857823400')}`}
              label={t('फोन नम्बर', 'Phone number')}
              copyText={t('कपी', 'Copy')}
              copiedText={t('कपी भयो', 'Copied')}
            />
            <CopyableContact
              href="tel:+9779844966734"
              value="+977-9844966734"
              displayValue={`📞 ${t('९८४४९६६७३४', '9844966734')}`}
              label={t('फोन नम्बर', 'Phone number')}
              copyText={t('कपी', 'Copy')}
              copiedText={t('कपी भयो', 'Copied')}
            />
            <a
              href="https://www.google.com/maps/place/Dhakal+Traders+and+Suppliers/@28.4291147,82.3414681,19z/"
              target="_blank"
              rel="noopener"
            >
              📍 {t('गुगल म्याप', 'Google Maps')}
            </a>
            <a href="https://www.facebook.com/profile.php?id=61563117696366" target="_blank" rel="noopener noreferrer">
              📘 Facebook
            </a>
          </div>
        </div>

        <hr className="footer-divider" />

        <div className="footer-bottom">
          <div className="fl-logo">{t('ढकाल ट्रेडर्स एण्ड सप्लायर्स', 'Dhakal Traders & Suppliers')}</div>
          <div className="fl-copy">
            © 2005–2026 Dhakal Traders &amp; Suppliers — Bagchaur, Salyan, Nepal | Herb Trading · Timur Export · Daily Goods
          </div>
        </div>
      </footer>

      <div className="dev-credit">
        <p>
          {t('❤️ नेपालमा माग र प्रेमले निर्माण गरिएको', '❤️ Made with love in Nepal')} | {t('वेबसाइट निर्माण', 'Website Developed by')}{' '}
          <a href="https://nabindhakal28.com.np" target="_blank" rel="noopener noreferrer">
            @cpnnabin
          </a>
        </p>
      </div>
    </>
  );
};

export default Footer;
