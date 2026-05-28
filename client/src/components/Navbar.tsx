import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../LanguageContext';
// Import bundled asset logo (used when present in src/assets)
import dhakalAsset from '../assets/DhakalTraders Logo.png';

type ChildLink = {
  href: string;
  label: { ne: string; en: string };
};

type SectionLink = {
  key: string;
  href: string;
  label: { ne: string; en: string };
  children: ChildLink[];
};

const sections: SectionLink[] = [
  
  {
    key: 'about',
    href: '#about',
    label: { ne: 'हाम्रो बारेमा', en: 'About Us' },
    children: [
      { href: '#about', label: { ne: 'कम्पनी परिचय', en: 'Company Profile' } },
      { href: '#vision', label: { ne: 'मिशन तथा भिजन', en: 'Mission & Vision' } },
      { href: '#history', label: { ne: 'इतिहास', en: 'History' } },
      { href: '#why-us', label: { ne: 'हामीलाई किन छान्ने', en: 'Why Choose Us' } },
    ],
  },
  {
    key: 'founder',
    href: '#owner',
    label: { ne: 'संस्थापक', en: 'Founder' },
    children: [
      { href: '#owner-intro', label: { ne: 'परिचय', en: 'Introduction' } },
      { href: '#owner-bio', label: { ne: 'जीवनी', en: 'Biography' } },
      { href: '#owner-service', label: { ne: 'समाजसेवा', en: 'Social Work' } },
      { href: '#owner-honors', label: { ne: 'सम्मान तथा उपलब्धि', en: 'Achievements' } },
    ],
  },
  {
    key: 'services',
    href: '#services',
    label: { ne: 'सेवाहरू', en: 'Services' },
    children: [
      { href: '#herbs', label: { ne: 'जडीबुटी व्यापार', en: 'Herbs Trading' } },
      { href: '#agri-materials', label: { ne: 'कृषि उत्पादन', en: 'Agriculture Products' } },
      { href: '#wholesale', label: { ne: 'होलसेल सप्लाइ', en: 'Wholesale Supply' } },
      { href: '#distribution', label: { ne: 'वितरण', en: 'Distribution' } },
      { href: '#business-services', label: { ne: 'व्यावसायिक सेवा', en: 'Business Services' } },
    ],
  },
  {
    key: 'products',
    href: '#products',
    label: { ne: 'उत्पादनहरू', en: 'Products' },
    children: [
      { href: '#herbs', label: { ne: 'जडीबुटी', en: 'Herbs' } },
      { href: '#food-products', label: { ne: 'खाद्य सामग्री', en: 'Food Products' } },
      { href: '#agriculture-materials', label: { ne: 'कृषि सामग्री', en: 'Agriculture Materials' } },
      { href: '#featured-products', label: { ne: 'विशेष उत्पादन', en: 'Featured Products' } },
      { href: '#inventory-showcase', label: { ne: 'स्टक प्रदर्शन', en: 'Inventory Showcase' } },
    ],
  },
  {
    key: 'gallery',
    href: '#gallery',
    label: { ne: 'ग्यालेरी', en: 'Gallery' },
    children: [
      { href: '#gallery-products', label: { ne: 'उत्पादन', en: 'Products' } },
      { href: '#gallery-warehouse', label: { ne: 'वेयरहाउस', en: 'Warehouse' } },
      { href: '#gallery-team', label: { ne: 'टोली', en: 'Team' } },
      { href: '#gallery-events', label: { ne: 'कार्यक्रम', en: 'Events' } },
      { href: '#gallery-activities', label: { ne: 'ग्राहक गतिविधि', en: 'Customer Activities' } },
    ],
  },
  {
    key: 'contact',
    href: '#contact',
    label: { ne: 'सम्पर्क', en: 'Contact' },
    children: [
      { href: '#contact-form', label: { ne: 'सम्पर्क फारम', en: 'Contact Form' } },
      { href: '#phone', label: { ne: 'फोन नम्बर', en: 'Phone Numbers' } },
      { href: '#email', label: { ne: 'इमेल', en: 'Email' } },
      { href: '#social', label: { ne: 'सामाजिक सञ्जाल', en: 'Social Media' } },
      // merged from Location
      { href: '#map', label: { ne: 'Google Map', en: 'Google Map' } },
      { href: '#branches', label: { ne: 'शाखाहरू', en: 'Branches' } },
      { href: '#delivery-areas', label: { ne: 'डेलिभरी क्षेत्र', en: 'Delivery Areas' } },
      { href: '#contact-details', label: { ne: 'सम्पर्क विवरण', en: 'Contact Details' } },
    ],
  },
];

