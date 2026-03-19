// App Store — Browse, install, and manage TapasOS apps
// Real categories, install/uninstall flow, store-only apps (games)

let container = null;
let activeTab = 'discover';
let searchQuery = '';

const CATEGORY_META = {
  system:       { label: 'System',          icon: '\u2699\uFE0F' },
  productivity: { label: 'Productivity',    icon: '\uD83D\uDCCB' },
  portfolio:    { label: 'Portfolio',       icon: '\uD83D\uDC64' },
  developer:    { label: 'Developer Tools', icon: '\uD83D\uDEE0\uFE0F' },
  games:        { label: 'Games',           icon: '\uD83C\uDFAE' },
};

export async function init(el) {
  container = el;
  injectStyles();
  render();
}

function getAllApps() {
  return window.__tapasos_getFullRegistry?.() || [];
}

function getInstalledApps() {
  return window.__tapasos_getAppRegistry?.() || [];
}

function isInstalled(appId) {
  return window.__tapasos_isInstalled?.(appId) ?? true;
}

function render() {
  const installed = getInstalledApps().filter(a => a.id !== 'appstore');
  const allApps = getAllApps();
  const categories = [...new Set(allApps.map(a => a.category || 'other'))];

  container.innerHTML = `
    <div class="as-app">
      <div class="as-sidebar">
        <div class="as-sidebar-title">App Store</div>
        <div class="as-tab ${activeTab === 'discover' ? 'active' : ''}" data-tab="discover">
          <span>\uD83C\uDF1F</span><span>Discover</span>
        </div>
        ${categories.map(cat => {
          const meta = CATEGORY_META[cat] || { label: cat, icon: '\uD83D\uDCE6' };
          const count = allApps.filter(a => a.category === cat).length;
          return `<div class="as-tab as-tab-cat ${activeTab === 'cat-' + cat ? 'active' : ''}" data-tab="cat-${cat}">
            <span>${meta.icon}</span><span>${meta.label}</span>
            <span class="as-tab-count">${count}</span>
          </div>`;
        }).join('')}
        <div class="as-sidebar-divider"></div>
        <div class="as-tab ${activeTab === 'installed' ? 'active' : ''}" data-tab="installed">
          <span>\u2705</span><span>Installed</span>
          <span class="as-tab-count">${installed.length}</span>
        </div>
      </div>
      <div class="as-main">
        <div class="as-toolbar">
          <div class="as-search-wrap">
            <input type="text" class="as-search" placeholder="Search apps..." value="${esc(searchQuery)}">
          </div>
        </div>
        <div class="as-content" id="as-content"></div>
      </div>
    </div>
  `;

  renderContent();
  bindEvents();
}

function renderContent() {
  const content = container.querySelector('#as-content');
  if (!content) return;

  if (activeTab === 'discover') renderDiscoverTab(content);
  else if (activeTab === 'installed') renderInstalledTab(content);
  else if (activeTab.startsWith('cat-')) renderCategoryTab(content, activeTab.replace('cat-', ''));
}

function renderDiscoverTab(content) {
  const allApps = getAllApps();
  const q = searchQuery.toLowerCase();

  // Featured: games (store-only)
  const featured = allApps.filter(a => a.storeOnly);
  const categories = ['system', 'productivity', 'portfolio', 'developer', 'games'];

  let html = '';

  // Featured banner for games
  if (!q && featured.length > 0) {
    html += `
      <div class="as-featured">
        <div class="as-featured-title">\uD83C\uDFAE New Games Available</div>
        <div class="as-featured-sub">Install and play right inside TapasOS</div>
        <div class="as-featured-grid">
          ${featured.map(app => renderCompactCard(app)).join('')}
        </div>
      </div>
    `;
  }

  // All categories
  for (const cat of categories) {
    const meta = CATEGORY_META[cat] || { label: cat, icon: '\uD83D\uDCE6' };
    let apps = allApps.filter(a => (a.category || 'other') === cat && a.id !== 'appstore');
    if (q) apps = apps.filter(a => matchesSearch(a, q));
    if (apps.length === 0) continue;

    html += `
      <div class="as-section">
        <div class="as-section-title">${meta.icon} ${meta.label}</div>
        <div class="as-grid">
          ${apps.map(app => renderAppCard(app)).join('')}
        </div>
      </div>
    `;
  }

  if (!html) {
    html = '<div class="as-empty">No apps match your search</div>';
  }

  content.innerHTML = html;
  bindCardEvents(content);
}

function renderCategoryTab(content, category) {
  const allApps = getAllApps();
  const meta = CATEGORY_META[category] || { label: category, icon: '\uD83D\uDCE6' };
  const q = searchQuery.toLowerCase();
  let apps = allApps.filter(a => (a.category || 'other') === category && a.id !== 'appstore');
  if (q) apps = apps.filter(a => matchesSearch(a, q));

  if (apps.length === 0) {
    content.innerHTML = '<div class="as-empty">No apps in this category</div>';
    return;
  }

  content.innerHTML = `
    <div class="as-section">
      <div class="as-section-header">
        <span class="as-section-icon">${meta.icon}</span>
        <div>
          <div class="as-section-title-large">${meta.label}</div>
          <div class="as-section-count">${apps.length} app${apps.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div class="as-grid">
        ${apps.map(app => renderAppCard(app)).join('')}
      </div>
    </div>
  `;

  bindCardEvents(content);
}

