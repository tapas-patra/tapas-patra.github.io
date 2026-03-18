// Browser.app — Real web browser using iframe
// Respects system Wi-Fi (navigator.onLine) status

import { isOnline, onConnectivityChange } from '../os/control-center.js';

let container = null;
let currentUrl = '';
let historyStack = [];
let historyIndex = -1;
let iframeEl = null;

const BOOKMARKS = [
  { name: 'Google', url: 'https://www.google.com/webhp?igu=1', icon: '\uD83D\uDD0D' },
  { name: 'Wikipedia', url: 'https://en.m.wikipedia.org/wiki/Main_Page', icon: '\uD83D\uDCD6' },
  { name: 'GitHub', url: 'https://github.com/tapas-patra', icon: '\uD83D\uDC19' },
  { name: 'MDN Docs', url: 'https://developer.mozilla.org/', icon: '\uD83D\uDCDA' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com/', icon: '\uD83D\uDCF0' },
];

const HOME_URL = '__home__';

export async function init(el) {
  container = el;
  injectStyles();
  navigateTo(HOME_URL);

  // Listen for connectivity changes
  onConnectivityChange((online) => {
    if (!online && iframeEl) {
      showOfflinePage();
    } else if (online && currentUrl !== HOME_URL) {
      // Reload current page when back online
      loadUrl(currentUrl);
    }
  });
}

function render() {
  const online = isOnline();

  container.innerHTML = `
    <div class="brw-app">
      <div class="brw-toolbar">
        <div class="brw-nav-btns">
          <button class="brw-nav-btn" id="brw-back" title="Back" ${historyIndex <= 0 ? 'disabled' : ''}>\u2039</button>
          <button class="brw-nav-btn" id="brw-fwd" title="Forward" ${historyIndex >= historyStack.length - 1 ? 'disabled' : ''}>\u203A</button>
          <button class="brw-nav-btn" id="brw-reload" title="Reload">\u21BB</button>
          <button class="brw-nav-btn" id="brw-home" title="Home">\u2302</button>
        </div>
        <div class="brw-url-bar">
          <span class="brw-url-icon">${online ? '\uD83D\uDD12' : '\u26A0\uFE0F'}</span>
          <input type="text" class="brw-url-input" id="brw-url" value="${currentUrl === HOME_URL ? '' : esc(currentUrl)}" placeholder="Search or enter URL..." spellcheck="false">
        </div>
      </div>
      <div class="brw-viewport" id="brw-viewport"></div>
    </div>
  `;

  bindEvents();

  const viewport = container.querySelector('#brw-viewport');
  if (currentUrl === HOME_URL) {
    renderHomePage(viewport);
  } else if (!online) {
    showOfflinePage();
  } else {
    loadUrl(currentUrl);
  }
}

function bindEvents() {
  // Navigation buttons
  container.querySelector('#brw-back')?.addEventListener('click', goBack);
  container.querySelector('#brw-fwd')?.addEventListener('click', goForward);
  container.querySelector('#brw-reload')?.addEventListener('click', reload);
  container.querySelector('#brw-home')?.addEventListener('click', () => navigateTo(HOME_URL));

  // URL bar
  const urlInput = container.querySelector('#brw-url');
  if (urlInput) {
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = urlInput.value.trim();
        if (val) navigateTo(resolveUrl(val));
      }
    });
    urlInput.addEventListener('focus', () => urlInput.select());
  }
}

function resolveUrl(input) {
  // If it looks like a URL, use it directly
  if (/^https?:\/\//i.test(input)) return input;
  // If it looks like a domain
  if (/^[\w-]+\.[\w.]+/.test(input)) return 'https://' + input;
  // Otherwise treat as Google search
  return `https://www.google.com/search?igu=1&q=${encodeURIComponent(input)}`;
}

function navigateTo(url) {
  // Trim history forward if we navigated back then go somewhere new
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }
  historyStack.push(url);
  historyIndex = historyStack.length - 1;
  currentUrl = url;
  render();
}

function goBack() {
  if (historyIndex <= 0) return;
  historyIndex--;
  currentUrl = historyStack[historyIndex];
  render();
}

function goForward() {
  if (historyIndex >= historyStack.length - 1) return;
  historyIndex++;
  currentUrl = historyStack[historyIndex];
  render();
}

function reload() {
  if (currentUrl === HOME_URL) return;
  if (!isOnline()) {
    showOfflinePage();
    return;
  }
  loadUrl(currentUrl);
}

