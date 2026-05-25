import { useState, useEffect } from 'react';
import { useReveal } from '../hooks/useReveal';
import { useLanguage } from '../LanguageContext';
import { galleryData, GalleryItem } from '../data/galleryData';

const Gallery = () => {
  const ref = useReveal();
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<'photo' | 'video'>('photo');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const t = (ne: string, en: string) => (lang === 'en' ? en : ne);

  const photos = galleryData.filter((item) => item.type === 'photo');
  const videos = galleryData.filter((item) => item.type === 'video');

  // Handle lightbox keyboard controls (Esc, ArrowLeft, ArrowRight)
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos.length]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxIndex]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <section id="gallery" ref={ref}>
      <div className="gallery-wrap">
        <div className="reveal">
          <span className="section-label">{t('हाम्रो सङ्ग्रह', 'Our Gallery')}</span>
          <h2 className="section-title">{t('फोटो तथा भिडियो ग्यालेरी', 'Photo & Video Gallery')}</h2>
          <p className="section-subtitle">
            {t('ढकाल ट्रेडर्स एण्ड सप्लायर्सका विभिन्न गतिविधि, उत्पादन र कृषि सेवाहरू', 'Various activities, products, and agricultural services of Dhakal Traders & Suppliers')}
          </p>
          <div className="section-line" />
        </div>

        {/* Tab Controls */}
        <div className="gallery-tabs reveal">
          <button
            type="button"
            className={`gallery-tab-btn ${activeTab === 'photo' ? 'active' : ''}`}
            onClick={() => setActiveTab('photo')}
          >
            <span className="gallery-tab-btn-icon">🖼️</span>
            {t('फोटो ग्यालेरी', 'Photo Gallery')}
          </button>
          <button
            type="button"
            className={`gallery-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            <span className="gallery-tab-btn-icon">🎥</span>
            {t('भिडियो ग्यालेरी', 'Video Gallery')}
          </button>
        </div>

        {/* Photo Gallery Tab Content */}
        {activeTab === 'photo' && (
          <div className="gallery-photo-grid reveal">
            {photos.map((item, idx) => (
              <div
                key={item.id}
                className="gallery-photo-card"
                onClick={() => setLightboxIndex(idx)}
                role="button"
                tabIndex={0}
                aria-label={`View photo ${idx + 1}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setLightboxIndex(idx);
                  }
                }}
              >
                <img src={item.src} alt={t(item.altNe, item.altEn)} loading="lazy" />
                <div className="gallery-photo-overlay">
                  <h3 className="gallery-photo-title">{t(item.altNe, item.altEn)}</h3>
                  <span className="gallery-photo-sub">{t('ढकाल ट्रेडर्स सल्यान', 'Dhakal Traders Salyan')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video Gallery Tab Content */}
        {activeTab === 'video' && (
          <div className="gallery-video-grid reveal">
            {videos.map((item) => (
              <div key={item.id} className="gallery-video-card">
                <div className="gallery-video-iframe-wrap">
                  <iframe
                    src={item.src}
                    title={t(item.altNe, item.altEn)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                <div className="gallery-video-info">
                  <span className="gallery-video-tag">{t('कृषि वृत्तचित्र', 'Agri Documentary')}</span>
                  <h3 className="gallery-video-title">{t(item.altNe, item.altEn)}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <div
          className="gallery-lightbox"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image View"
        >
          <button
            type="button"
            className="gallery-lightbox-close"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close Lightbox"
          >
            &times;
          </button>

          <button
            type="button"
            className="gallery-lightbox-nav gallery-lightbox-nav--prev"
            onClick={handlePrev}
            aria-label="Previous Image"
          >
            &#10094;
          </button>

          <div className="gallery-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-lightbox-img-wrap">
              <img
                src={photos[lightboxIndex].src}
                alt={t(photos[lightboxIndex].altNe, photos[lightboxIndex].altEn)}
              />
            </div>
            <div className="gallery-lightbox-caption">
              <h4>{t(photos[lightboxIndex].altNe, photos[lightboxIndex].altEn)}</h4>
              <p>{t('फोटो ग्यालेरी — ढकाल ट्रेडर्स एण्ड सप्लायर्स', 'Photo Gallery — Dhakal Traders & Suppliers')}</p>
            </div>
          </div>

          <button
            type="button"
            className="gallery-lightbox-nav gallery-lightbox-nav--next"
            onClick={handleNext}
            aria-label="Next Image"
          >
            &#10095;
          </button>
        </div>
      )}
    </section>
  );
};

export default Gallery;