function renderInstalledTab(content) {
  const installed = getInstalledApps().filter(a => a.id !== 'appstore');
  const q = searchQuery.toLowerCase();
  const filtered = q ? installed.filter(a => matchesSearch(a, q)) : installed;

  if (filtered.length === 0) {
    content.innerHTML = '<div class="as-empty">No installed apps match your search</div>';
    return;
  }

  // Group by category
  const groups = {};
  filtered.forEach(app => {
    const cat = app.category || 'other';
    const meta = CATEGORY_META[cat] || { label: cat, icon: '\uD83D\uDCE6' };
    if (!groups[cat]) groups[cat] = { label: meta.label, icon: meta.icon, apps: [] };
    groups[cat].apps.push(app);
  });

  content.innerHTML = Object.values(groups).map(g => `
    <div class="as-section">
      <div class="as-section-title">${g.icon} ${g.label}</div>
      <div class="as-grid">
        ${g.apps.map(app => renderInstalledCard(app)).join('')}
      </div>
    </div>
  `).join('');

  bindCardEvents(content);
}

function renderAppCard(app) {
  const installed = isInstalled(app.id);
  const isSystem = app.system;

  let actionBtn = '';
  if (isSystem) {
    actionBtn = `<button class="as-btn-open" data-id="${app.id}">Open</button>`;
  } else if (installed) {
    actionBtn = `<button class="as-btn-open" data-id="${app.id}">Open</button>
      <button class="as-btn-uninstall" data-id="${app.id}">Uninstall</button>`;
  } else {
    actionBtn = `<button class="as-btn-get" data-id="${app.id}">Get</button>`;
  }

  return `
    <div class="as-card" data-id="${app.id}">
      <div class="as-card-icon">${app.icon}</div>
      <div class="as-card-info">
        <div class="as-card-title">${esc(app.title)}</div>
        <div class="as-card-desc">${esc(app.desc || '')}</div>
        <div class="as-card-meta">
          v${app.version || '1.0'} &middot; ${app.size || '--'}
          ${isSystem ? ' &middot; <span class="as-system-badge">System</span>' : ''}
          ${installed && !isSystem ? ' &middot; <span class="as-installed-badge">Installed</span>' : ''}
        </div>
      </div>
      <div class="as-card-actions">
        ${actionBtn}
      </div>
    </div>
  `;
}

function renderInstalledCard(app) {
  const isSystem = app.system;

  return `
    <div class="as-card" data-id="${app.id}">
      <div class="as-card-icon">${app.icon}</div>
      <div class="as-card-info">
        <div class="as-card-title">${esc(app.title)}</div>
        <div class="as-card-desc">${esc(app.desc || '')}</div>
        <div class="as-card-meta">
          v${app.version || '1.0'} &middot; ${app.size || '--'}
          ${isSystem ? ' &middot; <span class="as-system-badge">System</span>' : ''}
        </div>
      </div>
      <div class="as-card-actions">
        <button class="as-btn-open" data-id="${app.id}">Open</button>
        ${isSystem ? '' : `<button class="as-btn-uninstall" data-id="${app.id}">Uninstall</button>`}
      </div>
    </div>
  `;
}

function renderCompactCard(app) {
  const installed = isInstalled(app.id);
  return `
    <div class="as-featured-card" data-id="${app.id}">
      <div class="as-featured-icon">${app.icon}</div>
      <div class="as-featured-name">${esc(app.title)}</div>
      ${installed
        ? `<button class="as-btn-open as-btn-sm" data-id="${app.id}">Open</button>`
        : `<button class="as-btn-get as-btn-sm" data-id="${app.id}">Get</button>`
      }
    </div>
  `;
}

function matchesSearch(app, q) {
  return app.title.toLowerCase().includes(q) ||
    app.id.includes(q) ||
    (app.desc || '').toLowerCase().includes(q);
}

function bindEvents() {
  container.querySelectorAll('.as-tab').forEach(el => {
    el.addEventListener('click', () => {
      activeTab = el.dataset.tab;
      render();
    });
  });

  const searchInput = container.querySelector('.as-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim();
      renderContent();
    });
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
  }
}

