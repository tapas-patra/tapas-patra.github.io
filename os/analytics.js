// TapasOS Analytics — lightweight event tracking + error monitoring

const API = location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://portfolio-bot-5pwk.onrender.com';

const SESSION_ID = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
let pageLoadTime = Date.now();

// ── Public API ──

export function trackEvent(event, props = {}) {
  send(event, props);
}

export function trackAppOpen(appId) {
  send('app_open', { app: appId });
}

export function trackAppClose(appId, durationMs) {
  send('app_close', { app: appId, duration_s: Math.round(durationMs / 1000) });
}

// ── Init ──

export function initAnalytics() {
  // Page view
  send('page_view', {
    path: location.pathname,
    referrer: document.referrer || null,
    screen: `${screen.width}x${screen.height}`,
    viewport: `${innerWidth}x${innerHeight}`,
    device: isMobile() ? 'mobile' : 'desktop',
  });

  // Session duration on unload
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      send('session_end', { duration_s: Math.round((Date.now() - pageLoadTime) / 1000) });
    }
  });

  // Error monitoring
  addEventListener('error', (e) => {
    send('js_error', {
      message: e.message || 'Unknown error',
      source: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : 'unknown',
    });
  });

  addEventListener('unhandledrejection', (e) => {
    send('promise_error', {
      message: String(e.reason?.message || e.reason || 'Unhandled rejection').slice(0, 200),
    });
  });
}

// ── Internal ──

function send(event, props = {}) {
  const body = JSON.stringify({ event, props, session_id: SESSION_ID });

  // Use sendBeacon for reliability on page unload, fetch otherwise
  if (event === 'session_end' && navigator.sendBeacon) {
    navigator.sendBeacon(`${API}/track`, new Blob([body], { type: 'application/json' }));
    return;
  }

  fetch(`${API}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
}
