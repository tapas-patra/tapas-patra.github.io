// App Store — Browse, install (add to dock), and manage TapasOS apps
// Also shows real GitHub projects from data.json

let container = null;
let activeTab = 'apps';
let githubRepos = [];
let searchQuery = '';

const CATEGORIES = {
  productivity: ['notes', 'calendar', 'finder', 'launchpad', 'terminal', 'settings'],
  portfolio: ['ai-assistant', 'projects', 'skills', 'activity', 'awards', 'resume', 'experience', 'education', 'contact'],
  media: ['photos', 'classic'],
};

function getCategoryLabel(appId) {
  for (const [cat, ids] of Object.entries(CATEGORIES)) {
    if (ids.includes(appId)) return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
  return 'Other';
}

export async function init(el) {
  container = el;
  await fetchGitHubRepos();
  injectStyles();
  render();
}

async function fetchGitHubRepos() {
  try {
    const resp = await fetch('data.json');
    if (resp.ok) {
      const data = await resp.json();
      githubRepos = (data.github?.all_repos || []).filter(r => !r.is_private);
    }
  } catch { /* no data */ }
}

function getApps() {
  const registry = window.__tapasos_getAppRegistry?.() || [];
  return registry.filter(a => a.id !== 'appstore');
}

function render() {
  const apps = getApps();
  const isInDock = window.__tapasos_isInDock || (() => false);

  container.innerHTML = `
    <div class="as-app">
      <div class="as-sidebar">
        <div class="as-sidebar-title">App Store</div>
        <div class="as-tab ${activeTab === 'apps' ? 'active' : ''}" data-tab="apps">
          <span>\uD83D\uDCE6</span><span>TapasOS Apps</span>
          <span class="as-tab-count">${apps.length}</span>
        </div>
        <div class="as-tab ${activeTab === 'github' ? 'active' : ''}" data-tab="github">
          <span>\uD83D\uDC19</span><span>GitHub Projects</span>
          <span class="as-tab-count">${githubRepos.length}</span>
        </div>
        <div class="as-tab ${activeTab === 'installed' ? 'active' : ''}" data-tab="installed">
          <span>\u2705</span><span>In Dock</span>
          <span class="as-tab-count">${apps.filter(a => isInDock(a.id)).length}</span>
        </div>
      </div>
      <div class="as-main">
        <div class="as-toolbar">
          <div class="as-search-wrap">
            <input type="text" class="as-search" placeholder="Search..." value="${esc(searchQuery)}">
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

  if (activeTab === 'apps') renderAppsTab(content);
  else if (activeTab === 'github') renderGitHubTab(content);
  else if (activeTab === 'installed') renderInstalledTab(content);
}

function renderAppsTab(content) {
  const apps = getApps();
  const isInDock = window.__tapasos_isInDock || (() => false);
  const q = searchQuery.toLowerCase();
  const filtered = q
    ? apps.filter(a => a.title.toLowerCase().includes(q) || (a.desc || '').toLowerCase().includes(q))
    : apps;

  // Group by category
  const groups = {};
  filtered.forEach(app => {
    const cat = getCategoryLabel(app.id);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(app);
  });

  if (filtered.length === 0) {
    content.innerHTML = '<div class="as-empty">No apps match your search</div>';
    return;
  }

  content.innerHTML = Object.entries(groups).map(([cat, catApps]) => `
    <div class="as-section">
      <div class="as-section-title">${cat}</div>
      <div class="as-grid">
        ${catApps.map(app => renderAppCard(app, isInDock(app.id))).join('')}
      </div>
    </div>
  `).join('');

  bindCardEvents(content);
}

function renderInstalledTab(content) {
  const apps = getApps();
  const isInDock = window.__tapasos_isInDock || (() => false);
  const docked = apps.filter(a => isInDock(a.id));
  const q = searchQuery.toLowerCase();
  const filtered = q
    ? docked.filter(a => a.title.toLowerCase().includes(q) || (a.desc || '').toLowerCase().includes(q))
    : docked;

  if (filtered.length === 0) {
    content.innerHTML = '<div class="as-empty">No apps in dock</div>';
    return;
  }

  content.innerHTML = `
    <div class="as-grid">
      ${filtered.map(app => renderAppCard(app, true)).join('')}
    </div>
  `;

  bindCardEvents(content);
}

function renderAppCard(app, inDock) {
  return `
    <div class="as-card" data-id="${app.id}">
      <div class="as-card-icon">${app.icon}</div>
      <div class="as-card-info">
        <div class="as-card-title">${esc(app.title)}</div>
        <div class="as-card-desc">${esc(app.desc || '')}</div>
        <div class="as-card-meta">v${app.version || '1.0'} &middot; ${app.size || '—'}</div>
      </div>
      <div class="as-card-actions">
        <button class="as-btn-open" data-id="${app.id}" title="Open">Open</button>
        ${inDock
          ? `<button class="as-btn-remove" data-id="${app.id}" title="Remove from Dock">Remove</button>`
          : `<button class="as-btn-install" data-id="${app.id}" title="Add to Dock">+ Dock</button>`
        }
      </div>
    </div>
  `;
}

function renderGitHubTab(content) {
  const q = searchQuery.toLowerCase();
  const filtered = q
    ? githubRepos.filter(r => r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q))
    : githubRepos;

  if (githubRepos.length === 0) {
    content.innerHTML = '<div class="as-empty">No public repositories found</div>';
    return;
  }

  if (filtered.length === 0) {
    content.innerHTML = '<div class="as-empty">No repos match your search</div>';
    return;
  }

  content.innerHTML = `
    <div class="as-grid">
      ${filtered.map(repo => `
        <div class="as-card as-card-repo">
          <div class="as-card-icon">\uD83D\uDCC1</div>
          <div class="as-card-info">
            <div class="as-card-title">${esc(repo.name)}</div>
            <div class="as-card-desc">${esc(repo.description || 'No description')}</div>
            <div class="as-card-meta">
              ${repo.language ? `<span class="as-lang">${repo.language}</span>` : ''}
              ${repo.stars > 0 ? `<span>\u2B50 ${repo.stars}</span>` : ''}
              <span>Updated ${formatDate(repo.updated_at)}</span>
            </div>
          </div>
          <div class="as-card-actions">
            ${repo.url ? `<a class="as-btn-open" href="${repo.url}" target="_blank" rel="noopener">View</a>` : '<span class="as-private-label">Private</span>'}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function bindEvents() {
  // Tab switching
  container.querySelectorAll('.as-tab').forEach(el => {
    el.addEventListener('click', () => {
      activeTab = el.dataset.tab;
      render();
    });
  });

  // Search
  const searchInput = container.querySelector('.as-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      renderContent();
    });
    // Maintain focus after re-render
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
  }
}

function bindCardEvents(content) {
  // Open app
  content.querySelectorAll('.as-btn-open[data-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const openApp = window.__tapasos_openApp;
      if (openApp) openApp(btn.dataset.id);
    });
  });

  // Add to dock
  content.querySelectorAll('.as-btn-install').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const addToDock = window.__tapasos_addToDock;
      if (addToDock) addToDock(btn.dataset.id);
      btn.textContent = '\u2713 Added';
      btn.disabled = true;
      btn.className = 'as-btn-added';
      // Re-render after a brief pause
      setTimeout(() => render(), 600);
    });
  });

  // Remove from dock
  content.querySelectorAll('.as-btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const removeFromDock = window.__tapasos_removeFromDock;
      if (removeFromDock) removeFromDock(btn.dataset.id);
      btn.textContent = 'Removed';
      btn.disabled = true;
      setTimeout(() => render(), 600);
    });
  });

  // Card click → open app
  content.querySelectorAll('.as-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const openApp = window.__tapasos_openApp;
      if (openApp) openApp(card.dataset.id);
    });
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

    /* ── Sidebar ── */
    .as-sidebar {
      width: 180px;
      flex-shrink: 0;
      background: rgba(0,0,0,0.2);
      border-right: 1px solid rgba(255,255,255,0.06);
      padding: 12px 6px;
    }

    .as-sidebar-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      padding: 0 8px 10px;
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

    .as-tab:hover {
      background: rgba(255,255,255,0.05);
    }

    .as-tab.active {
      background: rgba(0, 229, 255, 0.1);
      color: var(--cyan);
    }

    .as-tab-count {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
    }

    /* ── Main ── */
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

    .as-search-wrap {
      max-width: 280px;
    }

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
      transition: border-color 0.15s;
    }

    .as-search:focus {
      border-color: rgba(0, 229, 255, 0.3);
    }

    .as-search::placeholder {
      color: var(--text-dim);
    }

    .as-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
    }

    /* ── Section ── */
    .as-section {
      margin-bottom: 20px;
    }

    .as-section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 8px;
      padding-left: 2px;
    }

    /* ── Grid ── */
    .as-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* ── Card ── */
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

    .as-card-info {
      flex: 1;
      min-width: 0;
    }

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
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--text-dim);
    }

    .as-lang {
      background: rgba(255,255,255,0.06);
      padding: 1px 5px;
      border-radius: 4px;
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
      border: 1px solid rgba(0, 229, 255, 0.2);
      background: rgba(0, 229, 255, 0.08);
      color: var(--cyan);
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      text-decoration: none;
      text-align: center;
    }

    .as-btn-open:hover {
      background: rgba(0, 229, 255, 0.15);
    }

    .as-btn-install {
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: var(--text-muted);
      font-family: var(--font-body);
      font-size: 10px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .as-btn-install:hover {
      background: rgba(255,255,255,0.08);
      color: var(--text-primary);
    }

    .as-btn-remove {
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid rgba(239, 68, 68, 0.15);
      background: rgba(239, 68, 68, 0.06);
      color: #f87171;
      font-family: var(--font-body);
      font-size: 10px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .as-btn-remove:hover {
      background: rgba(239, 68, 68, 0.12);
    }

    .as-btn-added {
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid rgba(39, 201, 63, 0.2);
      background: rgba(39, 201, 63, 0.08);
      color: #27C93F;
      font-family: var(--font-body);
      font-size: 10px;
      cursor: default;
    }

    .as-private-label {
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--text-dim);
      padding: 4px 8px;
      background: rgba(255,255,255,0.03);
      border-radius: 4px;
    }

    .as-empty {
      text-align: center;
      color: var(--text-dim);
      font-size: 12px;
      padding: 40px 0;
    }
  `;
  document.head.appendChild(style);
}
