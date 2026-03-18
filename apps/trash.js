// Trash.app — Recycle Bin for TapasOS
// Items moved here can be restored or permanently deleted

const LS_TRASH = 'tapasos-trash';

let container = null;

export async function init(el) {
  container = el;
  injectStyles();
  render();
}

function getTrash() {
  try { return JSON.parse(localStorage.getItem(LS_TRASH)) || []; }
  catch { return []; }
}

function saveTrash(items) {
  localStorage.setItem(LS_TRASH, JSON.stringify(items));
  updateDockIcon();
}

function render() {
  const items = getTrash();

  container.innerHTML = `
    <div class="trash-app">
      <div class="trash-toolbar">
        <div class="trash-toolbar-left">
          <div class="trash-count">${items.length} item${items.length !== 1 ? 's' : ''} in Trash</div>
        </div>
        <div class="trash-toolbar-right">
          <button class="trash-btn trash-restore-all-btn" ${items.length === 0 ? 'disabled' : ''}>Restore All</button>
          <button class="trash-btn trash-empty-btn" ${items.length === 0 ? 'disabled' : ''}>Empty Trash</button>
        </div>
      </div>
      <div class="trash-content">
        ${items.length === 0 ? `
          <div class="trash-empty-state">
            <svg class="trash-empty-icon" viewBox="0 0 80 80" fill="none">
              <path d="M20 25h40M28 25V20a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v5" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-linecap="round"/>
              <path d="M22 25l3 40a4 4 0 0 0 4 3.5h22a4 4 0 0 0 4-3.5l3-40" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-linecap="round"/>
              <line x1="35" y1="33" x2="35" y2="58" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="45" y1="33" x2="45" y2="58" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <div class="trash-empty-title">Trash is Empty</div>
            <div class="trash-empty-desc">Items you delete will appear here</div>
          </div>
        ` : `
          <div class="trash-list">
            ${items.map((item, i) => `
              <div class="trash-item" data-index="${i}">
                <div class="trash-item-icon">${getItemIcon(item.type, item.icon)}</div>
                <div class="trash-item-info">
                  <div class="trash-item-name">${esc(item.name)}</div>
                  <div class="trash-item-meta">${item.type === 'folder' ? 'Folder' : item.type === 'app' ? 'Application' : item.type} &middot; Deleted ${formatDate(item.deletedAt)}</div>
                </div>
                <div class="trash-item-actions">
                  <button class="trash-item-btn trash-item-restore" title="Restore" data-index="${i}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                  </button>
                  <button class="trash-item-btn trash-item-delete" title="Delete Permanently" data-index="${i}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  // Empty Trash
  container.querySelector('.trash-empty-btn')?.addEventListener('click', () => {
    const items = getTrash();
    if (items.length === 0) return;
    saveTrash([]);
    render();
  });

  // Restore All
  container.querySelector('.trash-restore-all-btn')?.addEventListener('click', () => {
    const items = getTrash();
    if (items.length === 0) return;
    items.forEach(item => restoreItem(item));
    saveTrash([]);
    render();
  });

  // Per-item restore
  container.querySelectorAll('.trash-item-restore').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const items = getTrash();
      const item = items[idx];
      if (!item) return;
      restoreItem(item);
      items.splice(idx, 1);
      saveTrash(items);
      render();
    });
  });

  // Per-item permanent delete
  container.querySelectorAll('.trash-item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const items = getTrash();
      items.splice(idx, 1);
      saveTrash(items);
      render();
    });
  });
}

function restoreItem(item) {
  if (item.type === 'folder') {
    try {
      const folders = JSON.parse(localStorage.getItem('tapasos-desktop-folders')) || [];
      folders.push({ id: item.id, name: item.name, x: item.x || 100, y: item.y || 100 });
      localStorage.setItem('tapasos-desktop-folders', JSON.stringify(folders));
      if (window.__tapasos_renderFolders) window.__tapasos_renderFolders();
    } catch { /* ignore */ }
  } else if (item.type === 'app') {
    // Re-install: remove from uninstalled set via global bridge
    const isInstalled = window.__tapasos_isInstalled;
    if (isInstalled && !isInstalled(item.id)) {
      // Access the uninstalled set through a reinstall bridge
      if (window.__tapasos_reinstallApp) window.__tapasos_reinstallApp(item.id);
    }
  }
}

function getItemIcon(type, icon) {
  if (icon) return `<span style="font-size:20px">${icon}</span>`;
  if (type === 'folder') return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M2 6C2 4.9 2.9 4 4 4H9L11 6H20C21.1 6 22 6.9 22 8V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6Z" fill="rgba(0,229,255,0.15)" stroke="rgba(0,229,255,0.5)" stroke-width="1"/></svg>';
  if (type === 'app') return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0,229,255,0.4)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4"/></svg>';
  return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// Update dock icon to show full/empty state
function updateDockIcon() {
  const items = getTrash();
  const dockItem = document.querySelector('.dock-item[data-app="trash"] .dock-icon');
  if (dockItem) {
    dockItem.textContent = items.length > 0 ? '\uD83D\uDDD1' : '\uD83D\uDDD1';
  }
  // Update trash badge
  const badge = document.querySelector('.dock-item[data-app="trash"] .dock-badge');
  if (badge) {
    badge.textContent = items.length || '';
    badge.style.display = items.length ? '' : 'none';
  }
}

function injectStyles() {
  if (document.getElementById('trash-styles')) return;
  const style = document.createElement('style');
  style.id = 'trash-styles';
  style.textContent = `
    .trash-app {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: var(--font-body);
    }

    .trash-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .trash-count {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .trash-toolbar-right {
      display: flex;
      gap: 8px;
    }

    .trash-btn {
      padding: 5px 14px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: var(--text-muted);
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .trash-btn:hover:not(:disabled) {
      background: rgba(255,255,255,0.08);
      color: var(--text-primary);
    }

    .trash-btn:disabled {
      opacity: 0.3;
      cursor: default;
    }

    .trash-empty-btn:hover:not(:disabled) {
      background: rgba(255,59,48,0.12);
      border-color: rgba(255,59,48,0.2);
      color: #FF3B30;
    }

    .trash-restore-all-btn:hover:not(:disabled) {
      background: rgba(0,229,255,0.08);
      border-color: rgba(0,229,255,0.2);
      color: var(--cyan);
    }

    .trash-content {
      flex: 1;
      overflow-y: auto;
    }

    /* Empty state */
    .trash-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 12px;
      padding: 40px;
    }

    .trash-empty-icon {
      width: 80px;
      height: 80px;
      opacity: 0.6;
    }

    .trash-empty-title {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .trash-empty-desc {
      font-size: 11px;
      color: var(--text-dim);
    }

    /* Item list */
    .trash-list {
      padding: 8px;
    }

    .trash-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      transition: background 0.12s;
    }

    .trash-item:hover {
      background: rgba(255,255,255,0.04);
    }

    .trash-item-icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
    }

    .trash-item-info {
      flex: 1;
      min-width: 0;
    }

    .trash-item-name {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .trash-item-meta {
      font-size: 10px;
      color: var(--text-dim);
      margin-top: 2px;
    }

    .trash-item-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.15s;
    }

    .trash-item:hover .trash-item-actions {
      opacity: 1;
    }

    .trash-item-btn {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: rgba(255,255,255,0.04);
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.12s, color 0.12s;
    }

    .trash-item-restore:hover {
      background: rgba(0,229,255,0.12);
      color: var(--cyan);
    }

    .trash-item-delete:hover {
      background: rgba(255,59,48,0.12);
      color: #FF3B30;
    }
  `;
  document.head.appendChild(style);
}