function loadUrl(url) {
  const viewport = container.querySelector('#brw-viewport');
  if (!viewport) return;

  if (!isOnline()) {
    showOfflinePage();
    return;
  }

  viewport.innerHTML = `
    <div class="brw-loading">
      <div class="brw-spinner"></div>
      <div>Loading...</div>
    </div>
  `;

  iframeEl = document.createElement('iframe');
  iframeEl.className = 'brw-iframe';
  iframeEl.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
  iframeEl.referrerPolicy = 'no-referrer';
  iframeEl.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope';

  iframeEl.addEventListener('load', () => {
    // Remove loading indicator
    const loading = viewport.querySelector('.brw-loading');
    if (loading) loading.remove();
    iframeEl.style.opacity = '1';
  });

  iframeEl.addEventListener('error', () => {
    showErrorPage(url, 'Failed to load this page.');
  });

  // Timeout for pages that never fire load (blocked by X-Frame-Options etc)
  const timeout = setTimeout(() => {
    const loading = viewport.querySelector('.brw-loading');
    if (loading) {
      loading.innerHTML = `
        <div class="brw-error-icon">\u26A0\uFE0F</div>
        <div class="brw-error-title">Page may be restricted</div>
        <div class="brw-error-desc">Some sites block embedding. The page might still load — or try opening it directly.</div>
        <a class="brw-error-link" href="${esc(url)}" target="_blank" rel="noopener">Open in new tab \u2197</a>
      `;
    }
  }, 8000);

  iframeEl.addEventListener('load', () => clearTimeout(timeout));

  iframeEl.style.opacity = '0';
  iframeEl.src = url;
  viewport.appendChild(iframeEl);
}

function showOfflinePage() {
  const viewport = container.querySelector('#brw-viewport');
  if (!viewport) return;

  iframeEl = null;
  viewport.innerHTML = `
    <div class="brw-error-page">
      <div class="brw-error-icon">\uD83D\uDCE1</div>
      <div class="brw-error-title">No Internet Connection</div>
      <div class="brw-error-desc">Your device appears to be offline. Check your network connection and try again.</div>
      <div class="brw-error-code">ERR_INTERNET_DISCONNECTED</div>
      <button class="brw-error-retry" id="brw-retry">Retry</button>
    </div>
  `;

  viewport.querySelector('#brw-retry')?.addEventListener('click', () => {
    if (isOnline()) {
      if (currentUrl === HOME_URL) render();
      else loadUrl(currentUrl);
    }
  });

  // Update URL bar icon
  const urlIcon = container.querySelector('.brw-url-icon');
  if (urlIcon) urlIcon.textContent = '\u26A0\uFE0F';
}

function showErrorPage(url, message) {
  const viewport = container.querySelector('#brw-viewport');
  if (!viewport) return;

  viewport.innerHTML = `
    <div class="brw-error-page">
      <div class="brw-error-icon">\u274C</div>
      <div class="brw-error-title">Can't reach this page</div>
      <div class="brw-error-desc">${esc(message)}</div>
      <div class="brw-error-code">${esc(url)}</div>
      <a class="brw-error-link" href="${esc(url)}" target="_blank" rel="noopener">Open in new tab \u2197</a>
    </div>
  `;
}

