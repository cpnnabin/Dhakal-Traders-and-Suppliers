// Lightweight client-side diagnostics to report failing resource URLs to server
// Deduplicates identical reports for a short window to avoid spamming.

type Report = {
  url?: string;
  resourceType?: string;
  page?: string;
  extra?: any;
  ts?: string;
};

const dedupeWindowMs = 1000 * 60 * 5; // 5 minutes
const seen = new Map<string, number>();

function makeKey(r: Report) {
  return `${r.url || ''}::${r.resourceType || ''}::${r.page || ''}`;
}

async function sendReport(report: Report) {
  try {
    const key = makeKey(report);
    const now = Date.now();
    const last = seen.get(key) || 0;
    if (now - last < dedupeWindowMs) return;
    seen.set(key, now);

    // Use navigator.sendBeacon if available for reliability during page unload
    const endpoint = '/api/diagnostics/client-failure';
    const body = JSON.stringify({ ...report, ts: new Date().toISOString(), ua: navigator.userAgent, page: report.page || location.pathname });
    if (navigator.sendBeacon) {
      try {
        navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
        return;
      } catch (e) {
        // fallthrough to fetch
      }
    }
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
  } catch (e) {
    // swallow errors — diagnostics should never break the app
    console.warn('sendReport failed', e);
  }
}

function handleResourceError(ev: Event) {
  try {
    const target = ev.target as any;
    if (!target) return;
    const url = target.currentSrc || target.src || target.href || null;
    const resourceType = (target.tagName || '').toLowerCase();
    const page = location.pathname;
    if (!url) return;
    sendReport({ url, resourceType, page });
  } catch (e) {}
}

function installFetchWatcher() {
  try {
    const origFetch = window.fetch;
    window.fetch = function (input: any, init?: any) {
      return origFetch(input, init).then((res) => {
        try {
          if (res && res.status >= 500) {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            sendReport({ url, resourceType: 'fetch', page: location.pathname, extra: { status: res.status } });
          }
        } catch (e) {}
        return res;
      }).catch((err) => {
        try { const url = typeof input === 'string' ? input : (input && input.url) || ''; sendReport({ url, resourceType: 'fetch', page: location.pathname, extra: { error: String(err) } }); } catch (e) {}
        throw err;
      });
    } as any;
  } catch (e) {}
}

export function initClientDiagnostics() {
  try {
    // resource loading errors (images, scripts, links)
    window.addEventListener('error', handleResourceError, true);
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (ev) => {
      try {
        const reason = ev && (ev.reason && (ev.reason.message || ev.reason)) || String(ev);
        sendReport({ resourceType: 'unhandledrejection', page: location.pathname, extra: { reason } });
      } catch (e) {}
    });
    installFetchWatcher();
  } catch (e) {
    // ignore
  }
}

// Auto-initialize when module imported
try { initClientDiagnostics(); } catch (e) {}

export default { initClientDiagnostics };