// Logo helper: tries several filenames in public/ then falls back to /favicon.svg
const Logo: React.FC = () => {
  const candidates = [
    dhakalAsset,
    '/company-logo.png',
    '/DhakalTraders Logo.png',
    '/DhakalTradersLogo.png',
    // Try server proxy to MinIO (server provides /api/product-image)
    '/api/product-image?bucket=images&name=logo.png',
    '/api/product-image?bucket=images&name=DhakalTraders%20Logo.png',
    '/api/product-image?bucket=images&name=DhakalTradersLogo.png',
    '/favicon.svg',
  ];
  const [idx, setIdx] = useState(0);
  return (
    <img
      src={candidates[idx]}
      alt="Dhakal Traders logo"
      className="nav-logo-icon"
      style={{ width: 36, height: 36, objectFit: 'contain' }}
      onError={() => setIdx((i) => Math.min(i + 1, candidates.length - 1))}
    />
  );
};

const Navbar: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!navRef.current || !(e.target instanceof Node)) return;
      if (!navRef.current.contains(e.target)) {
        setOpenDropdown(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeMobileMenu = () => {
    setMobileOpen(false);
    setOpenDropdown(null);
  };

  return (
    <nav className="navbar" ref={navRef}>
      <div className="nav-logo">
        <a href="#home" style={{ display: 'flex', alignItems: 'center', gap: '.45rem', textDecoration: 'none', color: 'inherit' }}>
          {/* Try multiple repo-provided filenames, fall back to /favicon.svg */}
          <Logo />
          <span className="nav-brand" data-ne="ढकाल ट्रेडर्स" data-en="Dhakal Traders">
            {lang === 'ne' ? 'ढकाल ट्रेडर्स' : 'Dhakal Traders'}
          </span>
        </a>
        <span className="nav-logo-est">Since 2062 B.S.</span>
      </div>

      <ul className="nav-center">
        <li><a href="#home">{lang === 'ne' ? 'गृहपृष्ठ' : 'Home'}</a></li>
        {sections.map((section) => (
          <li key={section.key}>
            <div className={`nav-dropdown${openDropdown === section.key ? ' open' : ''}`}>
              <button
                className="nav-dropdown-trigger"
                type="button"
                aria-expanded={openDropdown === section.key}
                onClick={() => setOpenDropdown(openDropdown === section.key ? null : section.key)}
              >
                {lang === 'ne' ? section.label.ne : section.label.en} <span className="nav-dropdown-caret">▾</span>
              </button>
              <div className="nav-dropdown-menu">
                <a href={section.href}>{lang === 'ne' ? `सबै ${section.label.ne}` : `All ${section.label.en}`}</a>
                {section.children.map((d) => (
                  <a key={d.href} href={d.href}>{lang === 'ne' ? d.label.ne : d.label.en}</a>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="nav-right">
        <div className="lang-toggle">
          <button className={`lang-btn${lang === 'ne' ? ' active' : ''}`} onClick={() => setLang('ne')}>ने</button>
          <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => setLang('en')}>EN</button>
        </div>

        <a
          href="/pos"
          className="nav-pos-btn"
          title={lang === 'ne' ? 'ERP लगइन / POS टर्मिनल' : 'ERP Login / POS Terminal'}
          aria-label="ERP Login"
        >
          🔑 ERP
        </a>

        <a
          href="https://www.facebook.com/profile.php?id=61563117696366"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-fb"
          title="Facebook"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        </a>

        <button
          type="button"
          className={`hamburger${mobileOpen ? ' open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {mobileOpen && (
        <div className="mobile-menu">
          <a href="#home" onClick={closeMobileMenu}>{lang === 'ne' ? 'गृहपृष्ठ' : 'Home'}</a>
          {sections.map((section) => (
            <div key={section.key} className="mobile-nav-section">
              <button
                type="button"
                className={`mobile-dropdown-trigger${openDropdown === section.key ? ' open' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === section.key ? null : section.key)}
                aria-expanded={openDropdown === section.key}
              >
                <span>{lang === 'ne' ? section.label.ne : section.label.en}</span>
                <span className="nav-dropdown-caret" aria-hidden>▾</span>
              </button>
              {openDropdown === section.key && (
                <div className="mobile-dropdown-panel">
                  <a className="mobile-dropdown-link mobile-dropdown-link--main" href={section.href} onClick={closeMobileMenu}>
                    {lang === 'ne' ? `सबै ${section.label.ne}` : `All ${section.label.en}`}
                  </a>
                  {section.children.map((child) => (
                    <a key={child.href} className="mobile-dropdown-link" href={child.href} onClick={closeMobileMenu}>
                      {lang === 'ne' ? child.label.ne : child.label.en}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="mobile-menu-bottom">
            <div className="lang-toggle">
              <button className={`lang-btn${lang === 'ne' ? ' active' : ''}`} onClick={() => setLang('ne')}>ने</button>
              <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => setLang('en')}>EN</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
