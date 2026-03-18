// TapasOS Notifications — toast notifications + slide-in Notification Center panel

import { playNotification } from './sounds.js';

let activeNotifications = [];
let notifId = 0;
let history = []; // { id, title, body, icon, type, timestamp, appName }
const MAX_HISTORY = 50;
let panelOpen = false;

export function initNotifications() {
  injectStyles();

  // Toast container (top-right, for live toasts)
  const container = document.createElement('div');
  container.id = 'notification-toasts';
  document.body.appendChild(container);

  // Add bell icon to menubar
  addMenubarTrigger();
}

export function notify(title, body = '', { icon = '', duration = 4000, type = 'info', onClick = null, silent = false, app = 'TapasOS' } = {}) {
  notifId++;
  const id = notifId;
  const timestamp = Date.now();
  if (!silent) playNotification();

  // Store in history
  history.unshift({ id, title, body, icon, type, timestamp, app });
  if (history.length > MAX_HISTORY) history.pop();
  updateBadge();
  if (panelOpen) renderPanelContent();

  // Create toast
  const el = document.createElement('div');
  el.className = `notif notif-${type}`;
  el.dataset.id = id;
  el.innerHTML = `
    <div class="notif-header">
      ${icon ? `<span class="notif-icon">${icon}</span>` : ''}
      <span class="notif-title">${esc(title)}</span>
      <span class="notif-time">now</span>
      <button class="notif-close">&times;</button>
    </div>
    ${body ? `<div class="notif-body">${esc(body)}</div>` : ''}
  `;

  el.querySelector('.notif-close').addEventListener('click', (e) => {
    e.stopPropagation();
    dismissNotification(id);
  });

  if (onClick) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      if (e.target.closest('.notif-close')) return;
      onClick();
      dismissNotification(id);
    });
  }

  const container = document.getElementById('notification-toasts');
  container.appendChild(el);
  activeNotifications.push({ id, el });

  requestAnimationFrame(() => el.classList.add('notif-visible'));

  if (duration > 0) {
    setTimeout(() => dismissNotification(id), duration);
  }

  return id;
}

export function dismissNotification(id) {
  const idx = activeNotifications.findIndex(n => n.id === id);
  if (idx === -1) return;

  const { el } = activeNotifications[idx];
  el.classList.remove('notif-visible');
  el.classList.add('notif-exit');

  setTimeout(() => {
    el.remove();
    activeNotifications.splice(idx, 1);
  }, 300);
}

// ── Notification Center Panel ──

