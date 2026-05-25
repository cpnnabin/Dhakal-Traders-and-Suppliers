import { useLanguage } from '../LanguageContext';

const NotFound = () => {
  const { lang } = useLanguage();
  const t = (ne: string, en: string) => lang === 'en' ? en : ne;

  return (
    <div style={{
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      color: '#f8fafc',
      fontFamily: 'var(--font-en), sans-serif',
      padding: '2rem',
      textAlign: 'center'
    }}>
      {/* Smiley Face SVG */}
      <div style={{ marginBottom: '2rem' }}>
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="#3b82f6" strokeWidth="4" />
          <circle cx="35" cy="40" r="4" fill="#3b82f6" />
          <circle cx="65" cy="40" r="4" fill="#3b82f6" />
          <path d="M 35 60 Q 50 75 65 60" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" fill="none" />
        </svg>
      </div>

      {/* Heading with Compass Icon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginBottom: '0.5rem'
      }}>
        <div style={{
          backgroundColor: '#1e293b',
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#3b82f6',
          fontSize: '1.5rem'
        }}>
          <i className="fa-solid fa-compass"></i>
        </div>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          margin: 0,
          color: '#ffffff'
        }}>
          404 - {t('पृष्ठ फेला परेन', 'Page Not Found')}
        </h1>
      </div>

      <p style={{
        fontSize: '1.1rem',
        color: '#94a3b8',
        marginBottom: '2rem',
        fontWeight: '500'
      }}>
        {t('तपाईंले खोज्नुभएको पृष्ठ अवस्थित छैन वा हटाइएको छ।', 'The page you\'re looking for doesn\'t exist or was moved.')}
      </p>

      <p style={{
        fontSize: '1rem',
        color: '#64748b',
        maxWidth: '500px',
        lineHeight: '1.6',
        marginBottom: '2.5rem'
      }}>
        {t(
          'माफ गर्नुहोस्... तपाईंले गलत लिंक थिच्नुभएको जस्तो देखिन्छ। लिंक बिग्रिएको हुन सक्छ वा पृष्ठ मेटाइएको हुन सक्छ।',
          'Oops... looks like you took a wrong turn. The link might be broken, or the page has been deleted.'
        )}
      </p>

      {/* Buttons */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <a href="#home" style={{
          backgroundColor: '#2563eb',
          color: '#ffffff',
          textDecoration: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
        >
          <i className="fa-solid fa-house"></i>
          {t('गृह पृष्ठमा जानुहोस्', 'Back to Home')}
        </a>

        <a href="#contact" style={{
          backgroundColor: 'transparent',
          border: '1px solid #334155',
          color: '#ffffff',
          textDecoration: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <i className="fa-solid fa-paper-plane"></i>
          {t('सम्पर्क गर्नुहोस्', 'Get in Touch')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