function bindCardEvents(content) {
  // Open
  content.querySelectorAll('.as-btn-open[data-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.__tapasos_openApp?.(btn.dataset.id);
    });
  });

  // Install (Get)
  content.querySelectorAll('.as-btn-get').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const appId = btn.dataset.id;
      window.__tapasos_installApp?.(appId);
      btn.textContent = '\u2713 Installed';
      btn.disabled = true;
      btn.className = 'as-btn-installed';
      setTimeout(() => render(), 600);
    });
  });

  // Uninstall
  content.querySelectorAll('.as-btn-uninstall').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const appId = btn.dataset.id;
      window.__tapasos_uninstallApp?.(appId);
      btn.textContent = 'Removed';
      btn.disabled = true;
      setTimeout(() => render(), 600);
    });
  });

  // Card click → open if installed
  content.querySelectorAll('.as-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const appId = card.dataset.id;
      if (isInstalled(appId)) {
        window.__tapasos_openApp?.(appId);
      }
    });
  });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function injectStyles() {
  if (document.getElementById('appstore-styles')) return;
  const style = document.createElement('style');
  style.id = 'appstore-styles';
  style.textContent = `
    .as-app {
      display: flex;
      height: 100%;
      font-family: var(--font-body);
    }

    .as-sidebar {
      width: 180px;
      flex-shrink: 0;
      background: rgba(0,0,0,0.2);
      border-right: 1px solid rgba(255,255,255,0.06);
      padding: 12px 6px;
      overflow-y: auto;
    }

    .as-sidebar-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      padding: 0 8px 10px;
    }

    .as-sidebar-divider {
      height: 1px;
      background: rgba(255,255,255,0.06);
      margin: 8px 10px;
    }

    .as-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 7px;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 12px;
      transition: background 0.12s, color 0.12s;
    }
    .as-tab:hover { background: rgba(255,255,255,0.05); }
    .as-tab.active { background: rgba(0,229,255,0.1); color: var(--cyan); }
    .as-tab-count {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
    }
    .as-tab-cat { padding-left: 18px; }

    .as-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .as-toolbar {
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }
    .as-search-wrap { max-width: 280px; }
    .as-search {
      width: 100%;
      padding: 6px 10px;
      border-radius: 7px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 12px;
      outline: none;
    }
    .as-search:focus { border-color: rgba(0,229,255,0.3); }
    .as-search::placeholder { color: var(--text-dim); }

    .as-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
    }

    /* Featured */
    .as-featured {
      background: linear-gradient(135deg, rgba(0,229,255,0.06), rgba(124,58,237,0.06));
      border: 1px solid rgba(0,229,255,0.1);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }
    .as-featured-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 2px;
    }
    .as-featured-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .as-featured-grid {
      display: flex;
      gap: 10px;
      overflow-x: auto;
    }
    .as-featured-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      min-width: 90px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .as-featured-card:hover { background: rgba(255,255,255,0.06); }
    .as-featured-icon { font-size: 28px; }
    .as-featured-name { font-size: 11px; color: var(--text-primary); font-weight: 500; }

    /* Sections */
    .as-section { margin-bottom: 20px; }
    .as-section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 8px;
      padding-left: 2px;
    }
    .as-section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .as-section-icon { font-size: 28px; }
    .as-section-title-large {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .as-section-count {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Grid */
    .as-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* Card */
    .as-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.04);
      background: rgba(255,255,255,0.02);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .as-card:hover {
      background: rgba(255,255,255,0.04);
      border-color: rgba(255,255,255,0.08);
    }

    .as-card-icon {
      font-size: 28px;
      flex-shrink: 0;
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.03);
      border-radius: 10px;
    }

    .as-card-info { flex: 1; min-width: 0; }
    .as-card-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 2px;
    }
    .as-card-desc {
      font-size: 11px;
      color: var(--text-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    }
    .as-card-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--text-dim);
    }

    .as-system-badge {
      background: rgba(255,255,255,0.06);
      padding: 1px 5px;
      border-radius: 3px;
      color: var(--text-muted);
    }
    .as-installed-badge {
      color: #4caf50;
    }

    .as-card-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex-shrink: 0;
    }

    .as-btn-open {
      padding: 5px 14px;
      border-radius: 6px;
      border: 1px solid rgba(0,229,255,0.2);
      background: rgba(0,229,255,0.08);
      color: var(--cyan);
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      text-align: center;
    }
    .as-btn-open:hover { background: rgba(0,229,255,0.15); }

    .as-btn-get {
      padding: 5px 16px;
      border-radius: 6px;
      border: 1px solid rgba(0,229,255,0.3);
      background: rgba(0,229,255,0.12);
      color: var(--cyan);
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    .as-btn-get:hover { background: rgba(0,229,255,0.2); }

    .as-btn-sm { padding: 4px 12px; font-size: 10px; }

    .as-btn-installed {
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid rgba(39,201,63,0.2);
      background: rgba(39,201,63,0.08);
      color: #27C93F;
      font-family: var(--font-body);
      font-size: 11px;
      cursor: default;
    }

    .as-btn-uninstall {
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid rgba(239,68,68,0.15);
      background: rgba(239,68,68,0.06);
      color: #f87171;
      font-family: var(--font-body);
      font-size: 10px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .as-btn-uninstall:hover { background: rgba(239,68,68,0.12); }

    .as-empty {
      text-align: center;
      color: var(--text-dim);
      font-size: 12px;
      padding: 40px 0;
    }
  `;
  document.head.appendChild(style);
}