function addMenubarTrigger() {
  const menubarRight = document.querySelector('.menubar-right');
  if (!menubarRight) return;

  const trigger = document.createElement('div');
  trigger.className = 'nc-trigger';
  trigger.title = 'Notification Center';
  trigger.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    <span class="nc-badge" id="nc-badge"></span>
  `;

  // Insert before the clock
  const clock = menubarRight.querySelector('.menubar-clock');
  if (clock) {
    menubarRight.insertBefore(trigger, clock);
  } else {
    menubarRight.appendChild(trigger);
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePanel();
  });
}

function updateBadge() {
  const badge = document.getElementById('nc-badge');
  if (!badge) return;
  const count = history.length;
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : count;
    badge.classList.add('visible');
  } else {
    badge.classList.remove('visible');
  }
}

export function togglePanel() {
  panelOpen ? closePanel() : openPanel();
}

function openPanel() {
  if (panelOpen) return;
  panelOpen = true;

  let panel = document.getElementById('nc-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'nc-panel';
    document.body.appendChild(panel);
  }

  renderPanelContent();
  requestAnimationFrame(() => panel.classList.add('visible'));

  // Backdrop click to close
  setTimeout(() => {
    document.addEventListener('click', onOutsideClick);
  }, 10);
}

function closePanel() {
  if (!panelOpen) return;
  panelOpen = false;

  const panel = document.getElementById('nc-panel');
  if (panel) {
    panel.classList.remove('visible');
    setTimeout(() => panel.remove(), 300);
  }

  document.removeEventListener('click', onOutsideClick);
}

function onOutsideClick(e) {
  if (e.target.closest('#nc-panel') || e.target.closest('.nc-trigger')) return;
  closePanel();
}

function renderPanelContent() {
  const panel = document.getElementById('nc-panel');
  if (!panel) return;

  const now = Date.now();

  // Group by app
  const groups = {};
  history.forEach(n => {
    const key = n.app || 'TapasOS';
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });

  const groupKeys = Object.keys(groups);

  panel.innerHTML = `
    <div class="nc-header">
      <div class="nc-title">Notifications</div>
      ${history.length > 0 ? '<button class="nc-clear" id="nc-clear-all">Clear All</button>' : ''}
    </div>
    <div class="nc-body">
      ${history.length === 0
        ? '<div class="nc-empty"><div class="nc-empty-icon">&#x1F514;</div><div>No notifications</div></div>'
        : groupKeys.map(appName => `
          <div class="nc-group">
            <div class="nc-group-header">
              <span class="nc-group-name">${esc(appName)}</span>
              <span class="nc-group-count">${groups[appName].length}</span>
              <button class="nc-group-clear" data-app="${esc(appName)}">&times;</button>
            </div>
            ${groups[appName].map(n => `
              <div class="nc-item nc-item-${n.type}" data-id="${n.id}">
                <div class="nc-item-header">
                  ${n.icon ? `<span class="nc-item-icon">${n.icon}</span>` : ''}
                  <span class="nc-item-title">${esc(n.title)}</span>
                  <span class="nc-item-time">${formatTime(n.timestamp, now)}</span>
                </div>
                ${n.body ? `<div class="nc-item-body">${esc(n.body)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `).join('')}
    </div>
  `;

  // Bind clear all
  panel.querySelector('#nc-clear-all')?.addEventListener('click', () => {
    history = [];
    updateBadge();
    renderPanelContent();
  });

  // Bind clear per group
  panel.querySelectorAll('.nc-group-clear').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const appName = btn.dataset.app;
      history = history.filter(n => (n.app || 'TapasOS') !== appName);
      updateBadge();
      renderPanelContent();
    });
  });
}

function formatTime(ts, now) {
  const diff = now - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function injectStyles() {
  if (document.getElementById('notif-styles')) return;
  const s = document.createElement('style');
  s.id = 'notif-styles';
  s.textContent = `
    /* ── Toast Container (top-right) ── */
    #notification-toasts {
      position:fixed; top:32px; right:12px; z-index:19000;
      display:flex; flex-direction:column; gap:8px;
      pointer-events:none; max-width:340px; width:100%;
    }

    .notif {
      pointer-events:auto;
      background:rgba(20,20,30,0.92); backdrop-filter:blur(16px);
      border:1px solid rgba(255,255,255,0.08); border-radius:12px;
      padding:12px 14px; min-width:280px;
      transform:translateX(120%); opacity:0;
      transition:transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);
    }
    .notif-visible { transform:translateX(0); opacity:1; }
    .notif-exit { transform:translateX(120%); opacity:0; }

    .notif-header {
      display:flex; align-items:center; gap:8px;
    }
    .notif-icon { font-size:16px; flex-shrink:0; }
    .notif-title {
      flex:1; font-size:13px; font-weight:600; color:var(--text-primary);
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .notif-time { font-size:10px; color:var(--text-dim); flex-shrink:0; }
    .notif-close {
      background:none; border:none; color:var(--text-dim); font-size:14px;
      cursor:pointer; padding:0 2px; line-height:1; flex-shrink:0;
      transition:color 0.15s;
    }
    .notif-close:hover { color:var(--text-primary); }

    .notif-body {
      font-size:12px; color:var(--text-muted); line-height:1.5;
      margin-top:6px; padding-left:24px;
    }

    .notif-info { border-left:3px solid var(--cyan, #00e5ff); }
    .notif-success { border-left:3px solid #27C93F; }
    .notif-warning { border-left:3px solid #FFBD2E; }
    .notif-error { border-left:3px solid #FF5F56; }

    /* ── Menubar Bell Trigger ── */
    .nc-trigger {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-muted);
      transition: color 0.15s, background 0.15s;
    }

    .nc-trigger:hover {
      color: var(--text-primary);
      background: rgba(255,255,255,0.06);
    }

    .nc-badge {
      position: absolute;
      top: -2px;
      right: 0px;
      min-width: 14px;
      height: 14px;
      border-radius: 7px;
      background: #FF5F56;
      color: #fff;
      font-size: 8px;
      font-weight: 700;
      font-family: var(--font-mono);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
      line-height: 14px;
      text-align: center;
    }

    .nc-badge.visible {
      display: flex;
    }

    /* ── Notification Center Panel ── */
    #nc-panel {
      position: fixed;
      top: 28px;
      right: 0;
      bottom: 0;
      width: 360px;
      z-index: 17000;
      background: rgba(18, 18, 30, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-left: 1px solid rgba(255,255,255,0.06);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: -8px 0 40px rgba(0,0,0,0.4);
    }

    #nc-panel.visible {
      transform: translateX(0);
    }

    .nc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .nc-title {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .nc-clear {
      background: none;
      border: none;
      color: var(--cyan, #00e5ff);
      font-family: var(--font-body);
      font-size: 11px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.15s;
    }

    .nc-clear:hover {
      background: rgba(0, 229, 255, 0.1);
    }

    .nc-body {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .nc-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 200px;
      color: var(--text-dim);
      font-family: var(--font-body);
      font-size: 12px;
    }

    .nc-empty-icon {
      font-size: 32px;
      opacity: 0.3;
    }

    /* ── Group ── */
    .nc-group {
      margin-bottom: 12px;
    }

    .nc-group-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      margin-bottom: 4px;
    }

    .nc-group-name {
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .nc-group-count {
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--text-dim);
      background: rgba(255,255,255,0.05);
      padding: 1px 5px;
      border-radius: 8px;
    }

    .nc-group-clear {
      margin-left: auto;
      background: none;
      border: none;
      color: var(--text-dim);
      font-size: 14px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }

    .nc-group-clear:hover {
      color: var(--text-primary);
      background: rgba(255,255,255,0.05);
    }

    /* ── Item ── */
    .nc-item {
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.04);
      margin-bottom: 4px;
      transition: background 0.15s;
    }

    .nc-item:hover {
      background: rgba(255,255,255,0.04);
    }

    .nc-item-info { border-left: 3px solid var(--cyan, #00e5ff); }
    .nc-item-success { border-left: 3px solid #27C93F; }
    .nc-item-warning { border-left: 3px solid #FFBD2E; }
    .nc-item-error { border-left: 3px solid #FF5F56; }

    .nc-item-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .nc-item-icon {
      font-size: 14px;
      flex-shrink: 0;
    }

    .nc-item-title {
      flex: 1;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nc-item-time {
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--text-dim);
      flex-shrink: 0;
    }

    .nc-item-body {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.5;
      margin-top: 4px;
      padding-left: 20px;
    }
  `;
  document.head.appendChild(s);
}
