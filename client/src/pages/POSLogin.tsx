// ─── POS Login Screen ─────────────────────────────────────────────────────────
// Shown instead of the POS dashboard until the user authenticates.
// Auth token is stored in sessionStorage (clears when tab closes).
// Falls back to a hardcoded offline PIN when the API is unreachable (dev mode).

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

/** Hardcoded dev login only (no backend). Express SQLite login uses mock_token_<id> and still calls the API. */
export function isOfflineToken(token: string) {
  return token === 'mock_token';
}

function isLocalDev() {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onAuthenticated: (cashier: string, role: string) => void;
}

const CLOUDFLARE_API_BASE = '';

export default function POSLogin({ onAuthenticated }: Props) {
  const { lang } = useLanguage();
  const t = (ne: string, en: string) => (lang === 'en' ? en : ne);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPass, setShowPass] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Restore session on refresh (offline tokens skip remote validation)
  useEffect(() => {
    const { token, cashier, role, username } = getPOSSession();
    if (token && cashier) {
      if (isOfflineToken(token)) {
        onAuthenticated(cashier, role);
        emailRef.current?.focus();
        return;
      }
      // Local dev: Express has /api/pos/* only — skip Cloudflare /api/auth (proxies to dead/wrong route)
      if (isLocalDev()) {
        onAuthenticated(cashier, role);
        return;
      }
      fetch(`${CLOUDFLARE_API_BASE}/api/auth`, { headers: { 'x-pos-token': token } })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            const resolvedCashier = data.cashier || cashier;
            const resolvedRole = data.role || role;
            const resolvedUsername = data.email || username || '';
            savePOSSession(token, resolvedCashier, resolvedRole, resolvedUsername);
            onAuthenticated(resolvedCashier, resolvedRole);
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

    const tryExpressLogin = async (): Promise<boolean> => {
      const res = await fetch('/api/pos/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      const fbData = await res.json();
      if (res.ok && fbData.success) {
        savePOSSession(fbData.token, fbData.cashier, fbData.role, creds.email);
        onAuthenticated(fbData.cashier, fbData.role);
        return true;
      }
      return false;
    };

    try {
      // Local: Express SQLite API first (/api/auth is Cloudflare-only and 500s when proxied)
      if (isLocalDev()) {
        try {
          if (await tryExpressLogin()) return;
        } catch {
          /* server not running — use offline mock below */
        }
      } else {
        const res = await fetch(`${CLOUDFLARE_API_BASE}/api/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creds),
        });
        const data = await res.json();
        if (data.success) {
          savePOSSession(data.token, data.cashier, data.role, creds.email);
          onAuthenticated(data.cashier, data.role);
          return;
        }
        if (await tryExpressLogin()) return;
        setError(data.error || t('अमान्य प्रमाण-पत्र।', 'Invalid credentials.'));
        return;
      }

      // ── Offline / local-dev fallback (no backend on :5001) ─────────────────
      const offlineAccounts: Record<string, { name: string; role: string; pass: string }> = {
        'owner@dhakaltraders.com':    { name: 'Owner User',        role: 'owner',    pass: 'owner123' },
        'admin@dhakaltraders.com':    { name: 'Admin User',        role: 'admin',    pass: 'admin123' },
        'cashier@dhakaltraders.com':  { name: 'Cashier User',      role: 'cashier',  pass: 'cashier123' },
        'supplier@dhakaltraders.com': { name: 'Supplier User',     role: 'supplier', pass: 'supplier123' },
        'customer@dhakaltraders.com': { name: 'Customer User',     role: 'customer', pass: 'customer123' },
      };
      
      const inputEmail = email.trim().toLowerCase();
      const inputPass = password.trim();
      const account = offlineAccounts[inputEmail];

      if (account && inputPass === account.pass) {
        savePOSSession('mock_token', account.name, account.role, inputEmail);
        onAuthenticated(account.name, account.role);
      } else {
        setError(t('अमान्य प्रमाण-पत्र।', 'Invalid credentials.'));
      }
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

        {/* Test Credentials */}
        <div style={{
          marginTop: 24,
          padding: 16,
          background: 'rgba(139, 105, 20, 0.1)',
          border: '1px solid rgba(139, 105, 20, 0.3)',
          borderRadius: 12,
          fontSize: 12,
          color: '#D4AF37',
          textAlign: 'left',
          lineHeight: 1.6
        }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            <i className="ri-test-tube-line" style={{ marginRight: 6 }} />
            {t('परीक्षण खातहरू (Click to auto-fill):', 'Test Accounts (Click to auto-fill):')}
          </div>
          {[
            { email: 'owner@dhakaltraders.com',    pass: 'owner123',    icon: '👑', label: 'Owner — Full Access' },
            { email: 'admin@dhakaltraders.com',    pass: 'admin123',    icon: '🛡️', label: 'Admin — Reports, Users, Products' },
            { email: 'cashier@dhakaltraders.com',  pass: 'cashier123',  icon: '💰', label: 'Cashier — Billing, Stock' },
            { email: 'supplier@dhakaltraders.com', pass: 'supplier123', icon: '🚛', label: 'Supplier — Orders, Chat' },
            { email: 'customer@dhakaltraders.com', pass: 'customer123', icon: '🛍️', label: 'Customer — Orders, Chat' },
          ].map(a => (
            <div
              key={a.email}
              style={{ marginBottom: 6, cursor: 'pointer', padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={() => { setEmail(a.email); setPassword(a.pass); }}
            >
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              <div>
                <strong style={{ fontSize: 12 }}>{a.label}</strong><br />
                <span style={{ fontSize: 11, opacity: .7 }}>{a.email} / {a.pass}</span>
              </div>
            </div>
          ))}
        </div>

        <a href="/" className="pos-login-back">
          <i className="ri-arrow-left-line" /> {t('मुख्य वेबसाइटमा फर्कनुहोस्', 'Back to main website')}
        </a>
      </div>
    </div>
  );
}
