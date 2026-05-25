import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'remixicon/fonts/remixicon.css';
import './styles.css';
import './site';
import dhakalLogo from './image/Dhakal Traders Logo .png';

const setAppFavicon = () => {
  const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const link = existing ?? document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = dhakalLogo;
  if (!existing) {
    document.head.appendChild(link);
  }

  const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]') ?? document.createElement('link');
  apple.rel = 'apple-touch-icon';
  apple.href = dhakalLogo;
  if (!apple.parentElement) {
    document.head.appendChild(apple);
  }
};

setAppFavicon();

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
