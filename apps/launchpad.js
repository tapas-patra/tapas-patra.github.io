// Launchpad — View and launch all installed applications

let container = null;
let searchQuery = '';

export async function init(el) {
  container = el;
  injectStyles();
  render();
}

function getApps() {
  const registry = window.__tapasos_getAppRegistry?.() || [];
  // Exclude launchpad itself from the grid
  return registry.filter(a => a.id !== 'launchpad');
}

function render() {
  const apps = getApps();
  const filtered = searchQuery
    ? apps.filter(a =>
        a.title.toLowerCase().includes(searchQuery) ||
        (a.desc || '').toLowerCase().includes(searchQuery))
    : apps;

  container.innerHTML = `
    <div class="lp-app">
      <div class="lp-header">
        <div class="lp-title">Launchpad</div>
        <div class="lp-search-wrap">
          <input type="text" class="lp-search" placeholder="Search apps..." value="${esc(searchQuery)}">
        </div>
        <div class="lp-count">${apps.length} apps installed</div>
      </div>
      <div class="lp-grid">
        ${filtered.length === 0
          ? '<div class="lp-empty">No matching apps</div>'
          : filtered.map(app => `
            <div class="lp-item" data-id="${app.id}">
              <div class="lp-icon">${app.icon}</div>
              <div class="lp-name">${esc(app.title)}</div>
              <div class="lp-desc">${esc(app.desc || '')}</div>
              <div class="lp-meta">v${app.version || '1.0'} &middot; ${app.size || '—'}</div>
            </div>
          `).join('')}
      </div>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  // Search
  const searchInput = container.querySelector('.lp-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      renderGrid();
    });
  }

  // App click → open
  container.querySelectorAll('.lp-item').forEach(el => {
    el.addEventListener('click', () => {
      const openApp = window.__tapasos_openApp;
      if (openApp) openApp(el.dataset.id);
    });
  });
}

function renderGrid() {
  const apps = getApps();
  const filtered = searchQuery
    ? apps.filter(a =>
        a.title.toLowerCase().includes(searchQuery) ||
        (a.desc || '').toLowerCase().includes(searchQuery))
    : apps;

  const grid = container.querySelector('.lp-grid');
  if (!grid) return;

  grid.innerHTML = filtered.length === 0
    ? '<div class="lp-empty">No matching apps</div>'
    : filtered.map(app => `
      <div class="lp-item" data-id="${app.id}">
        <div class="lp-icon">${app.icon}</div>
        <div class="lp-name">${esc(app.title)}</div>
        <div class="lp-desc">${esc(app.desc || '')}</div>
        <div class="lp-meta">v${app.version || '1.0'} &middot; ${app.size || '—'}</div>
      </div>
    `).join('');

  // Re-bind click events
  grid.querySelectorAll('.lp-item').forEach(el => {
    el.addEventListener('click', () => {
      const openApp = window.__tapasos_openApp;
      if (openApp) openApp(el.dataset.id);
    });
  });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function injectStyles() {
  if (document.getElementById('launchpad-styles')) return;
  const style = document.createElement('style');
  style.id = 'launchpad-styles';
  style.textContent = `
    .lp-app {
      height: 100%;
      display: flex;
      flex-direction: column;
      font-family: var(--font-body);
      overflow: hidden;
    }

    .lp-header {
      padding: 16px 20px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .lp-title {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
      white-space: nowrap;
    }

    .lp-search-wrap {
      flex: 1;
      max-width: 240px;
    }

    .lp-search {
      width: 100%;
      padding: 5px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 11px;
      outline: none;
      transition: border-color 0.15s;
    }

    .lp-search:focus {
      border-color: rgba(0, 229, 255, 0.3);
    }

    .lp-search::placeholder {
      color: var(--text-dim);
    }

    .lp-count {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
      white-space: nowrap;
    }

    .lp-grid {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 10px;
      align-content: start;
    }

    .lp-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 16px 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.04);
      background: rgba(255,255,255,0.02);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, transform 0.15s;
    }

    .lp-item:hover {
      background: rgba(0, 229, 255, 0.06);
      border-color: rgba(0, 229, 255, 0.15);
      transform: translateY(-2px);
    }

    .lp-item:active {
      transform: scale(0.97);
    }

    .lp-icon {
      font-size: 32px;
      margin-bottom: 8px;
      line-height: 1;
    }

    .lp-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .lp-desc {
      font-size: 9px;
      color: var(--text-dim);
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 4px;
    }

    .lp-meta {
      font-family: var(--font-mono);
      font-size: 8px;
      color: var(--text-dim);
      opacity: 0.6;
    }

    .lp-empty {
      grid-column: 1 / -1;
      text-align: center;
      color: var(--text-dim);
      font-size: 12px;
      padding: 40px 0;
    }
  `;
  document.head.appendChild(style);
}
