// TapasOS Notification Center — macOS-style notification toasts

let notificationQueue = [];
let activeNotifications = [];
let notifId = 0;

export function initNotifications() {
  injectStyles();

  // Add notification center container
  const container = document.createElement('div');
  container.id = 'notification-center';
  document.body.appendChild(container);
}

export function notify(title, body = '', { icon = '', duration = 4000, type = 'info', onClick = null } = {}) {
  notifId++;
  const id = notifId;

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

  // Close button
  el.querySelector('.notif-close').addEventListener('click', (e) => {
    e.stopPropagation();
    dismissNotification(id);
  });

  // Click action
  if (onClick) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      if (e.target.closest('.notif-close')) return;
      onClick();
      dismissNotification(id);
    });
  }

  const container = document.getElementById('notification-center');
  container.appendChild(el);
  activeNotifications.push({ id, el });

  // Animate in
  requestAnimationFrame(() => el.classList.add('notif-visible'));

  // Auto-dismiss
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

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function injectStyles() {
  if (document.getElementById('notif-styles')) return;
  const s = document.createElement('style');
  s.id = 'notif-styles';
  s.textContent = `
    #notification-center {
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
      flex:1; font-size:13px; font-weight:600; color:var(--text-primary, #e4e4e7);
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .notif-time { font-size:10px; color:var(--text-dim, #52525b); flex-shrink:0; }
    .notif-close {
      background:none; border:none; color:var(--text-dim, #52525b); font-size:14px;
      cursor:pointer; padding:0 2px; line-height:1; flex-shrink:0;
      transition:color 0.15s;
    }
    .notif-close:hover { color:var(--text-primary, #e4e4e7); }

    .notif-body {
      font-size:12px; color:var(--text-muted, #a1a1aa); line-height:1.5;
      margin-top:6px; padding-left:24px;
    }

    /* Type accents */
    .notif-info { border-left:3px solid var(--cyan, #00e5ff); }
    .notif-success { border-left:3px solid #27C93F; }
    .notif-warning { border-left:3px solid #FFBD2E; }
    .notif-error { border-left:3px solid #FF5F56; }
  `;
  document.head.appendChild(s);
}
