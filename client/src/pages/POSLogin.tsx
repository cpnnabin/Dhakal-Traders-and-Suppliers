// ─── POS Login Screen ─────────────────────────────────────────────────────────
// Shown instead of the POS dashboard until the user authenticates.
// Auth token is stored in sessionStorage (clears when tab closes).
// Login is backed by the database in both local and deployed environments.

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../LanguageContext';

// ── Token helpers ─────────────────────────────────────────────────────────────

const TOKEN_KEY    = 'dt_pos_token';
const CASHIER_KEY  = 'dt_pos_cashier';
const ROLE_KEY     = 'dt_pos_role';
const USERNAME_KEY = 'dt_pos_username';

export function getPOSSession() {
  return {
    token:    sessionStorage.getItem(TOKEN_KEY)    || '',
    cashier:  sessionStorage.getItem(CASHIER_KEY)  || '',
    role:     sessionStorage.getItem(ROLE_KEY)     || '',
    username: sessionStorage.getItem(USERNAME_KEY) || '',
  };
}

export function clearPOSSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(CASHIER_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(USERNAME_KEY);
}

function savePOSSession(token: string, cashier: string, role: string, username = '') {
  sessionStorage.setItem(TOKEN_KEY,   token);
  sessionStorage.setItem(CASHIER_KEY, cashier);
  sessionStorage.setItem(ROLE_KEY,    role);
  if (username) sessionStorage.setItem(USERNAME_KEY, username);
}

function isLocalDev() {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onAuthenticated: (cashier: string, role: string) => void;
}

export default function POSLogin({ onAuthenticated }: Props) {
  const { lang } = useLanguage();
  const t = (ne: string, en: string) => (lang === 'en' ? en : ne);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPass, setShowPass] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Restore session on refresh and validate the stored token against the API.
  useEffect(() => {
    const { token, cashier, role, username } = getPOSSession();
    if (token && cashier) {
      fetch('/api/auth', { headers: { 'x-pos-token': token } })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            const resolvedCashier = data.cashier || cashier;
            const resolvedRole = data.role || role;
            const resolvedUsername = data.email || username || '';
            savePOSSession(token, resolvedCashier, resolvedRole, resolvedUsername);
            onAuthenticated(resolvedCashier, resolvedRole || role);
          }
          else clearPOSSession();
        })
        .catch(() => onAuthenticated(cashier, role));
    }
    emailRef.current?.focus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError(t('इमेल र पासवर्ड भर्नुहोस्!', 'Enter your email and password.')); return;
    }
    setLoading(true);
    setError('');

    const creds = { email: email.trim().toLowerCase(), password: password.trim() };
    const loginUrl = isLocalDev() ? '/api/pos/auth/login' : '/api/auth';

    const readJsonResponse = async (res: Response) => {
      const text = await res.text();
      if (!text) return {};
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, error: text };
      }
    };

    const loginWithDb = async (): Promise<boolean> => {
      const res = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (data.success) {
        savePOSSession(data.token, data.cashier, data.role, creds.email);
        onAuthenticated(data.cashier, data.role);
        return true;
      }
      throw new Error(data.error || t('अमान्य प्रमाण-पत्र।', 'Invalid credentials.'));
    };

    try {
      if (await loginWithDb()) return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pos-login-page">
      {/* Background accents */}
      <div className="pos-glow-accent"   style={{ top: '-200px', right: '-200px', width: '600px', height: '600px' }} />
      <div className="pos-glow-accent-2" style={{ bottom: '-200px', left: '-200px', width: '500px', height: '500px' }} />

      <div className="pos-login-card">
        {/* Logo */}
        <div className="pos-login-logo">
          <span className="pos-login-logo-icon">🏪</span>
          <div>
            <div className="pos-login-brand">{t('ढकाल ट्रेडर्स एण्ड सप्लायर्स', 'Dhakal Traders & Suppliers')}</div>
            <div className="pos-login-sub">{t('कृषि तथा खुद्रा व्यापार टर्मिनल', 'Agricultural & Retail POS Terminal')}</div>
          </div>
        </div>

        {/* Flag stripe */}
        <div className="pos-login-stripe" />

        <h2 className="pos-login-title">
          {t('कर्मचारी लगइन', 'Staff Login')}
        </h2>
        <p className="pos-login-hint">
          {t('ढकाल ट्रेडर्स POS प्रणाली प्रयोग गर्न कृपया लगइन गर्नुहोस्।',
             'Sign in with your operator credentials to access the POS system.')}
        </p>
        <p className="pos-login-hint" style={{ marginTop: -4, opacity: 0.85 }}>
          {t('आफ्नो डाटाबेसमा दर्ता भएको इमेल र पासवर्ड प्रयोग गर्नुहोस्।',
             'Use the email and password stored in the database for your account.')}
        </p>

        <form onSubmit={handleLogin} className="pos-login-form">
          {/* Email */}
          <div className="pos-input-group">
            <label htmlFor="pos-email">{t('इमेल ठेगाना', 'Email Address')}</label>
            <div className="pos-login-input-wrap">
              <i className="ri-mail-line" />
              <input
                id="pos-email"
                ref={emailRef}
                type="email"
                className="pos-form-input"
                placeholder={t('admin@dhakaltraders.com', 'admin@dhakaltraders.com')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="pos-input-group">
            <label htmlFor="pos-password">{t('पासवर्ड', 'Password')}</label>
            <div className="pos-login-input-wrap">
              <i className="ri-lock-line" />
              <input
                id="pos-password"
                type={showPass ? 'text' : 'password'}
                className="pos-form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="pos-pass-toggle"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
              >
                <i className={showPass ? 'ri-eye-off-line' : 'ri-eye-line'} />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="pos-login-error">
              <i className="ri-error-warning-line" /> {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="pos-pay-btn"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            {loading
              ? <><i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }} /> {t('प्रमाणीकरण हुँदैछ…', 'Authenticating…')}</>
              : <><i className="ri-login-box-line" /> {t('POS मा लगइन गर्नुहोस्', 'Sign in to POS Terminal')}</>
            }
          </button>
        </form>

        {/* Footer */}
        <div className="pos-login-footer">
          <i className="ri-shield-check-line" />
          {t('Cloudflare D1 द्वारा सुरक्षित प्रमाणीकरण', 'Secured by Cloudflare D1 — HMAC-SHA-256')}
        </div>

        <a href="/" className="pos-login-back">
          <i className="ri-arrow-left-line" /> {t('मुख्य वेबसाइटमा फर्कनुहोस्', 'Back to main website')}
        </a>
      </div>
    </div>
  );
}
