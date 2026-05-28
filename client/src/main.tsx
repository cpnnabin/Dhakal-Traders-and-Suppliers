import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './tailwind.css';
import './styles.css';
import './site';
import './utils/clientDiagnostics';

const REMIXICON_CDN = 'https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css';

const ensureRemixIconStyles = () => {
  if (document.querySelector('link[data-remixicon-cdn="true"]')) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = REMIXICON_CDN;
  link.crossOrigin = 'anonymous';
  link.dataset.remixiconCdn = 'true';
  document.head.appendChild(link);
};

const setAppFavicon = () => {
  const faviconPath = '/favicon.svg';
  const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const link = existing ?? document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = faviconPath;
  if (!existing) {
    document.head.appendChild(link);
  }

  const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]') ?? document.createElement('link');
  apple.rel = 'apple-touch-icon';
  apple.href = faviconPath;
  if (!apple.parentElement) {
    document.head.appendChild(apple);
  }
};

setAppFavicon();
ensureRemixIconStyles();

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
