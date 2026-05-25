import { useEffect, useState } from 'react';
import { LanguageProvider, useLanguage } from './LanguageContext';
import About from './pages/About';
import Owner from './pages/Owner';
import Products from './pages/Products';
import Services from './pages/Services';
import ProductPage from './pages/ProductPage';
import NotFound from './pages/NotFound';
import Gallery from './pages/Gallery';
import Location from './pages/Location';
import Contact from './pages/Contact';
import Footer from './pages/Footer';
import ResponsePage from './pages/Response';
import POSDashboard from './pages/POSDashboard';
import POSLogin, { getPOSSession, clearPOSSession } from './pages/POSLogin';
import Shop from './pages/Shop';
import ChatWidget from './pages/ChatWidget';
import PublicNavbar from './components/Navbar';
import { InventoryDashboard, ProductList, StockList, LowStock, Categories, Brands, Warehouses, Batches, ExpiryAlerts } from './features/inventory';
import dhakalLogo from './image/Dhakal Traders Logo .png';

function NavBar() {
  const { lang, setLang } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const role = getPOSSession().role || '';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => {
    setMenuOpen(false);
    setOpenDropdown(null);
  };

  const toggleMobileSection = (key: string) => {
    setOpenDropdown((k) => (k === key ? null : key));
  };

  const switchLang = (l: 'ne' | 'en') => {
    setLang(l);
    // Also trigger DOM-based language switch for elements using data-ne/data-en
    (window as any).switchLang?.(l);
  };

  return (
    <>
      <nav id="navbar" className={scrolled ? 'scrolled' : ''}>
        <div
          className="nav-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <img className="nav-logo-image" src={dhakalLogo} alt="Dhakal Traders logo" />
          <div>
            <span className="nav-brand">
              {lang === 'ne' ? 'ढकाल ट्रेडर्स' : 'Dhakal Traders'}
            </span>
            <span className="nav-logo-est">Since 2062 B.S.</span>
          </div>
        </div>

        {/* Dynamic nav links with nested dropdowns */}
        <ul className="nav-center" id="navLinks">
          {/* About */}
          <li>
            <a href="#about" onClick={closeMenu}>{lang === 'ne' ? 'हाम्रो बारेमा' : 'About Us'}</a>
          </li>

          {/* Founder dropdown */}
          <li
            className={`nav-dropdown${openDropdown === 'founder' ? ' open' : ''}`}
            onMouseEnter={() => setOpenDropdown('founder')}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <a
              href="#owner"
              className="nav-dropdown-trigger"
              onClick={() => setOpenDropdown((k) => (k === 'founder' ? null : 'founder'))}
              aria-expanded={openDropdown === 'founder'}
            >
              {lang === 'ne' ? 'संस्थापक' : 'Founder'} <span className="nav-dropdown-caret">▾</span>
            </a>
            <div className="nav-dropdown-menu" role="menu">
              <a href="#owner-intro" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'परिचय' : 'Introduction'}</a>
              <a href="#owner-bio" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'जीवनी' : 'Biography'}</a>
              <a href="#owner-service" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'समाजसेवा' : 'Social Service'}</a>
              <a href="#owner-honors" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'सम्मान तथा उपलब्धिहरू' : 'Honors & Achievements'}</a>
              <a href="#owner-contact" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'सम्पर्क विवरण' : 'Contact Details'}</a>
            </div>
          </li>

          {/* Services dropdown */}
          <li
            className={`nav-dropdown${openDropdown === 'services' ? ' open' : ''}`}
            onMouseEnter={() => setOpenDropdown('services')}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <a
              href="#services"
              className="nav-dropdown-trigger"
              onClick={() => setOpenDropdown((k) => (k === 'services' ? null : 'services'))}
              aria-expanded={openDropdown === 'services'}
            >
              {lang === 'ne' ? 'सेवाहरू' : 'Services'} <span className="nav-dropdown-caret">▾</span>
            </a>
            <div className="nav-dropdown-menu" role="menu">
              <a href="#herbs" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'जडीबुटी खरिद–बिक्री' : 'Herb Trade'}</a>
              <a href="#agri-materials" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'कृषि सामग्री आपूर्ति' : 'Agricultural Supplies'}</a>
              <a href="#daily-items" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'दैनिक उपभोग्य वस्तु बिक्री' : 'Daily Consumables'}</a>
              <a href="#farmer-advice" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'किसान परामर्श सेवा' : 'Farmer Consulting'}</a>
              <a href="#wholesale" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'होलसेल तथा खुद्रा सेवा' : 'Wholesale & Retail'}</a>
            </div>
          </li>

          {/* Admin Chats — admin only */}
          {role === 'admin' && (
            <li>
              <a href="#admin-chats" onClick={closeMenu}>Admin Chats</a>
            </li>
          )}

          {/* Inventory — admin/owner only */}
          {(role === 'admin' || role === 'owner' || import.meta.env.DEV) && (
            <li>
              <a href="#inventory" onClick={closeMenu}>Inventory</a>
            </li>
          )}

          {/* Products dropdown */}
          <li
            className={`nav-dropdown${openDropdown === 'products' ? ' open' : ''}`}
            onMouseEnter={() => setOpenDropdown('products')}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <a
              href="#products"
              className="nav-dropdown-trigger"
              onClick={() => setOpenDropdown((k) => (k === 'products' ? null : 'products'))}
              aria-expanded={openDropdown === 'products'}
            >
              {lang === 'ne' ? 'उत्पादनहरू' : 'Products'} <span className="nav-dropdown-caret">▾</span>
            </a>
            <div className="nav-dropdown-menu" role="menu">
              <div className="nav-dropdown-group">{lang === 'ne' ? 'जडीबुटी' : 'Herbs'}</div>
              <a href="#timur" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'टिमुर' : 'Timur'}</a>
              <a href="#ginger" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'अदुवा' : 'Ginger'}</a>
              <a href="#hemp-seeds" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'भाङ्गो' : 'Hemp Seeds'}</a>
              <a href="#garlic" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'लसुन' : 'Garlic'}</a>
              <a href="#beans" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'सिमी' : 'Beans'}</a>
              <div style={{ height: 8 }} />
              <a href="#grains" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'खाद्यान्न' : 'Grains'}</a>
              <a href="#agri-materials" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'कृषि सामग्री' : 'Agri Materials'}</a>
              <a href="#daily-items" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'दैनिक उपभोग्य वस्तुहरू' : 'Daily Consumables'}</a>
            </div>
          </li>

          <li
            className={`nav-dropdown${openDropdown === 'gallery' ? ' open' : ''}`}
            onMouseEnter={() => setOpenDropdown('gallery')}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <a
              href="#gallery"
              className="nav-dropdown-trigger"
              onClick={() => setOpenDropdown((k) => (k === 'gallery' ? null : 'gallery'))}
              aria-expanded={openDropdown === 'gallery'}
            >
              {lang === 'ne' ? 'ग्यालेरी' : 'Gallery'} <span className="nav-dropdown-caret">▾</span>
            </a>
            <div className="nav-dropdown-menu" role="menu">
              <a href="#photo-gallery" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'फोटो ग्यालेरी' : 'Photo Gallery'}</a>
              <a href="#video-gallery" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'भिडियो ग्यालेरी' : 'Video Gallery'}</a>
            </div>
          </li>

          

          <li
            className={`nav-dropdown${openDropdown === 'location' ? ' open' : ''}`}
            onMouseEnter={() => setOpenDropdown('location')}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <a
              href="#location"
              className="nav-dropdown-trigger"
              onClick={() => setOpenDropdown((k) => (k === 'location' ? null : 'location'))}
              aria-expanded={openDropdown === 'location'}
            >
              {lang === 'ne' ? 'स्थान' : 'Location'} <span className="nav-dropdown-caret">▾</span>
            </a>
            <div className="nav-dropdown-menu" role="menu">
              <a href="#office" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'कार्यालय ठेगाना' : 'Office Address'}</a>
              <a href="#map" onClick={() => setOpenDropdown(null)} role="menuitem">Google Map</a>
            </div>
          </li>

          <li
            className={`nav-dropdown${openDropdown === 'contact' ? ' open' : ''}`}
            onMouseEnter={() => setOpenDropdown('contact')}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <a
              href="#contact"
              className="nav-dropdown-trigger"
              onClick={() => setOpenDropdown((k) => (k === 'contact' ? null : 'contact'))}
              aria-expanded={openDropdown === 'contact'}
            >
              {lang === 'ne' ? 'सम्पर्क' : 'Contact'} <span className="nav-dropdown-caret">▾</span>
            </a>
            <div className="nav-dropdown-menu" role="menu">
              <a href="#phone" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'फोन नम्बर' : 'Phone'}</a>
              <a href="#email" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'इमेल ठेगाना' : 'Email'}</a>
              <a href="#contact-form" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'सम्पर्क फारम' : 'Contact Form'}</a>
              <a href="#social" onClick={() => setOpenDropdown(null)} role="menuitem">{lang === 'ne' ? 'सामाजिक सञ्जाल लिंक' : 'Social Links'}</a>
            </div>
          </li>
        </ul>

        <div className="nav-right">
          <div className="lang-toggle">
            <button
              className={`lang-btn${lang === 'ne' ? ' active' : ''}`}
              onClick={() => switchLang('ne')}
              aria-label="Switch to Nepali"
            >
              ने
            </button>
            <button
              className={`lang-btn${lang === 'en' ? ' active' : ''}`}
              onClick={() => switchLang('en')}
              aria-label="Switch to English"
            >
              EN
            </button>
          </div>

          <a
            href="#pos"
            className="nav-pos-btn"
            title={lang === 'ne' ? 'कर्मचारी लगइन / POS टर्मिनल' : 'Staff Login / POS Terminal'}
            aria-label="POS Terminal"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(197, 17, 48, 0.1)',
              border: '1px solid rgba(197, 17, 48, 0.3)',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#C51130',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '13px',
              marginRight: '12px',
              gap: '6px',
              transition: 'all 0.3s ease'
            }}
          >
            🔑 POS
          </a>

          <a
            href="https://www.facebook.com/profile.php?id=61563117696366"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-fb"
            title="Facebook — Dhakal Traders"
            aria-label="Facebook"
          >
            <svg viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>

          <button
            className={`hamburger${menuOpen ? ' open' : ''}`}
            id="hamburger"
            aria-label="Toggle mobile menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile menu — one row per section; tap to expand sub-links */}
      {menuOpen && (
        <div className="mobile-menu" role="navigation" aria-label="Mobile navigation">
          <a href="#about" onClick={closeMenu}>{lang === 'ne' ? 'हाम्रो बारेमा' : 'About Us'}</a>

          {([
            {
              key: 'founder',
              href: '#owner',
              label: { ne: 'संस्थापक', en: 'Founder' },
              children: [
                { href: '#owner-intro', ne: 'परिचय', en: 'Introduction' },
                { href: '#owner-bio', ne: 'जीवनी', en: 'Biography' },
                { href: '#owner-service', ne: 'समाजसेवा', en: 'Social Service' },
                { href: '#owner-honors', ne: 'सम्मान तथा उपलब्धिहरू', en: 'Honors & Achievements' },
                { href: '#owner-contact', ne: 'सम्पर्क विवरण', en: 'Contact Details' },
              ],
            },
            {
              key: 'services',
              href: '#services',
              label: { ne: 'सेवाहरू', en: 'Services' },
              children: [
                { href: '#herbs', ne: 'जडीबुटी खरिद–बिक्री', en: 'Herb Trade' },
                { href: '#agri-materials', ne: 'कृषि सामग्री आपूर्ति', en: 'Agricultural Supplies' },
                { href: '#daily-items', ne: 'दैनिक उपभोग्य वस्तु बिक्री', en: 'Daily Consumables' },
                { href: '#farmer-advice', ne: 'किसान परामर्श सेवा', en: 'Farmer Consulting' },
                { href: '#wholesale', ne: 'होलसेल तथा खुद्रा सेवा', en: 'Wholesale & Retail' },
              ],
            },
            {
              key: 'products',
              href: '#products',
              label: { ne: 'उत्पादनहरू', en: 'Products' },
              children: [
                { group: true, ne: 'जडीबुटी', en: 'Herbs' },
                { href: '#timur', ne: 'टिमुर', en: 'Timur' },
                { href: '#ginger', ne: 'अदुवा', en: 'Ginger' },
                { href: '#hemp-seeds', ne: 'भाङ्गो', en: 'Hemp Seeds' },
                { href: '#garlic', ne: 'लसुन', en: 'Garlic' },
                { href: '#beans', ne: 'सिमी', en: 'Beans' },
                { href: '#grains', ne: 'खाद्यान्न', en: 'Grains' },
                { href: '#agri-materials', ne: 'कृषि सामग्री', en: 'Agri Materials' },
                { href: '#daily-items', ne: 'दैनिक उपभोग्य वस्तुहरू', en: 'Daily Consumables' },
              ],
            },
            {
              key: 'gallery',
              href: '#gallery',
              label: { ne: 'ग्यालेरी', en: 'Gallery' },
              children: [
                { href: '#photo-gallery', ne: 'फोटो ग्यालेरी', en: 'Photo Gallery' },
                { href: '#video-gallery', ne: 'भिडियो ग्यालेरी', en: 'Video Gallery' },
              ],
            },
            {
              key: 'location',
              href: '#location',
              label: { ne: 'स्थान', en: 'Location' },
              children: [
                { href: '#office', ne: 'कार्यालय ठेगाना', en: 'Office Address' },
                { href: '#map', ne: 'Google Map', en: 'Google Map' },
              ],
            },
            {
              key: 'contact',
              href: '#contact',
              label: { ne: 'सम्पर्क', en: 'Contact' },
              children: [
                { href: '#phone', ne: 'फोन नम्बर', en: 'Phone' },
                { href: '#email', ne: 'इमेल ठेगाना', en: 'Email' },
                { href: '#contact-form', ne: 'सम्पर्क फारम', en: 'Contact Form' },
                { href: '#social', ne: 'सामाजिक सञ्जाल लिंक', en: 'Social Links' },
              ],
            },
          ] as const).map((section) => (
            <div key={section.key} className="mobile-nav-section">
              <button
                type="button"
                className={`mobile-dropdown-trigger${openDropdown === section.key ? ' open' : ''}`}
                onClick={() => toggleMobileSection(section.key)}
                aria-expanded={openDropdown === section.key}
              >
                <span>{lang === 'ne' ? section.label.ne : section.label.en}</span>
                <span className="nav-dropdown-caret" aria-hidden>▾</span>
              </button>
              {openDropdown === section.key && (
                <div className="mobile-dropdown-panel">
                  <a className="mobile-dropdown-link mobile-dropdown-link--main" href={section.href} onClick={closeMenu}>
                    {lang === 'ne' ? `सबै ${section.label.ne}` : `All ${section.label.en}`}
                  </a>
                  {section.children.map((child, i) => {
                    if ('group' in child) {
                      return (
                        <div key={`${section.key}-g-${i}`} className="mobile-dropdown-group">
                          {lang === 'ne' ? child.ne : child.en}
                        </div>
                      );
                    }
                    return (
                      <a
                        key={child.href}
                        className="mobile-dropdown-link"
                        href={child.href}
                        onClick={closeMenu}
                      >
                        {lang === 'ne' ? child.ne : child.en}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Mobile language switcher */}
          <div className="mobile-lang-toggle">
            <button
              className={`lang-btn${lang === 'ne' ? ' active' : ''}`}
              onClick={() => switchLang('ne')}
              aria-label="Switch to Nepali"
            >
              ने
            </button>
            <button
              className={`lang-btn${lang === 'en' ? ' active' : ''}`}
              onClick={() => switchLang('en')}
              aria-label="Switch to English"
            >
              EN
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function AppContent() {
  const [isLoaded, setIsLoaded] = useState(false);
  const { lang } = useLanguage();
  const pathname = window.location.pathname.toLowerCase();
  const isResponsePage = pathname === '/response' || pathname === '/response/' || pathname.startsWith('/response/');

  const getViewFromHash = (h: string) => {
    const lowerH = h.toLowerCase();
    if (!lowerH || lowerH === '#home' || lowerH === '#') return 'home';
    if (lowerH.startsWith('#owner')) return 'owner';
    if (lowerH.startsWith('#gallery') || lowerH.startsWith('#photo') || lowerH.startsWith('#video')) return 'gallery';
    if (lowerH === '#pos' || lowerH === '#dashboard') return 'pos';
    const cleanHash = lowerH.replace('#', '').replace(/^\//, '').replace(/\/$/, '');

    const aliasMap: Record<string, string> = {
      jadibuti: 'herbs',
      'timur-prod': 'timur',
      'herb-trade': 'herbs',
      'agri-supply': 'agri-materials',
      consumables: 'daily-items',
      satuwa: 'herbs',
      kurilo: 'herbs',
      padamchal: 'herbs',
      jatamansi: 'herbs',
    };

    const normalizedHash = aliasMap[cleanHash] ?? cleanHash;
    
    // Explicit home anchors
    const homeAnchors = ['about', 'services', 'location', 'contact', 'hero', 'navbar', 'office', 'map', 'phone', 'email', 'contact-form', 'social', 'address', 'registration'];
    if (homeAnchors.includes(normalizedHash)) return 'home';

    // Dedicated pages
    if (normalizedHash === 'shop') return 'shop';
    if (normalizedHash === 'products') return 'products';
    const productRoutes = ['timur', 'herbs', 'grains', 'agri-materials', 'daily-items', 'farmer-advice', 'wholesale', 'ginger', 'hemp-seeds', 'garlic', 'beans'];
    if (productRoutes.includes(normalizedHash)) return normalizedHash;
    
    // Add admin chat view
    if (lowerH === '#admin-chats' || lowerH === '#adminchats') return 'admin-chats';
    // Inventory admin views
    if (lowerH.startsWith('#inventory-products') || lowerH.startsWith('#inventory-stock') || lowerH.startsWith('#inventory-low') || lowerH === '#inventory') {
      if (lowerH.startsWith('#inventory-products')) return 'inventory-products';
      if (lowerH.startsWith('#inventory-stock')) return 'inventory-stock';
      if (lowerH.startsWith('#inventory-low')) return 'inventory-low';
      if (lowerH.startsWith('#inventory-categories')) return 'inventory-categories';
      if (lowerH.startsWith('#inventory-brands')) return 'inventory-brands';
      if (lowerH.startsWith('#inventory-warehouses')) return 'inventory-warehouses';
      if (lowerH.startsWith('#inventory-batches')) return 'inventory-batches';
      if (lowerH.startsWith('#inventory-expiry')) return 'inventory-expiry';
      return 'inventory';
    }
    // Add register view
    if (lowerH === '#register') return 'register';
    // Default fallback
    return 'home';
  };

  const [activeView, setActiveView] = useState<string>(getViewFromHash(window.location.hash || ''));

  // POS auth state — read from session on mount
  const [posAuthed,  setPosAuthed]  = useState<boolean>(() => !!getPOSSession().token);
  const [posCashier, setPosCashier] = useState<string>(() => getPOSSession().cashier || '');
  const [posRole,    setPosRole]    = useState<string>(() => getPOSSession().role    || '');

  useEffect(() => {
    const t = window.setTimeout(() => setIsLoaded(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash || '';
      
      // If we are on response page and a hash is clicked, redirect to home page with that hash
      if (isResponsePage && h && h !== '#' && h !== '#home') {
        window.location.href = '/' + h;
        return;
      }

      setActiveView(getViewFromHash(h));
      // If there is a hash target, attempt to scroll to it after view activation
      if (h) {
        const id = h.replace('#', '');
        // small delay to allow view/component to mount
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    onHashChange();

    return () => window.removeEventListener('hashchange', onHashChange);
  }, [isResponsePage]);

  const isPOSPage =
    pathname === '/pos' ||
    pathname === '/pos/' ||
    pathname.startsWith('/pos/') ||
    pathname === '/dashboard' ||
    pathname === '/dashboard/' ||
    pathname.startsWith('/dashboard/');
  const isPOSActive = isPOSPage || activeView === 'pos';

  if (isPOSActive) {
    if (!posAuthed) {
      return (
        <POSLogin
          onAuthenticated={(cashier, role) => {
            setPosCashier(cashier);
            setPosRole(role);
            setPosAuthed(true);
          }}
        />
      );
    }
    return (
      <POSDashboard
        onLogout={() => {
          clearPOSSession();
          setPosAuthed(false);
          setPosCashier('');
          setPosRole('');
          window.location.hash = '';
        }}
      />
    );
  }

  return (
    <>
      {/* LOADER */}
      <div className={`loader${isLoaded ? ' hidden' : ''}`} id="loader" aria-hidden={isLoaded}>
        <div className="loader-icon">🏪</div>
        <div className="loader-text">ढकाल ट्रेडर्स एण्ड सप्लायर्स</div>
        <div className="loader-subtext">Dhakal Traders &amp; Suppliers</div>
        <div className="loader-year">✦ Est. 2062 B.S. — Bagchaur, Salyan ✦</div>
        <div className="loader-bar">
          <div className="loader-fill"></div>
        </div>
      </div>

      {/* Nepal flag stripe */}
      <div className="flag-stripe" aria-hidden="true"></div>

      <PublicNavbar />

      {isResponsePage ? (
        <>
          <ResponsePage />
        </>
      ) : activeView === 'owner' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <Owner />
          <Footer />
        </>
      ) : activeView === 'gallery' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <Gallery />
          <Footer />
        </>
      ) : activeView === 'products' ? (
        <>
          <Products />
          <Footer />
        </>
      ) : activeView === 'inventory' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <InventoryDashboard />
          <Footer />
        </>
      ) : activeView === 'inventory-products' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <ProductList />
          <Footer />
        </>
      ) : activeView === 'inventory-stock' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <StockList />
          <Footer />
        </>
      ) : activeView === 'inventory-low' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <LowStock />
          <Footer />
        </>
      ) : activeView === 'inventory-categories' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <Categories />
          <Footer />
        </>
      ) : activeView === 'inventory-brands' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <Brands />
          <Footer />
        </>
      ) : activeView === 'inventory-warehouses' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <Warehouses />
          <Footer />
        </>
      ) : activeView === 'inventory-batches' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <Batches />
          <Footer />
        </>
      ) : activeView === 'inventory-expiry' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <ExpiryAlerts />
          <Footer />
        </>
      ) : activeView === '404' ? (
        <>
          <NotFound />
          <Footer />
        </>
      ) : activeView === 'shop' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <Shop />
          <Footer />
        </>
      ) : activeView === 'admin-chats' ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <section id="admin-chats" style={{ padding: '24px 0 8px' }}>
            <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
              <div className="section-title" style={{ marginBottom: 12 }}>
                <span className="section-sub">Admin Chats</span>
                <h2>{lang === 'ne' ? 'लाइभ च्याट र ग्राहक सहयोग' : 'Live Chat & Customer Support'}</h2>
              </div>
              <p style={{ maxWidth: 760, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                {lang === 'ne'
                  ? 'ग्राहक सोधपुछ, अर्डर जानकारी, र सहायता अनुरोधका लागि हाम्रो रियल-टाइम च्याट प्रणाली प्रयोग गर्नुहोस्।'
                  : 'Use our real-time chat system for customer inquiries, order updates, and help requests.'}
              </p>
            </div>
            <ChatWidget />
          </section>
          <Footer />
        </>
      ) : activeView !== 'home' ? (
        <>
          <ProductPage category={activeView} />
          <Footer />
        </>
      ) : (
        <section className="hero" id="hero" aria-label="Hero section">
          <div className="hero-wave-divider">
            <svg
              viewBox="0 0 1920 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              style={{ width: '100%', height: 120, display: 'block', position: 'absolute', bottom: 0, left: 0, zIndex: 2 }}
              aria-hidden="true"
            >
              <path d="M0 60 Q 320 0 640 60 T 1280 60 T 1920 60 V120 H0Z" fill="white" />
            </svg>
          </div>
          <div className="hero-bg"></div>
          <div className="hero-pattern"></div>
          <div className="hero-red-accent"></div>
          <div className="hero-circle hc1"></div>
          <div className="hero-circle hc2"></div>
          <div className="hero-circle hc3"></div>
          <div className="hero-circle hc4"></div>

          <div className="hero-est">
            {lang === 'ne' ? '✦ वि.सं. २०६२ देखि — दुई दशकको अनुभव ✦' : '✦ Since 2062 B.S. (2005 A.D.) — Two Decades of Trust ✦'}
          </div>
          <div className="hero-badge">
            {lang === 'ne' ? '✦ बागचौर · सल्यान · नेपाल ✦' : '✦ Bagchaur · Salyan · Nepal ✦'}
          </div>
          <h1 className="hero-title">
            {lang === 'ne'
              ? <>{`ढकाल\u00a0ट्रेडर्स`}<br />{`एण्ड\u00a0सप्लायर्स`}</>
              : <>{`Dhakal\u00a0Traders`}<br />{`&\u00a0Suppliers`}</>
            }
          </h1>
          <p className="hero-en-title">
            {lang === 'ne' ? 'Dhakal Traders & Suppliers' : 'ढकाल ट्रेडर्स एण्ड सप्लायर्स'}
          </p>
          <div className="hero-line"></div>
          <p className="hero-tagline">
            {lang === 'ne'
              ? 'विभिन्न दैनिक उपभोग्य सामानहरू पाइन्छन् साथै विभिन्न जडीबुटी खरिद बिक्री गरिन्छ। वि.सं. २०६२ देखि स्थानीय किसान र ग्राहकहरूको भरोसाको साथी।'
              : 'We offer various daily consumer goods and trade in various medicinal herbs. Your trusted partner for farmers and customers since 2062 B.S.'}
          </p>
          <div className="hero-btns">
            <a href="#products" className="btn-primary">
              {lang === 'ne' ? 'हाम्रा उत्पादनहरू हेर्नुहोस्' : 'View Our Products'}
            </a>
            <a href="#contact" className="btn-outline">
              {lang === 'ne' ? 'कोटेशन प्राप्त गर्नुहोस्' : 'Get a Quote'}
            </a>
          </div>
        </section>
      )}

      {!isResponsePage && activeView === 'home' && (
        <>
          <About />
          <Services />
          <Products />
          <Location />
          <Contact />
          <Footer />
        </>
      )}

      {/* Global Chat Widget */}
      {!isPOSActive && <ChatWidget />}

      {/* BACK TO TOP */}
      {!isResponsePage && activeView === 'home' && (
        <button
          className="back-top"
          id="backTop"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ↑
        </button>
      )}
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
