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
import InventoryHub from './features/inventory/InventoryHub';
import dhakalLogo from './image/Dhakal Traders Logo .png';

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
            try {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'dashboard');
              url.searchParams.delete('customerId');
              const next = `${url.pathname}${url.search}`;
              window.history.replaceState({}, '', next);
            } catch {}
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
      ) : activeView === 'inventory' || activeView.startsWith('inventory-') ? (
        <>
          <div style={{ paddingTop: '92px' }} />
          <InventoryHub view={activeView as any} />
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
