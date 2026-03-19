// Browser.app — Real web browser using iframe
// Respects system Wi-Fi (navigator.onLine) status

import { isOnline, onConnectivityChange } from '../os/control-center.js';

let container = null;
let currentUrl = '';
let historyStack = [];
let historyIndex = -1;
let iframeEl = null;

const BOOKMARKS = [
  { name: 'Search', url: HOME_URL, icon: '\uD83D\uDD0D' },
  { name: 'Wikipedia', url: 'https://en.m.wikipedia.org/wiki/Main_Page', icon: '\uD83D\uDCD6' },
  { name: 'GitHub', url: 'https://github.com/tapas-patra', icon: '\uD83D\uDC19' },
  { name: 'MDN Docs', url: 'https://developer.mozilla.org/', icon: '\uD83D\uDCDA' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com/', icon: '\uD83D\uDCF0' },
];

const HOME_URL = '__home__';

// Sites known to block iframe embedding via X-Frame-Options / CSP frame-ancestors
const BLOCKED_DOMAINS = [
  'youtube.com', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
  'linkedin.com', 'netflix.com', 'amazon.com', 'reddit.com', 'tiktok.com',
  'spotify.com', 'discord.com', 'twitch.tv', 'paypal.com', 'ebay.com',
  'apple.com', 'microsoft.com', 'gmail.com', 'outlook.com', 'whatsapp.com',
  'github.com', 'stackoverflow.com', 'medium.com', 'pinterest.com',
  'dropbox.com', 'slack.com', 'zoom.us', 'figma.com', 'notion.so',
  'chatgpt.com', 'openai.com', 'anthropic.com', 'claude.ai',
  'google.com', 'bing.com', 'yahoo.com',
  'cloudflare.com', 'vercel.com', 'netlify.com', 'heroku.com',
  'docker.com', 'npmjs.com', 'pypi.org', 'crates.io',
];

function isKnownBlocked(url) {
  try {
    const u = new URL(url);
    const hostname = u.hostname.replace(/^www\./, '');
    return BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch { return false; }
}

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
          <input type="text" class="brw-url-input" id="brw-url" value="${currentUrl === HOME_URL ? '' : isSearchUrl(currentUrl) ? esc(getSearchQuery(currentUrl)) : esc(currentUrl)}" placeholder="Search or enter URL..." spellcheck="false">
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
  } else if (isSearchUrl(currentUrl)) {
    renderSearchResults(getSearchQuery(currentUrl), viewport);
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

const SEARCH_PREFIX = '__search__:';

function resolveUrl(input) {
  // If it looks like a URL, use it directly
  if (/^https?:\/\//i.test(input)) return input;
  // If it looks like a domain
  if (/^[\w-]+\.[\w.]+/.test(input)) return 'https://' + input;
  // Otherwise treat as a search query
  return SEARCH_PREFIX + input;
}

function isSearchUrl(url) {
  return url && url.startsWith(SEARCH_PREFIX);
}

function getSearchQuery(url) {
  return url.slice(SEARCH_PREFIX.length);
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

  // Immediately block known iframe-hostile sites
  if (isKnownBlocked(url)) {
    showBlockedPage(url);
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

  let settled = false;

  iframeEl.addEventListener('load', () => {
    if (settled) return;

    try {
      // Same-origin: we can inspect the document
      const doc = iframeEl.contentDocument;
      if (doc && doc.body) {
        const text = (doc.body.innerText || '').trim();
        if (text.length > 0 && !text.includes('refused')) {
          // Real same-origin content
          settled = true;
          clearTimeout(timeout);
          const loading = viewport.querySelector('.brw-loading');
          if (loading) loading.remove();
          iframeEl.style.opacity = '1';
          return;
        }
        // Empty or error page
        settled = true;
        clearTimeout(timeout);
        showBlockedPage(url);
        return;
      }
    } catch (e) {
      // Cross-origin: page loaded something, assume it's real
      settled = true;
      clearTimeout(timeout);
      const loading = viewport.querySelector('.brw-loading');
      if (loading) loading.remove();
      iframeEl.style.opacity = '1';
    }
  });

  iframeEl.addEventListener('error', () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    showErrorPage(url, 'Failed to load this page.');
  });

  // Fallback timeout for pages that never fire load
  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    showBlockedPage(url);
  }, 8000);

  iframeEl.style.opacity = '0';
  iframeEl.src = url;
  viewport.appendChild(iframeEl);
}

function showBlockedPage(url) {
  const viewport = container.querySelector('#brw-viewport');
  if (!viewport) return;

  iframeEl = null;
  let domain = '';
  try { domain = new URL(url).hostname; } catch(e) { domain = url; }

  viewport.innerHTML = `
    <div class="brw-error-page">
      <div class="brw-err-visual">
        <svg class="brw-err-shield" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="38" stroke="rgba(255,95,86,0.15)" stroke-width="2"/>
          <circle cx="40" cy="40" r="28" stroke="rgba(255,95,86,0.1)" stroke-width="1.5"/>
          <path d="M40 18 L40 18 C40 18 56 24 56 38 C56 52 40 62 40 62 C40 62 24 52 24 38 C24 24 40 18 40 18Z" fill="rgba(255,95,86,0.08)" stroke="rgba(255,95,86,0.4)" stroke-width="1.5"/>
          <line x1="33" y1="33" x2="47" y2="47" stroke="#FF5F56" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="47" y1="33" x2="33" y2="47" stroke="#FF5F56" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <div class="brw-err-ripple"></div>
        <div class="brw-err-ripple brw-err-ripple-2"></div>
      </div>
      <div class="brw-err-content">
        <div class="brw-error-title">This site can't be displayed</div>
        <div class="brw-error-desc"><strong>${esc(domain)}</strong> refused the connection or blocks embedded browsing.</div>
        <div class="brw-error-code">ERR_BLOCKED_BY_RESPONSE</div>
        <div class="brw-err-actions">
          <a class="brw-err-open-btn" href="${esc(url)}" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open in new tab
          </a>
          <button class="brw-err-home-btn" id="brw-err-home">Go Home</button>
        </div>
      </div>
    </div>
  `;

  viewport.querySelector('#brw-err-home')?.addEventListener('click', () => navigateTo(HOME_URL));
}

function showOfflinePage() {
  const viewport = container.querySelector('#brw-viewport');
  if (!viewport) return;

  iframeEl = null;
  viewport.innerHTML = `
    <div class="brw-error-page">
      <div class="brw-err-visual">
        <svg class="brw-err-wifi" viewBox="0 0 80 80" fill="none">
          <path d="M10 32a40 40 0 0 1 60 0" stroke="rgba(255,255,255,0.08)" stroke-width="3" stroke-linecap="round"/>
          <path d="M20 42a26 26 0 0 1 40 0" stroke="rgba(255,255,255,0.08)" stroke-width="3" stroke-linecap="round"/>
          <path d="M30 52a14 14 0 0 1 20 0" stroke="rgba(255,255,255,0.08)" stroke-width="3" stroke-linecap="round"/>
          <circle cx="40" cy="62" r="3" fill="rgba(255,255,255,0.1)"/>
          <line x1="12" y1="12" x2="68" y2="68" stroke="#FF5F56" stroke-width="2.5" stroke-linecap="round" class="brw-err-slash"/>
        </svg>
        <div class="brw-err-ripple"></div>
        <div class="brw-err-ripple brw-err-ripple-2"></div>
      </div>
      <div class="brw-err-content">
        <div class="brw-error-title">No Internet Connection</div>
        <div class="brw-error-desc">Your device appears to be offline. Check your network connection and try again.</div>
        <div class="brw-error-code">ERR_INTERNET_DISCONNECTED</div>
        <div class="brw-err-actions">
          <button class="brw-err-open-btn" id="brw-retry">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Retry
          </button>
        </div>
      </div>
    </div>
  `;

  viewport.querySelector('#brw-retry')?.addEventListener('click', () => {
    if (isOnline()) {
      if (currentUrl === HOME_URL) render();
      else loadUrl(currentUrl);
    }
  });

  const urlIcon = container.querySelector('.brw-url-icon');
  if (urlIcon) urlIcon.textContent = '\u26A0\uFE0F';
}

function showErrorPage(url, message) {
  const viewport = container.querySelector('#brw-viewport');
  if (!viewport) return;

  iframeEl = null;
  viewport.innerHTML = `
    <div class="brw-error-page">
      <div class="brw-err-visual">
        <svg class="brw-err-alert" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="30" fill="rgba(255,180,0,0.06)" stroke="rgba(255,180,0,0.3)" stroke-width="1.5"/>
          <line x1="40" y1="28" x2="40" y2="44" stroke="#FFB400" stroke-width="3" stroke-linecap="round"/>
          <circle cx="40" cy="52" r="2" fill="#FFB400"/>
        </svg>
        <div class="brw-err-ripple"></div>
        <div class="brw-err-ripple brw-err-ripple-2"></div>
      </div>
      <div class="brw-err-content">
        <div class="brw-error-title">Can't reach this page</div>
        <div class="brw-error-desc">${esc(message)}</div>
        <div class="brw-error-code">${esc(url)}</div>
        <div class="brw-err-actions">
          <a class="brw-err-open-btn" href="${esc(url)}" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open in new tab
          </a>
          <button class="brw-err-home-btn" id="brw-err-home">Go Home</button>
        </div>
      </div>
    </div>
  `;

  viewport.querySelector('#brw-err-home')?.addEventListener('click', () => navigateTo(HOME_URL));
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

async function renderSearchResults(query, viewport) {
  viewport.innerHTML = `
    <div class="brw-loading">
      <div class="brw-spinner"></div>
      <div>Searching "${esc(query)}"...</div>
    </div>
  `;

  try {
    // DuckDuckGo Instant Answer API
    const resp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    const data = await resp.json();

    const results = [];

    // Abstract / instant answer
    if (data.Abstract) {
      results.push({
        title: data.Heading || query,
        snippet: data.Abstract,
        url: data.AbstractURL || '',
        source: data.AbstractSource || '',
      });
    }

    // Answer (calculations, conversions, etc.)
    if (data.Answer) {
      results.push({
        title: 'Answer',
        snippet: data.Answer,
        url: '',
        source: 'DuckDuckGo',
      });
    }

    // Definition
    if (data.Definition) {
      results.push({
        title: 'Definition',
        snippet: data.Definition,
        url: data.DefinitionURL || '',
        source: data.DefinitionSource || '',
      });
    }

    // Related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0]?.slice(0, 80) || topic.Text.slice(0, 80),
            snippet: topic.Text,
            url: topic.FirstURL,
            source: '',
          });
        }
        // Subtopics
        if (topic.Topics) {
          for (const sub of topic.Topics) {
            if (sub.Text && sub.FirstURL) {
              results.push({
                title: sub.Text.split(' - ')[0]?.slice(0, 80) || sub.Text.slice(0, 80),
                snippet: sub.Text,
                url: sub.FirstURL,
                source: '',
              });
            }
          }
        }
      }
    }

    // Render
    if (results.length === 0) {
      viewport.innerHTML = `
        <div class="brw-search-page">
          <div class="brw-search-header">
            <span class="brw-search-icon">\uD83D\uDD0D</span>
            <span class="brw-search-query">${esc(query)}</span>
          </div>
          <div class="brw-search-empty">
            <div>No instant results found for this query.</div>
            <a class="brw-search-ext-link" href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" target="_blank" rel="noopener">
              Search on DuckDuckGo ↗
            </a>
          </div>
        </div>
      `;
      return;
    }

    viewport.innerHTML = `
      <div class="brw-search-page">
        <div class="brw-search-header">
          <span class="brw-search-icon">\uD83D\uDD0D</span>
          <span class="brw-search-query">${esc(query)}</span>
          <span class="brw-search-count">${results.length} result${results.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="brw-search-results">
          ${results.map(r => `
            <div class="brw-search-result">
              ${r.url ? `<a class="brw-result-url" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url.length > 60 ? r.url.slice(0, 60) + '...' : r.url)}</a>` : ''}
              <div class="brw-result-title">${esc(r.title)}</div>
              <div class="brw-result-snippet">${esc(r.snippet)}</div>
              ${r.source ? `<span class="brw-result-source">${esc(r.source)}</span>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="brw-search-footer">
          <a class="brw-search-ext-link" href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" target="_blank" rel="noopener">
            View full results on DuckDuckGo ↗
          </a>
        </div>
      </div>
    `;

    // Make result titles clickable to navigate in browser
    viewport.querySelectorAll('.brw-result-title').forEach((el, i) => {
      const url = results[i]?.url;
      if (url) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => navigateTo(url));
      }
    });

  } catch (e) {
    viewport.innerHTML = `
      <div class="brw-search-page">
        <div class="brw-search-header">
          <span class="brw-search-icon">\uD83D\uDD0D</span>
          <span class="brw-search-query">${esc(query)}</span>
        </div>
        <div class="brw-search-empty">
          <div>Search failed: ${esc(e.message)}</div>
          <a class="brw-search-ext-link" href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" target="_blank" rel="noopener">
            Try on DuckDuckGo ↗
          </a>
        </div>
      </div>
    `;
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
      gap: 0;
      text-align: center;
      padding: 40px 20px;
      background: radial-gradient(ellipse at center, rgba(20,20,35,1) 0%, #0d0d14 70%);
    }

    .brw-err-visual {
      position: relative;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      animation: brw-err-float 3s ease-in-out infinite;
    }

    .brw-err-visual svg {
      width: 80px;
      height: 80px;
      animation: brw-err-fadein 0.6s ease-out both;
    }

    .brw-err-ripple {
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      border: 1px solid rgba(255,95,86,0.12);
      animation: brw-err-ripple 2.5s ease-out infinite;
    }

    .brw-err-ripple-2 {
      animation-delay: 1.2s;
    }

    .brw-err-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .brw-error-title {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      animation: brw-err-slideup 0.5s ease-out 0.15s both;
    }

    .brw-error-desc {
      font-size: 12px;
      color: var(--text-muted);
      max-width: 360px;
      line-height: 1.7;
      animation: brw-err-slideup 0.5s ease-out 0.25s both;
    }

    .brw-error-desc strong {
      color: var(--text-primary);
      font-weight: 600;
    }

    .brw-error-code {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.04);
      padding: 5px 14px;
      border-radius: 6px;
      margin-top: 2px;
      animation: brw-err-slideup 0.5s ease-out 0.35s both;
    }

    .brw-err-actions {
      display: flex;
      gap: 10px;
      margin-top: 16px;
      animation: brw-err-slideup 0.5s ease-out 0.45s both;
    }

    .brw-err-open-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      border-radius: 8px;
      border: 1px solid rgba(0,229,255,0.2);
      background: rgba(0,229,255,0.08);
      color: var(--cyan);
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s, border-color 0.15s;
    }

    .brw-err-open-btn:hover {
      background: rgba(0,229,255,0.15);
      border-color: rgba(0,229,255,0.3);
    }

    .brw-err-home-btn {
      padding: 8px 20px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: var(--text-muted);
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .brw-err-home-btn:hover {
      background: rgba(255,255,255,0.08);
      color: var(--text-primary);
    }

    .brw-err-slash {
      animation: brw-err-draw 0.6s ease-out 0.3s both;
    }

    @keyframes brw-err-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    @keyframes brw-err-fadein {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes brw-err-slideup {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes brw-err-ripple {
      0% { transform: scale(0.8); opacity: 0.5; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    @keyframes brw-err-draw {
      from { stroke-dasharray: 80; stroke-dashoffset: 80; }
      to { stroke-dasharray: 80; stroke-dashoffset: 0; }
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

    /* ── Search Results ── */
    .brw-search-page {
      height: 100%;
      overflow-y: auto;
      padding: 24px 32px;
      background: #0d0d14;
    }

    .brw-search-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .brw-search-icon { font-size: 18px; }

    .brw-search-query {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .brw-search-count {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
      margin-left: auto;
    }

    .brw-search-results {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .brw-search-result {
      padding: 14px 16px;
      border-radius: 10px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.04);
      transition: border-color 0.15s, background 0.15s;
    }

    .brw-search-result:hover {
      background: rgba(255,255,255,0.04);
      border-color: rgba(0,229,255,0.15);
    }

    .brw-result-url {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--cyan);
      text-decoration: none;
      display: block;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .brw-result-url:hover { text-decoration: underline; }

    .brw-result-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 600;
      color: #8ab4f8;
      margin-bottom: 6px;
      line-height: 1.4;
    }

    .brw-result-title:hover { text-decoration: underline; }

    .brw-result-snippet {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.6;
    }

    .brw-result-source {
      display: inline-block;
      margin-top: 6px;
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--text-dim);
      background: rgba(255,255,255,0.04);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .brw-search-empty {
      text-align: center;
      padding: 48px 20px;
      color: var(--text-dim);
      font-size: 13px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .brw-search-ext-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--cyan);
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid rgba(0,229,255,0.2);
      background: rgba(0,229,255,0.06);
      transition: background 0.15s;
    }

    .brw-search-ext-link:hover {
      background: rgba(0,229,255,0.12);
    }

    .brw-search-footer {
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px solid rgba(255,255,255,0.06);
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}
