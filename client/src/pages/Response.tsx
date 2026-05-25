import { FormEvent, useEffect, useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { ownerProfile } from '../data/ownerData';
import CopyableContact from '../components/CopyableContact';

type ContactEntry = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  subject: string;
  message: string;
  created_at: string;
};

const STORAGE_KEY = 'dhakal_admin_session';

const ResponsePage = () => {
  const { lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionPassword, setSessionPassword] = useState('');
  const [sessionEmail, setSessionEmail] = useState('');
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotActive, setForgotActive] = useState(false);

  const t = (ne: string, en: string) => (lang === 'en' ? en : ne);

  const loadContacts = async (pwd: string, em?: string) => {
    setLoading(true);
    setError('');

    try {
      const finalEmail = em || sessionEmail || email;
      const res = await fetch('/api/contacts', {
        headers: {
          'x-admin-email': finalEmail,
          'x-admin-password': pwd,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || t('लगइन असफल भयो', 'Login failed'));
        setContacts([]);
        return;
      }

      setContacts(Array.isArray(data?.contacts) ? data.contacts : []);
      setSessionPassword(pwd);
      // persist email+password together
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ email: sessionEmail || email, password: pwd }));
      } catch {}
    } catch {
      setError(t('सर्भरसँग जडान गर्न सकिएन', 'Could not connect to server'));
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY) || '';
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj?.password) {
          const savedEmail = obj.email || '';
          setPassword(obj.password);
          setSessionEmail(savedEmail);
          setEmail(savedEmail);
          void loadContacts(obj.password, savedEmail);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError(t('इमेल आवश्यक छ', 'Email is required'));
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t('मान्य इमेल लेख्नुहोस्', 'Please enter a valid email'));
    if (!password.trim()) return setError(t('पासवर्ड आवश्यक छ', 'Password is required'));
    setError('');
    const trimmedEmail = email.trim();
    setSessionEmail(trimmedEmail);
    await loadContacts(password.trim(), trimmedEmail);
  };

  const onLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSessionPassword('');
    setPassword('');
    setContacts([]);
    setError('');
  };

  const loggedIn = !!sessionPassword;

  return (
    <main className="response-page">
      <div className="response-wrap">
        <div className="response-head">
          <h1>{t('सम्पर्क प्रतिक्रिया', 'Contact Responses')}</h1>
          <p>{t('/response/ पेजबाट लगइन गरेर ग्राहकहरूको सन्देश हेर्नुहोस्।', 'Login from /response/ and review submitted contact messages.')}</p>
        </div>

        {!loggedIn ? (
          <form className="response-login" onSubmit={onLogin}>
              <label htmlFor="admin-email">{t('इमेल', 'Email')}</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('इमेल लेख्नुहोस्', 'Enter email')}
              />

              <label htmlFor="admin-password">{t('पासवर्ड', 'Password')}</label>
              <div className="password-input-wrapper">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('पासवर्ड लेख्नुहोस्', 'Enter password')}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('पासवर्ड लुकाउनुहोस्', 'Hide password') : t('पासवर्ड देखाउनुहोस्', 'Show password')}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.815 7.815 3 3m-3-3a9.79 9.79 0 0 1-5.065 1.576m-3.565-3.565a3 3 0 0 1-4.242-4.242M9.88 9.88l4.24 4.24" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>

              <div>
                <button type="button" className="response-forgot-btn" onClick={() => setForgotActive(true)}>
                  {t('पासवर्ड बिर्सनुभयो?', 'Forgot password?')}
                </button>
              </div>

            {forgotActive && (
              <div className="forgot-instruction-card">
                <h3>{t('पासवर्ड पुन: प्राप्त गर्ने तरिका', 'Password Recovery')}</h3>
                <p>
                  {t(
                    'सुरक्षा संवेदनशीलताका कारण, पासवर्ड रिसेट गर्न सिधै ढकाल ट्रेडर्सका प्रबन्ध निर्देशक दिपक शर्मा वा प्राविधिक प्रतिनिधिलाई सम्पर्क गर्नुहोस्।',
                    'Due to security guidelines, please contact managing director Dipak Sharma or your technical representative directly to reset the admin password.'
                  )}
                </p>
                <div className="forgot-contact-details">
                  <p>
                    <strong>{t('फोन:', 'Phone:')}</strong>{' '}
                    <CopyableContact
                      href="tel:+9779857823400"
                      value="+977-9857823400"
                      displayValue="+977-9857823400"
                      label={t('फोन नम्बर', 'Phone number')}
                      copyText={t('कपी', 'Copy')}
                      copiedText={t('कपी भयो', 'Copied')}
                    />
                  </p>
                  <p>
                    <strong>{t('इमेल:', 'Email:')}</strong>{' '}
                    <CopyableContact
                      href={`mailto:${ownerProfile.contact.email}?subject=Admin password reset request`}
                      value={ownerProfile.contact.email}
                      displayValue={ownerProfile.contact.email}
                      label={t('इमेल ठेगाना', 'Email address')}
                      copyText={t('कपी', 'Copy')}
                      copiedText={t('कपी भयो', 'Copied')}
                    />
                  </p>
                </div>
                <button type="button" className="close-forgot-btn" onClick={() => setForgotActive(false)}>
                  {t('बन्द गर्नुहोस्', 'Close')}
                </button>
              </div>
            )}

            {error && <div className="response-error">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? t('लगइन हुँदै...', 'Logging in...') : t('लगइन', 'Login')}
            </button>
          </form>
        ) : (
          <section className="response-table-wrap">
            <div className="response-toolbar">
              <button type="button" onClick={() => void loadContacts(sessionPassword)} disabled={loading}>
                {loading ? t('रिफ्रेस हुँदै...', 'Refreshing...') : t('रिफ्रेस', 'Refresh')}
              </button>
              <button type="button" className="ghost" onClick={onLogout}>
                {t('लगआउट', 'Logout')}
              </button>
            </div>

            {error && <div className="response-error">{error}</div>}

            <div className="response-table-scroller">
              <table className="response-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>{t('नाम', 'Name')}</th>
                    <th>{t('इमेल', 'Email')}</th>
                    <th>{t('फोन', 'Phone')}</th>
                    <th>{t('विषय', 'Subject')}</th>
                    <th>{t('सन्देश', 'Message')}</th>
                    <th>{t('मिति', 'Date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty">{t('कुनै डाटा छैन', 'No contacts found')}</td>
                    </tr>
                  ) : (
                    contacts.map((c) => (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td>{c.name}</td>
                        <td>{c.email || '-'}</td>
                        <td>{c.phone || '-'}</td>
                        <td>{c.subject}</td>
                        <td>{c.message}</td>
                        <td>{new Date(c.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default ResponsePage;