function renderHomePage(viewport) {
  const online = isOnline();

  viewport.innerHTML = `
    <div class="brw-home">
      <div class="brw-home-header">
        <div class="brw-home-logo">\uD83C\uDF10</div>
        <div class="brw-home-title">TapasOS Browser</div>
        <div class="brw-home-status ${online ? '' : 'offline'}">
          ${online ? '\uD83D\uDFE2 Online' : '\uD83D\uDD34 Offline'}
        </div>
      </div>
      <div class="brw-home-search">
        <input type="text" class="brw-home-input" id="brw-home-search" placeholder="Search the web..." ${!online ? 'disabled' : ''}>
      </div>
      <div class="brw-bookmarks">
        ${BOOKMARKS.map(b => `
          <div class="brw-bookmark ${!online ? 'disabled' : ''}" data-url="${esc(b.url)}">
            <div class="brw-bookmark-icon">${b.icon}</div>
            <div class="brw-bookmark-name">${b.name}</div>
          </div>
        `).join('')}
      </div>
      ${!online ? '<div class="brw-home-offline-hint">Connect to the internet to browse</div>' : ''}
    </div>
  `;

  // Bookmark clicks
  viewport.querySelectorAll('.brw-bookmark:not(.disabled)').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.url));
  });

  // Home search
  const homeSearch = viewport.querySelector('#brw-home-search');
  if (homeSearch) {
    homeSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && homeSearch.value.trim()) {
        e.preventDefault();
        if (!isOnline()) return;
        navigateTo(resolveUrl(homeSearch.value.trim()));
      }
    });
  }
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function injectStyles() {
  if (document.getElementById('browser-styles')) return;
  const style = document.createElement('style');
  style.id = 'browser-styles';
  style.textContent = `
    .brw-app {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: var(--font-body);
      background: #0d0d14;
    }

    /* ── Toolbar ── */
    .brw-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: rgba(0,0,0,0.3);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .brw-nav-btns {
      display: flex;
      gap: 2px;
    }

    .brw-nav-btn {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: rgba(255,255,255,0.04);
      color: var(--text-muted);
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.12s, color 0.12s;
    }

    .brw-nav-btn:hover:not(:disabled) {
      background: rgba(255,255,255,0.08);
      color: var(--text-primary);
    }

    .brw-nav-btn:disabled {
      opacity: 0.3;
      cursor: default;
    }

    .brw-url-bar {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 0 10px;
      height: 30px;
      transition: border-color 0.15s;
    }

    .brw-url-bar:focus-within {
      border-color: rgba(0, 229, 255, 0.3);
    }

    .brw-url-icon {
      font-size: 12px;
      flex-shrink: 0;
    }

    .brw-url-input {
      flex: 1;
      background: none;
      border: none;
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 11px;
      outline: none;
    }

    .brw-url-input::placeholder {
      color: var(--text-dim);
    }

    /* ── Viewport ── */
    .brw-viewport {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .brw-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #fff;
      transition: opacity 0.3s ease;
    }

    /* ── Loading ── */
    .brw-loading {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-dim);
      font-size: 12px;
      z-index: 1;
    }

    .brw-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: var(--cyan);
      border-radius: 50%;
      animation: brw-spin 0.8s linear infinite;
    }

    @keyframes brw-spin {
      to { transform: rotate(360deg); }
    }

    /* ── Error Page ── */
    .brw-error-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 10px;
      text-align: center;
      padding: 40px;
    }

    .brw-error-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }

    .brw-error-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .brw-error-desc {
      font-size: 12px;
      color: var(--text-muted);
      max-width: 360px;
      line-height: 1.6;
    }

    .brw-error-code {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
      background: rgba(255,255,255,0.03);
      padding: 4px 12px;
      border-radius: 4px;
      margin-top: 4px;
    }

    .brw-error-retry {
      margin-top: 12px;
      padding: 8px 24px;
      border-radius: 8px;
      border: 1px solid rgba(0, 229, 255, 0.2);
      background: rgba(0, 229, 255, 0.08);
      color: var(--cyan);
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .brw-error-retry:hover {
      background: rgba(0, 229, 255, 0.15);
    }

    .brw-error-link {
      margin-top: 8px;
      font-size: 11px;
      color: var(--cyan);
      text-decoration: none;
      transition: opacity 0.15s;
    }

    .brw-error-link:hover {
      opacity: 0.8;
    }

    /* ── Home Page ── */
    .brw-home {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 20px;
      padding: 40px;
    }

    .brw-home-header {
      text-align: center;
    }

    .brw-home-logo {
      font-size: 48px;
      margin-bottom: 8px;
    }

    .brw-home-title {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .brw-home-status {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--cyan);
      margin-top: 6px;
    }

    .brw-home-status.offline {
      color: #FF5F56;
    }

    .brw-home-search {
      width: 100%;
      max-width: 440px;
    }

    .brw-home-input {
      width: 100%;
      padding: 10px 16px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
    }

    .brw-home-input:focus {
      border-color: rgba(0, 229, 255, 0.3);
    }

    .brw-home-input::placeholder {
      color: var(--text-dim);
    }

    .brw-home-input:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .brw-bookmarks {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .brw-bookmark {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 14px 12px;
      border-radius: 12px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.04);
      cursor: pointer;
      width: 80px;
      transition: background 0.15s, border-color 0.15s;
    }

    .brw-bookmark:hover:not(.disabled) {
      background: rgba(0, 229, 255, 0.06);
      border-color: rgba(0, 229, 255, 0.15);
    }

    .brw-bookmark.disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .brw-bookmark-icon {
      font-size: 24px;
    }

    .brw-bookmark-name {
      font-size: 10px;
      color: var(--text-muted);
      text-align: center;
    }

    .brw-home-offline-hint {
      font-family: var(--font-mono);
      font-size: 10px;
      color: #FF5F56;
      margin-top: 8px;
    }
  `;
  document.head.appendChild(style);
}
