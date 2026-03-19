// TapasOS MCP Client — WebSocket bridge to the MCP server
// Receives commands from the server, executes via __tapasos_* bridges, returns results

const WS_LOCAL = 'ws://localhost:3100';
const WS_LOCAL_SAME = 'ws://localhost:8000/ws';
const WS_REMOTE = 'wss://tapasos-mcp.onrender.com/ws';

let ws = null;
let reconnectTimer = null;
let reconnectDelay = 2000;
let connected = false;
let statusEl = null;

// ── Connection Status ──
function updateStatus(isConnected) {
  connected = isConnected;
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.className = 'mcp-status-dot';
    statusEl.title = 'MCP Connection';
    const right = document.querySelector('.menubar-right');
    if (right) right.prepend(statusEl);
  }
  statusEl.classList.toggle('connected', isConnected);
  statusEl.title = isConnected ? 'MCP: Connected' : 'MCP: Disconnected';
}

// ── Connect ──
function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  // Try remote first (deployed MCP server), fallback to local
  const url = WS_REMOTE;
  try {
    ws = new WebSocket(url);
  } catch {
    tryLocal();
    return;
  }

  ws.onopen = () => {
    console.log('[MCP] Connected to', url);
    updateStatus(true);
    reconnectDelay = 2000;
  };

  ws.onmessage = (e) => {
    try {
      const cmd = JSON.parse(e.data);
      handleCommand(cmd);
    } catch (err) {
      console.warn('[MCP] Invalid message:', err);
    }
  };

  ws.onclose = () => {
    console.log('[MCP] Disconnected');
    updateStatus(false);
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    // If remote fails, try local
    if (url === WS_REMOTE) {
      ws = null;
      tryLocal();
    }
  };
}

function tryLocal() {
  // Try local HTTP mode (same port /ws) first, then standalone WS port
  tryUrl(WS_LOCAL_SAME, () => tryUrl(WS_LOCAL, () => {
    updateStatus(false);
    scheduleReconnect();
  }));
}

function tryUrl(url, onFail) {
  let socket;
  try {
    socket = new WebSocket(url);
  } catch {
    onFail();
    return;
  }

  socket.onopen = () => {
    ws = socket;
    console.log('[MCP] Connected to', url);
    updateStatus(true);
    reconnectDelay = 2000;
  };

  socket.onmessage = (e) => {
    try {
      const cmd = JSON.parse(e.data);
      handleCommand(cmd);
    } catch (err) {
      console.warn('[MCP] Invalid message:', err);
    }
  };

  socket.onclose = () => {
    if (ws === socket) {
      updateStatus(false);
      ws = null;
      scheduleReconnect();
    }
  };

  socket.onerror = () => {
    if (ws !== socket) {
      socket = null;
      onFail();
    }
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
}

// ── Send Response ──
function respond(id, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ id, success: true, data }));
  }
}

function respondError(id, error) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ id, success: false, error }));
  }
}

// ── Command Handler ──
async function handleCommand(cmd) {
  const { id, action, params } = cmd;
  if (!id || !action) return;

  try {
    const result = await executeAction(action, params || {});
    respond(id, result);
  } catch (err) {
    respondError(id, err.message || String(err));
  }
}

