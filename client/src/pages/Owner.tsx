import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '../LanguageContext';
import { useReveal } from '../hooks/useReveal';
import CopyableContact from '../components/CopyableContact';
import ProtectedImage from '../components/ProtectedImage';
import { ownerProfile, leadershipItems, exploreLinks, getOwnerContactDetails } from '../data/ownerData';

const FALLBACK_AVATAR =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <rect width="512" height="512" rx="64" fill="#111827"/>
      <circle cx="256" cy="192" r="88" fill="#f3f4f6"/>
      <path d="M96 432c22-86 90-128 160-128s138 42 160 128" fill="#f3f4f6"/>
      <text x="256" y="286" text-anchor="middle" font-size="56" font-family="Arial, sans-serif" fill="#111827">DS</text>
    </svg>
  `);

const isPublicUrl = (value: string | undefined) => !!value && !/^https?:\/\/(127\.0\.0.1|localhost)(:\d+)?/i.test(value);

const Owner = () => {
  const { lang } = useLanguage();
  const revealRef: any = useReveal();
  const ownerRef = useRef<HTMLElement | null>(null);
  const setRefs = (el: any) => {
    try {
      revealRef.current = el;
    } catch (err) {}
    ownerRef.current = el;
  };

  const [photoOpen, setPhotoOpen] = useState(false);
  // handle context menu and copy actions within owner section
  const preventCopyActions = (e: any) => {
    try {
      e.preventDefault();
    } catch (err) {
      // ignore
    }
  };

  const downloadBlackImage = async (fileName = 'owner-photo.png') => {
    // create a black PNG blob and trigger download
    const size = 2048; // high-res black image
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    return new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
        resolve();
      }, 'image/png');
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // trigger download of black image instead of showing context menu
    downloadBlackImage('dhakal-owner.png');
  };
  const t = (ne: string, en: string) => (lang === 'en' ? en : ne);
  const contactDetails = getOwnerContactDetails();
  const photoSrc = isPublicUrl((ownerProfile.contact as any).profilePhoto) ? (ownerProfile.contact as any).profilePhoto : FALLBACK_AVATAR;

  useEffect(() => {
    document.body.style.overflow = photoOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [photoOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPhotoOpen(false);
      // prevent common keys that might trigger copy-ish behavior
      if (event.key === 'PrintScreen') {
        // best-effort: clear selection
        try {
          window.getSelection()?.removeAllRanges();
          // briefly show blackout to catch printscreen
          if (ownerRef.current) {
            ownerRef.current.classList.add('print-block');
            setTimeout(() => ownerRef.current && ownerRef.current.classList.remove('print-block'), 600);
          }
        } catch (err) {}
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // blur/hide content when the page becomes hidden (best-effort to reduce screenshots when switching apps)
  useEffect(() => {
    const el = ownerRef.current;
    if (!el) return;
    const onVis = () => {
      if (document.hidden) el.classList.add('blurred');
      else el.classList.remove('blurred');
    };
    document.addEventListener('visibilitychange', onVis);
    // handle print events to show blackout overlay
    const onBeforePrint = () => el.classList.add('print-block');
    const onAfterPrint = () => el.classList.remove('print-block');
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <section id="owner" ref={setRefs} className="protected" onContextMenu={handleContextMenu} onCopy={preventCopyActions} onCut={preventCopyActions}>
      <header className="owner-hero reveal">
          <div className="owner-hero-pattern" aria-hidden="true">
            <svg
              className="nepal-flag-motif nepal-flag-moon"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M50 10 A40 40 0 1 0 90 50 A30 30 0 1 1 50 10 Z" fill="rgba(255,255,255,0.06)" />
            </svg>
            <svg
              className="nepal-flag-motif nepal-flag-sun"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon points="50,10 55,35 80,30 65,50 80,70 55,65 50,90 45,65 20,70 35,50 20,30 45,35" fill="rgba(255,255,255,0.06)" />
            </svg>
          </div>
          <div className="owner-hero-inner">
            <div className="owner-hero-photo-wrap">
              <div className="owner-hero-photo no-export">
                <div className="no-export-overlay" aria-hidden="true" />
                <ProtectedImage src={photoSrc} alt={`${ownerProfile.hero.nameEn} portrait`} />
              </div>
              <button type="button" className="owner-photo-view-btn" onClick={() => setPhotoOpen(true)}>
                <span aria-hidden="true">⤢</span>
                {t('फोटो हेर्नुहोस्', 'View Photo')}
              </button>
            </div>

            <h1 className="owner-hero-title">{t(ownerProfile.hero.nameNe, ownerProfile.hero.nameEn)}</h1>

            <div className="owner-hero-role-row">
              <span className="owner-hero-role">{t(ownerProfile.hero.roleNe, ownerProfile.hero.roleEn)}</span>
              <span className="owner-hero-dot">•</span>
              <span className="owner-hero-handle">{ownerProfile.hero.handle}</span>
            </div>

            <p className="owner-hero-summary">{t(ownerProfile.hero.summaryNe, ownerProfile.hero.summaryEn)}</p>

            <div className="owner-hero-actions">
              {ownerProfile.actions.map((action) => (
                <a
                  key={action.href}
                  className={action.className}
                  href={action.href}
                  target={action.href.startsWith('http') ? '_blank' : undefined}
                  rel={action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  <span aria-hidden="true">{action.icon}</span>
                  {t(action.labelNe, action.labelEn)}
                </a>
              ))}
            </div>
          </div>
        </header>

      <div className="owner-page">
        <section className="owner-content-section">
          <div className="owner-content-grid">
            <div className="owner-main-col">
              <article id="owner-intro" className="owner-panel reveal">
                <h2 className="owner-panel-title">
                  <i className="fa-solid fa-user-circle" /> {t('परिचय', 'Introduction')}
                </h2>
                <div className="owner-prose">
                  {ownerProfile.bio.opening.ne.map((line, index) => (
                    <p key={line}>{t(line, ownerProfile.bio.opening.en[index])}</p>
                  ))}
                </div>
              </article>

              <article id="owner-bio" className="owner-panel reveal">
                <h2 className="owner-panel-title">
                  <i className="fa-solid fa-id-card" /> {t('जीवनी', 'Biography')}
                </h2>
                <div className="owner-prose">
                  {ownerProfile.bio.biography.map((entry) => (
                    <p key={entry.ne}>{t(entry.ne, entry.en)}</p>
                  ))}
                </div>
              </article>

              <article id="owner-inspiration" className="owner-panel reveal">
                <h2 className="owner-panel-title">
                  <i className="fa-solid fa-lightbulb" /> {t('प्रेरणा', 'Inspiration')}
                </h2>
                <div className="owner-prose">
                  {ownerProfile.bio.inspiration.intro.ne.map((line, index) => (
                    <p key={line}>{t(line, ownerProfile.bio.inspiration.intro.en[index])}</p>
                  ))}
                  <h3>{t('उहाँका प्रेरणादायी विचारहरू', 'His Inspirational Thoughts')}</h3>
                  <ul>
                    {ownerProfile.bio.inspiration.quoteBullets.map((point) => (
                      <li key={point.ne}>{t(point.ne, point.en)}</li>
                    ))}
                  </ul>
                </div>
              </article>

              <article id="owner-leadership" className="owner-panel reveal">
                <h2 className="owner-panel-title">
                  <i className="fa-solid fa-briefcase" /> {t('मुख्य जिम्मेवारी', 'Key Responsibilities & Leadership')}
                </h2>
                <div className="owner-responsibility-grid">
                  {leadershipItems.map((item) => (
                    <div className="owner-responsibility-card" key={item.en_title}>
                      <div className="owner-responsibility-icon">{item.icon}</div>
                      <div>
                        <h3>{t(item.ne_title, item.en_title)}</h3>
                        <p>{t(item.ne_desc, item.en_desc)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
              <article id="owner-vision" className="owner-panel reveal">
                <h2 className="owner-panel-title">
                  <i className="fa-solid fa-bullseye" /> {t('दृष्टि र मिशन', 'Vision & Mission')}
                </h2>
                <div className="owner-prose">
                  <h3>{t('दृष्टि (Vision)', 'Vision')}</h3>
                  <p>{t(ownerProfile.bio.vision.quoteNe, ownerProfile.bio.vision.quoteEn)}</p>
                  <h3>{t('मिशन (Mission)', 'Mission')}</h3>
                  <ul>
                    {ownerProfile.bio.vision.missionPoints.map((point) => (
                      <li key={point.ne}>{t(point.ne, point.en)}</li>
                    ))}
                  </ul>
                </div>
              </article>
              <article id="owner-service" className="owner-panel reveal">
                <h2 className="owner-panel-title">
                  <i className="fa-solid fa-hands-helping" /> {t('समाजसेवा', 'Social Service')}
                </h2>
                <div className="owner-prose">
                  <p>{t(ownerProfile.bio.service.ne, ownerProfile.bio.service.en)}</p>
                </div>
              </article>

              <article id="owner-honors" className="owner-panel reveal">
                <h2 className="owner-panel-title">
                  <i className="fa-solid fa-award" /> {t('सम्मान तथा उपलब्धिहरू', 'Honors & Achievements')}
                </h2>
                <div className="owner-prose">
                  <ul>
                    {ownerProfile.bio.honors.map((honor) => (
                      <li key={honor.en}>{t(honor.ne, honor.en)}</li>
                    ))}
                  </ul>
                </div>
              </article>

              <article id="owner-quote" className="owner-panel reveal">
                <h2 className="owner-panel-title">
                  <i className="fa-solid fa-quote-right" /> {t('प्रेरणादायी भनाइ', 'Inspirational Quote')}
                </h2>
                <div className="owner-prose">
                  <blockquote>{t('“व्यवसायको वास्तविक सफलता नाफामा मात्र होइन, ग्राहकको विश्वास र समाजको सम्मानमा निहित हुन्छ।”', '“The true success of business lies not only in profit, but in customer trust and social respect.”')}</blockquote>
                </div>
              </article>

              <article id="owner-conclusion" className="owner-panel reveal">
                <h2 className="owner-panel-title">
                  <i className="fa-solid fa-check-circle" /> {t('निष्कर्ष', 'Conclusion')}
                </h2>
                <div className="owner-prose">
                  <p>{t(ownerProfile.bio.conclusion.ne, ownerProfile.bio.conclusion.en)}</p>
                </div>
              </article>
            </div>

            <aside id="owner-contact" className="owner-panel owner-panel--profile reveal">
              <h2 className="owner-panel-title">
                <i className="fa-solid fa-address-card" /> {t('सम्पर्क विवरण', 'Contact Details')}
              </h2>

              <div className="owner-profile-top">
                <div className="owner-profile-photo no-export">
                  <div className="no-export-overlay" aria-hidden="true" />
                  <ProtectedImage src={photoSrc} alt={`${ownerProfile.hero.nameEn} profile`} width={154} height={154} />
                </div>
                <button type="button" className="owner-sidebar-photo-btn" onClick={() => setPhotoOpen(true)}>
                  {t('फोटो हेर्नुहोस्', 'View Photo')}
                </button>
              </div>

              <dl className="owner-profile-list">
                {contactDetails.map((detail) => (
                  <div key={detail.labelEn}>
                    <dt>{t(detail.labelNe, detail.labelEn)}</dt>
                    <dd>{t(detail.valueNe, detail.valueEn)}</dd>
                  </div>
                ))}
              </dl>

              <div className="owner-sidebar-divider" />

              <div className="owner-contact-stack">
                <div className="owner-contact-chip owner-contact-chip--phone">
                  <span>📞</span>
                  <div>
                    <small>{t('फोन', 'Phone')}</small>
                    <CopyableContact
                      href="tel:+9779857823400"
                      value={ownerProfile.contact.phone}
                      displayValue={ownerProfile.contact.phone}
                      label={t('फोन नम्बर', 'Phone number')}
                      copyText={t('कपी', 'Copy')}
                      copiedText={t('कपी भयो', 'Copied')}
                    />
                  </div>
                </div>
                <div className="owner-contact-chip owner-contact-chip--mail">
                  <span>✉️</span>
                  <div>
                    <small>{t('इमेल', 'Email')}</small>
                    <CopyableContact
                      href={`mailto:${ownerProfile.contact.email}`}
                      value={ownerProfile.contact.email}
                      displayValue={ownerProfile.contact.email}
                      label={t('इमेल ठेगाना', 'Email address')}
                      copyText={t('कपी', 'Copy')}
                      copiedText={t('कपी भयो', 'Copied')}
                    />
                  </div>
                </div>
                <a href={ownerProfile.contact.website} target="_blank" rel="noopener noreferrer" className="owner-contact-chip owner-contact-chip--web">
                  <span>🌐</span>
                  <div>
                    <small>{t('वेबसाइट', 'Website')}</small>
                    <strong>{ownerProfile.contact.website.replace(/^https?:\/\//, 'www.').replace(/\/$/, '')}</strong>
                  </div>
                </a>
              </div>

              <div className="owner-sidebar-divider" />

              <div className="owner-address-block">
                <small>{t('हालको स्थान', 'Current Location')}</small>
                <p>{t(ownerProfile.contact.currentLocation.ne, ownerProfile.contact.currentLocation.en)}</p>
              </div>
            </aside>
          </div>

          <section className="owner-explore reveal">
            <div className="owner-explore-head">
              <span className="owner-hero-kicker">{t('Additional Links', 'Additional Links')}</span>
              <h2>{t('अझै धेरै हेर्नुहोस्', 'Explore More')}</h2>
              <p>{t('ढकाल ट्रेडर्स एण्ड सप्लायर्ससँग सम्बन्धित थप पृष्ठहरू पनि हेर्न सक्नुहुन्छ।', 'You can also explore more pages related to Dhakal Traders & Suppliers.')}</p>
            </div>

            <div className="owner-explore-grid">
              {exploreLinks.map((item) => (
                <a key={item.en} href={item.href} className="owner-explore-card">
                  <span className="owner-explore-icon">{item.icon}</span>
                  <div>
                    <h3>{t(item.ne, item.en)}</h3>
                    <p>{t(item.noteNe, item.noteEn)}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </section>
      </div>

      {photoOpen && (
        <div className="owner-photo-modal" role="dialog" aria-modal="true" aria-label="Owner photo viewer" onClick={() => setPhotoOpen(false)}>
          <div className="owner-photo-modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="owner-photo-modal-close" aria-label="Close photo viewer" onClick={() => setPhotoOpen(false)}>
              ×
            </button>
            <div className="no-export">
              <div className="no-export-overlay" aria-hidden="true" />
              <ProtectedImage src={photoSrc} alt="Dipak Sharma full view" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Owner;
