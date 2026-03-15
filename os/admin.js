// TapasOS Admin Mode — OAuth, JWT, mode switching, inline editing

const CF_WORKER_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://tapasos-auth.tapas-patra.workers.dev';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://tapasos-api.onrender.com';

let adminToken = null; // JWT in memory only — never localStorage
let isAdmin = false;
let refreshTimer = null;

// ── Init ──
export function initAdmin() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      if (isAdmin) {
        logout();
      } else {
        showLoginModal();
      }
    }
  });

  // Try silent refresh on load (if refresh cookie exists)
  silentRefresh();
}

// ── Login Modal ──
function showLoginModal() {
  if (document.getElementById('admin-login-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'admin-login-modal';
  modal.innerHTML = `
    <div class="admin-modal-backdrop"></div>
    <div class="admin-modal-content">
      <button class="admin-modal-close" id="admin-modal-close">\u2715</button>
      <div class="admin-modal-body">
        <div style="font-family:var(--font-display);font-size:16px;font-weight:700;margin-bottom:12px;">Admin Login</div>
        <button class="admin-github-btn" id="admin-github-login">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          Login with GitHub
        </button>
        <div class="admin-login-status" id="admin-login-status"></div>
      </div>
    </div>
  `;

  injectAdminStyles();
  document.body.appendChild(modal);

  document.getElementById('admin-modal-close').addEventListener('click', closeLoginModal);
  modal.querySelector('.admin-modal-backdrop').addEventListener('click', closeLoginModal);
  document.getElementById('admin-github-login').addEventListener('click', startOAuthFlow);
}

function closeLoginModal() {
  document.getElementById('admin-login-modal')?.remove();
}

// ── OAuth Flow ──
function startOAuthFlow() {
  const status = document.getElementById('admin-login-status');
  if (status) status.textContent = 'Opening GitHub...';

  // Generate state for CSRF protection
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth-state', state);

  // Open OAuth popup
  const width = 500, height = 700;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;
  const popup = window.open(
    `${CF_WORKER_BASE}/auth/login?state=${state}`,
    'TapasOS Admin Login',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes`
  );

  // Listen for callback message from popup
  window.addEventListener('message', function handler(e) {
    if (e.origin !== CF_WORKER_BASE && e.origin !== window.location.origin) return;

    const data = e.data;
    if (data.type === 'oauth-callback') {
      window.removeEventListener('message', handler);
      popup?.close();

      if (data.error) {
        if (status) {
          status.textContent = data.error;
          status.style.color = 'var(--traffic-close)';
        }
        return;
      }

      // Validate state
      const savedState = sessionStorage.getItem('oauth-state');
      if (data.state !== savedState) {
        if (status) {
          status.textContent = 'Security validation failed. Try again.';
          status.style.color = 'var(--traffic-close)';
        }
        return;
      }

      sessionStorage.removeItem('oauth-state');
      adminToken = data.token;
      enterAdminMode();
      closeLoginModal();
    }
  });
}

// ── Admin Mode ──
function enterAdminMode() {
  isAdmin = true;
  document.getElementById('menubar')?.classList.add('admin-mode');
  document.body.classList.add('tapasos-admin');

  // Schedule token refresh (every 13 minutes for 15-min expiry)
  refreshTimer = setInterval(silentRefresh, 13 * 60 * 1000);

  addEditControls();
}

function exitAdminMode() {
  isAdmin = false;
  adminToken = null;
  document.getElementById('menubar')?.classList.remove('admin-mode');
  document.body.classList.remove('tapasos-admin');

  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  removeEditControls();
}

async function logout() {
  try {
    await fetch(`${CF_WORKER_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch { /* best effort */ }
  exitAdminMode();
}

async function silentRefresh() {
  try {
    const resp = await fetch(`${CF_WORKER_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (resp.ok) {
      const data = await resp.json();
      adminToken = data.token;
      if (!isAdmin) enterAdminMode();
    }
  } catch { /* no valid refresh cookie */ }
}

// ── Admin API helper ──
export async function adminFetch(path, options = {}) {
  if (!adminToken) throw new Error('Not authenticated');
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
      ...(options.headers || {}),
    },
  });
  if (resp.status === 401) {
    // Token expired — try refresh
    await silentRefresh();
    if (!adminToken) {
      exitAdminMode();
      throw new Error('Session expired');
    }
    // Retry with new token
    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        ...(options.headers || {}),
      },
    });
  }
  return resp;
}

export function getAdminToken() {
  return adminToken;
}

export function isAdminMode() {
  return isAdmin;
}

// ── Inline Edit Controls ──
function addEditControls() {
  // Add admin debug panel to AI chat if it's open
  const aiBody = document.getElementById('app-body-ai-assistant');
  if (aiBody && !aiBody.querySelector('.admin-debug-panel')) {
    const panel = document.createElement('div');
    panel.className = 'admin-debug-panel';
    panel.innerHTML = `
      <div class="admin-debug-title">Admin Debug</div>
      <div class="admin-debug-row"><span>Provider:</span><span id="admin-provider">Loading...</span></div>
      <div class="admin-debug-row"><span>Status:</span><span id="admin-api-status">Checking...</span></div>
      <button class="admin-debug-btn" id="admin-reindex-btn">Trigger RAG Reindex</button>
    `;
    aiBody.prepend(panel);

    // Fetch provider info
    fetch(`${API_BASE}/health`).then(r => r.json()).then(d => {
      const provEl = document.getElementById('admin-provider');
      const statusEl = document.getElementById('admin-api-status');
      if (provEl) provEl.textContent = `${d.provider} (embed: ${d.embed_provider})`;
      if (statusEl) { statusEl.textContent = d.status; statusEl.style.color = 'var(--cyan)'; }
    }).catch(() => {
      const statusEl = document.getElementById('admin-api-status');
      if (statusEl) { statusEl.textContent = 'Offline'; statusEl.style.color = 'var(--traffic-close)'; }
    });

    document.getElementById('admin-reindex-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('admin-reindex-btn');
      btn.textContent = 'Reindexing...';
      btn.disabled = true;
      try {
        const resp = await adminFetch('/admin/reindex', {
          method: 'POST',
          body: JSON.stringify({ sources: ['all'] }),
        });
        const data = await resp.json();
        btn.textContent = `Done! ${data.chunks_indexed || 0} chunks indexed`;
      } catch {
        btn.textContent = 'Reindex failed';
      }
      setTimeout(() => { btn.textContent = 'Trigger RAG Reindex'; btn.disabled = false; }, 3000);
    });
  }
}

function removeEditControls() {
  document.querySelectorAll('.admin-debug-panel').forEach(el => el.remove());
  document.querySelectorAll('.admin-edit-btn').forEach(el => el.remove());
}

// ── Styles ──
function injectAdminStyles() {
  if (document.getElementById('admin-styles')) return;
  const s = document.createElement('style');
  s.id = 'admin-styles';
  s.textContent = `
    .admin-modal-backdrop {
      position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:15000;
    }
    .admin-modal-content {
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      background:var(--bg-surface); border:1px solid var(--glass-border);
      border-radius:14px; padding:32px; z-index:15001; min-width:320px;
      box-shadow:0 16px 48px rgba(0,0,0,0.5);
    }
    .admin-modal-close {
      position:absolute; top:12px; right:14px; background:none; border:none;
      color:var(--text-dim); cursor:pointer; font-size:16px;
    }
    .admin-modal-body { text-align:center; }
    .admin-github-btn {
      display:inline-flex; align-items:center; gap:8px;
      background:#24292e; color:#fff; border:none; padding:10px 20px;
      border-radius:8px; font-size:13px; font-family:var(--font-body);
      cursor:pointer; transition:background 0.2s; margin-top:8px;
    }
    .admin-github-btn:hover { background:#2f363d; }
    .admin-login-status {
      font-size:11px; color:var(--text-muted); margin-top:12px;
      font-family:var(--font-mono);
    }

    /* Debug panel */
    .admin-debug-panel {
      background:rgba(217,119,6,0.08); border:1px solid rgba(217,119,6,0.2);
      border-radius:8px; padding:10px 14px; margin:8px; font-size:11px;
    }
    .admin-debug-title {
      font-size:10px; text-transform:uppercase; letter-spacing:1px;
      color:#D97706; font-weight:600; margin-bottom:6px;
    }
    .admin-debug-row {
      display:flex; justify-content:space-between; color:var(--text-muted);
      padding:2px 0; font-family:var(--font-mono);
    }
    .admin-debug-btn {
      margin-top:8px; background:rgba(217,119,6,0.15); border:1px solid rgba(217,119,6,0.3);
      color:#D97706; padding:4px 12px; border-radius:5px; font-size:10px;
      cursor:pointer; font-family:var(--font-body); width:100%;
    }
    .admin-debug-btn:hover { background:rgba(217,119,6,0.25); }
    .admin-debug-btn:disabled { opacity:0.5; cursor:default; }
  `;
  document.head.appendChild(s);
}