// ── Action Executor ──
// Maps MCP tool names to actual TapasOS operations
async function executeAction(action, params) {
  const openApp = window.__tapasos_openApp;
  const getWindows = window.__tapasos_getWindows;
  const getRegistry = window.__tapasos_getAppRegistry;
  const notifyFn = window.__tapasos_notify?.notify;

  switch (action) {
    // ── Apps ──
    case 'open_app': {
      const { app_name } = params;
      const registry = getRegistry?.() || [];
      const app = registry.find(a =>
        a.id === app_name ||
        a.title.toLowerCase().includes(app_name.toLowerCase()) ||
        a.id.replace(/-/g, ' ').includes(app_name.toLowerCase())
      );
      if (!app) return { message: `App "${app_name}" not found`, apps: registry.map(a => a.id) };
      openApp?.(app.id);
      return { message: `Opened ${app.title}`, app_id: app.id };
    }

    case 'close_app': {
      const { app_name } = params;
      const wins = getWindows?.();
      if (!wins) return { message: 'No windows open' };
      const registry = getRegistry?.() || [];
      const app = registry.find(a =>
        a.id === app_name ||
        a.title.toLowerCase().includes(app_name.toLowerCase())
      );
      const appId = app?.id || app_name;
      if (!wins.has(appId)) return { message: `"${app_name}" is not open` };
      // Close via the window's close button
      const winEl = wins.get(appId)?.el;
      if (winEl) {
        const closeBtn = winEl.querySelector('.win-close');
        if (closeBtn) closeBtn.click();
        return { message: `Closed ${app?.title || app_name}` };
      }
      return { message: `Could not close "${app_name}"` };
    }

    case 'minimize_app': {
      const { app_name } = params;
      const wins = getWindows?.();
      const registry = getRegistry?.() || [];
      const app = registry.find(a =>
        a.id === app_name ||
        a.title.toLowerCase().includes(app_name.toLowerCase())
      );
      const appId = app?.id || app_name;
      if (!wins?.has(appId)) return { message: `"${app_name}" is not open` };
      const winEl = wins.get(appId)?.el;
      if (winEl) {
        const minBtn = winEl.querySelector('.win-minimize');
        if (minBtn) minBtn.click();
        return { message: `Minimized ${app?.title || app_name}` };
      }
      return { message: `Could not minimize "${app_name}"` };
    }

    case 'maximize_app': {
      const { app_name } = params;
      const wins = getWindows?.();
      const registry = getRegistry?.() || [];
      const app = registry.find(a =>
        a.id === app_name ||
        a.title.toLowerCase().includes(app_name.toLowerCase())
      );
      const appId = app?.id || app_name;
      if (!wins?.has(appId)) return { message: `"${app_name}" is not open` };
      const winEl = wins.get(appId)?.el;
      if (winEl) {
        const maxBtn = winEl.querySelector('.win-maximize');
        if (maxBtn) maxBtn.click();
        return { message: `Maximized ${app?.title || app_name}` };
      }
      return { message: `Could not maximize "${app_name}"` };
    }

    case 'close_all_apps': {
      const wins = getWindows?.();
      if (!wins || wins.size === 0) return { message: 'No windows open' };
      const closed = [];
      for (const [appId, entry] of wins) {
        const closeBtn = entry.el?.querySelector('.win-close');
        if (closeBtn) { closeBtn.click(); closed.push(appId); }
      }
      return { message: `Closed ${closed.length} windows`, closed };
    }

    case 'list_apps': {
      const registry = getRegistry?.() || [];
      return { apps: registry.map(a => ({ id: a.id, title: a.title, icon: a.icon, desc: a.desc })) };
    }

    case 'search_apps': {
      const { query } = params;
      const registry = getRegistry?.() || [];
      const results = registry.filter(a =>
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.id.includes(query.toLowerCase()) ||
        (a.desc || '').toLowerCase().includes(query.toLowerCase())
      );
      return { results: results.map(a => ({ id: a.id, title: a.title, icon: a.icon, desc: a.desc })) };
    }

    // ── System ──
    case 'change_wallpaper': {
      const { wallpaper_id } = params;
      const { setWallpaper, WALLPAPERS } = await import('./wallpaper.js');
      const wp = WALLPAPERS.find(w => w.id === wallpaper_id || w.label.toLowerCase().includes(wallpaper_id.toLowerCase()));
      if (!wp) return { message: `Wallpaper "${wallpaper_id}" not found`, available: WALLPAPERS.map(w => w.id) };
      setWallpaper(wp.id);
      return { message: `Wallpaper changed to ${wp.label}` };
    }

    case 'set_brightness': {
      const { level } = params;
      const val = Math.max(50, Math.min(100, Number(level)));
      localStorage.setItem('tapasos-brightness', String(val));
      const desktop = document.getElementById('desktop');
      if (desktop) desktop.style.filter = val < 100 ? `brightness(${val / 100})` : '';
      return { message: `Brightness set to ${val}%`, brightness: val };
    }

    case 'set_volume': {
      const { level } = params;
      const { setVolume } = await import('./sounds.js');
      setVolume(Number(level));
      return { message: `Volume set to ${level}%`, volume: Number(level) };
    }

    case 'toggle_sound': {
      const { toggleMute, isMuted } = await import('./sounds.js');
      toggleMute();
      const muted = isMuted();
      return { message: muted ? 'Sound muted' : 'Sound unmuted', muted };
    }

    case 'toggle_wifi': {
      const tile = document.querySelector('[data-toggle="wifi"]');
      if (tile) { tile.click(); return { message: 'Wi-Fi toggled' }; }
      return { message: 'Wi-Fi toggle not available — open Control Center first' };
    }

    case 'lock_screen': {
      const { lockNow } = await import('./lock-screen.js');
      lockNow();
      return { message: 'Screen locked' };
    }

    // ── Desktop ──
    case 'create_folder': {
      const { name } = params;
      const desktop = document.getElementById('desktop');
      const rect = desktop.getBoundingClientRect();
      const folders = JSON.parse(localStorage.getItem('tapasos-desktop-folders') || '[]');
      const id = 'folder-' + Date.now();
      const x = 100 + (folders.length % 5) * 100;
      const y = 100 + Math.floor(folders.length / 5) * 100;
      folders.push({ id, name: name || 'Untitled Folder', x: Math.min(x, rect.width - 80), y: Math.min(y, rect.height - 80) });
      localStorage.setItem('tapasos-desktop-folders', JSON.stringify(folders));
      window.__tapasos_renderFolders?.();
      return { message: `Folder "${name || 'Untitled Folder'}" created`, folder_id: id };
    }

    case 'delete_folder': {
      const { folder_name } = params;
      const folders = JSON.parse(localStorage.getItem('tapasos-desktop-folders') || '[]');
      const folder = folders.find(f => f.name.toLowerCase() === folder_name.toLowerCase() || f.id === folder_name);
      if (!folder) return { message: `Folder "${folder_name}" not found` };
      // Move to trash
      const trash = JSON.parse(localStorage.getItem('tapasos-trash') || '[]');
      trash.unshift({ type: 'folder', id: folder.id, name: folder.name, x: folder.x, y: folder.y, deletedAt: Date.now() });
      localStorage.setItem('tapasos-trash', JSON.stringify(trash));
      const remaining = folders.filter(f => f.id !== folder.id);
      localStorage.setItem('tapasos-desktop-folders', JSON.stringify(remaining));
      window.__tapasos_renderFolders?.();
      return { message: `Folder "${folder.name}" moved to Trash` };
    }

    case 'empty_trash': {
      localStorage.setItem('tapasos-trash', '[]');
      return { message: 'Trash emptied' };
    }

    // ── Navigation ──
    case 'open_url': {
      const { url } = params;
      openApp?.('browser');
      // Wait for browser app to render, then set URL
      setTimeout(() => {
        const input = document.querySelector('.brw-url-input');
        if (input) {
          input.value = url;
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
      }, 500);
      return { message: `Opening ${url} in Browser` };
    }

    case 'create_note': {
      const { title, content } = params;
      openApp?.('notes');
      // Add note to localStorage
      const notes = JSON.parse(localStorage.getItem('tapasos-notes') || '[]');
      notes.unshift({ id: Date.now(), title: title || 'Untitled', body: content || '', createdAt: Date.now(), updatedAt: Date.now() });
      localStorage.setItem('tapasos-notes', JSON.stringify(notes));
      return { message: `Note "${title || 'Untitled'}" created` };
    }

    case 'show_notification': {
      const { title, message } = params;
      if (notifyFn) notifyFn(title, message, { icon: '\uD83D\uDD14', duration: 5000, app: 'MCP' });
      return { message: `Notification shown: ${title}` };
    }

    case 'open_spotlight': {
      // Simulate Alt+K
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', altKey: true, bubbles: true }));
      return { message: 'Spotlight opened' };
    }

    case 'toggle_mission_control': {
      // Simulate F3
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3', bubbles: true }));
      return { message: 'Mission Control toggled' };
    }

    // ── Info ──
    case 'get_system_info': {
      const { getWallpaperId } = await import('./wallpaper.js');
      const { isMuted, getVolume } = await import('./sounds.js');
      const { isOnline } = await import('./control-center.js');
      const wins = getWindows?.();
      const bright = localStorage.getItem('tapasos-brightness') || '100';
      return {
        wallpaper: getWallpaperId(),
        brightness: Number(bright),
        volume: getVolume(),
        muted: isMuted(),
        wifi: isOnline(),
        open_windows: wins ? wins.size : 0,
        total_apps: (getRegistry?.() || []).length,
      };
    }

    case 'get_open_windows': {
      const wins = getWindows?.();
      if (!wins || wins.size === 0) return { windows: [] };
      const registry = getRegistry?.() || [];
      const list = [];
      for (const [appId, entry] of wins) {
        const app = registry.find(a => a.id === appId);
        list.push({ id: appId, title: app?.title || appId, state: entry.state || 'normal' });
      }
      return { windows: list };
    }

    default:
      return { message: `Unknown action: ${action}` };
  }
}

// ── Public API ──
export function initMcpClient() {
  connect();
}

export function isMcpConnected() {
  return connected;
}
