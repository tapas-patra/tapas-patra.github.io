// TapasOS Desktop — Window Manager, Dock, Particles, Context Menu

import { setActiveAppName } from './menubar.js';

// ── State ──
const windows = new Map();     // appId -> { el, state, preMax }
const zStack = [];             // window elements ordered by z-index
let zCounter = 100;
let cascadeOffset = 0;

// ── App Registry ──
const APP_REGISTRY = [
  { id: 'ai-assistant', title: 'Tapas.ai',          icon: '\uD83E\uDD16', dock: true, default: false, width: 760, height: 560 },
  { id: 'projects',     title: 'Projects.finder',    icon: '\uD83D\uDCC2', dock: true, default: false, width: 800, height: 560 },
  { id: 'skills',       title: 'Skills.app',         icon: '\u26A1',       dock: true, default: false, width: 700, height: 500 },
  { id: 'activity',     title: 'Activity.monitor',   icon: '\uD83D\uDCC8', dock: true, default: false, width: 820, height: 540 },
  { id: 'awards',       title: 'Awards.app',         icon: '\uD83C\uDFC6', dock: true, default: false, width: 700, height: 500 },
  { id: 'resume',       title: 'Resume.app',         icon: '\uD83D\uDCC4', dock: true, default: false, width: 640, height: 500 },
  { id: 'terminal',     title: 'Terminal.app',       icon: '\u2328\uFE0F', dock: true, default: false, width: 720, height: 460 },
  { id: 'contact',      title: 'Contact.app',        icon: '\uD83D\uDCEC', dock: true, default: false, width: 640, height: 460 },
  { id: 'classic',      title: 'Classic.view',       icon: '\uD83C\uDF10', dock: true, default: false, width: 900, height: 600 },
];

// ── Init ──
export function initDesktop() {
  try { initParticles(); } catch(e) { console.warn('Particles failed:', e); }
  initDock();
  initContextMenu();
  initKeyboardShortcuts();
}

// Open default apps after boot — with welcome splash
export function openDefaults() {
  // Show cinematic welcome, then open apps
  showWelcomeSplash(() => {
    animateDockEntrance();
    const defaults = APP_REGISTRY.filter(a => a.default);
    defaults.forEach(app => openApp(app.id));
  });
}

// ── Public API ──
export function openApp(appId) {
  const existing = windows.get(appId);
  if (existing) {
    // If minimized, restore
    if (existing.state === 'minimized') {
      restoreWindow(appId);
    }
    focusWindow(appId);
    return;
  }

  const appDef = APP_REGISTRY.find(a => a.id === appId);
  if (!appDef) return;

  createWindow(appDef);
}

export function getAppRegistry() {
  return APP_REGISTRY;
}

// ── Window Creation ──
function createWindow(appDef) {
  const { id, title, icon, width, height } = appDef;

  const desktop = document.getElementById('desktop');
  const deskRect = desktop.getBoundingClientRect();

  // Cascade position
  const x = Math.max(40, (deskRect.width - width) / 2 + cascadeOffset);
  const y = Math.max(20, (deskRect.height - height) / 2 + cascadeOffset);
  cascadeOffset = (cascadeOffset + 30) % 150;

  const win = document.createElement('div');
  win.className = 'window focused';
  win.dataset.appId = id;
  win.style.left = x + 'px';
  win.style.top = y + 'px';
  win.style.width = width + 'px';
  win.style.height = height + 'px';
  win.style.zIndex = ++zCounter;

  win.innerHTML = `
    <div class="window-titlebar">
      <div class="window-titlebar-left">
        <span class="window-icon">${icon}</span>
        <span class="window-title">${title}</span>
      </div>
      <div class="window-traffic-lights">
        <button class="traffic-light close" title="Close"></button>
        <button class="traffic-light minimize" title="Minimize"></button>
        <button class="traffic-light maximize" title="Maximize"></button>
      </div>
    </div>
    <div class="window-body" id="app-body-${id}">
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-family:var(--font-mono);font-size:13px;">
        ${title} — loading...
      </div>
    </div>
    <div class="resize-handle n"></div>
    <div class="resize-handle s"></div>
    <div class="resize-handle e"></div>
    <div class="resize-handle w"></div>
    <div class="resize-handle ne"></div>
    <div class="resize-handle nw"></div>
    <div class="resize-handle se"></div>
    <div class="resize-handle sw"></div>
  `;

  desktop.appendChild(win);
  animateWindowOpen(win);

  windows.set(id, { el: win, state: 'normal', preMax: null });
  zStack.push(win);
  focusWindow(id);

  // Bind events
  bindTitlebarDrag(win);
  bindResizeHandles(win);
  bindTrafficLights(win, id);
  win.addEventListener('mousedown', () => focusWindow(id));

  // Dock active dot
  updateDockDot(id, true);

  // Bounce dock icon
  const dockItem = document.querySelector(`.dock-item[data-app="${id}"]`);
  if (dockItem) {
    dockItem.classList.add('bouncing');
    setTimeout(() => dockItem.classList.remove('bouncing'), 700);
  }

  // Load app module
  loadAppContent(id);
}

async function loadAppContent(appId) {
  try {
    const mod = await import(`../apps/${appId}.js`);
    if (mod.init) {
      mod.init(document.getElementById(`app-body-${appId}`));
    }
  } catch {
    // App module not built yet — show placeholder
    const body = document.getElementById(`app-body-${appId}`);
    if (body) {
      const appDef = APP_REGISTRY.find(a => a.id === appId);
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;color:var(--text-muted);font-family:var(--font-mono);font-size:13px;">
          <span style="font-size:48px;">${appDef?.icon || ''}</span>
          <span>${appDef?.title || appId}</span>
          <span style="font-size:11px;color:var(--text-dim);">Coming in Phase 2+</span>
        </div>
      `;
    }
  }
}

// ── Focus / Z-Index ──
function focusWindow(appId) {
  const entry = windows.get(appId);
  if (!entry) return;

  // Unfocus all
  windows.forEach((w) => {
    w.el.classList.remove('focused');
    w.el.classList.add('window-unfocused');
  });

  // Focus target
  entry.el.classList.add('focused');
  entry.el.classList.remove('window-unfocused');
  entry.el.style.zIndex = ++zCounter;

  // Update menubar
  const appDef = APP_REGISTRY.find(a => a.id === appId);
  setActiveAppName(appDef?.title || '');
}

// ── Drag ──
function bindTitlebarDrag(win) {
  const titlebar = win.querySelector('.window-titlebar');
  let dragging = false;
  let startX, startY, origLeft, origTop;

  titlebar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.traffic-light')) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origLeft = win.offsetLeft;
    origTop = win.offsetTop;
    win.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    win.style.left = (origLeft + dx) + 'px';
    win.style.top = (origTop + dy) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      win.style.transition = '';
    }
  });
}

// ── Resize ──
function bindResizeHandles(win) {
  const handles = win.querySelectorAll('.resize-handle');

  handles.forEach(handle => {
    let resizing = false;
    let startX, startY, origW, origH, origLeft, origTop;
    const dirs = handle.className.replace('resize-handle ', '');

    handle.addEventListener('mousedown', (e) => {
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      origW = win.offsetWidth;
      origH = win.offsetHeight;
      origLeft = win.offsetLeft;
      origTop = win.offsetTop;
      win.style.transition = 'none';
      e.preventDefault();
      e.stopPropagation();

      const onMove = (e2) => {
        if (!resizing) return;
        const dx = e2.clientX - startX;
        const dy = e2.clientY - startY;

        let newW = origW, newH = origH, newL = origLeft, newT = origTop;

        if (dirs.includes('e')) newW = Math.max(320, origW + dx);
        if (dirs.includes('w')) { newW = Math.max(320, origW - dx); newL = origLeft + (origW - newW); }
        if (dirs.includes('s')) newH = Math.max(200, origH + dy);
        if (dirs.includes('n')) { newH = Math.max(200, origH - dy); newT = origTop + (origH - newH); }

        win.style.width = newW + 'px';
        win.style.height = newH + 'px';
        win.style.left = newL + 'px';
        win.style.top = newT + 'px';
      };

      const onUp = () => {
        resizing = false;
        win.style.transition = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

// ── Traffic Lights ──
function bindTrafficLights(win, appId) {
  win.querySelector('.traffic-light.close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeWindow(appId);
  });

  win.querySelector('.traffic-light.minimize').addEventListener('click', (e) => {
    e.stopPropagation();
    minimizeWindow(appId);
  });

  win.querySelector('.traffic-light.maximize').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMaximize(appId);
  });
}

function closeWindow(appId) {
  const entry = windows.get(appId);
  if (!entry) return;

  entry.el.remove();
  windows.delete(appId);
  updateDockDot(appId, false);

  // Focus next window
  const remaining = [...windows.values()].filter(w => w.state !== 'minimized');
  if (remaining.length > 0) {
    const last = remaining[remaining.length - 1];
    const lastId = last.el.dataset.appId;
    focusWindow(lastId);
  } else {
    setActiveAppName('');
  }
}

function minimizeWindow(appId) {
  const entry = windows.get(appId);
  if (!entry || entry.state === 'minimized') return;

  // Animate to dock
  const dockItem = document.querySelector(`.dock-item[data-app="${appId}"]`);
  if (dockItem) {
    const dockRect = dockItem.getBoundingClientRect();
    const winRect = entry.el.getBoundingClientRect();
    const desktop = document.getElementById('desktop');
    const deskRect = desktop.getBoundingClientRect();

    const targetX = dockRect.left + dockRect.width / 2 - winRect.width / 2 - deskRect.left;
    const targetY = dockRect.top - deskRect.top;

    entry.el.style.transformOrigin = 'center bottom';
    entry.el.classList.add('minimizing');
    entry.el.style.transform = `translate(${targetX - winRect.left + deskRect.left}px, ${targetY - winRect.top + deskRect.top}px) scale(0.15)`;
  }

  entry.state = 'minimized';

  setTimeout(() => {
    entry.el.style.display = 'none';
    entry.el.classList.remove('minimizing');
    entry.el.style.transform = '';

    // Focus next
    const remaining = [...windows.values()].filter(w => w.state !== 'minimized');
    if (remaining.length > 0) {
      const last = remaining[remaining.length - 1];
      focusWindow(last.el.dataset.appId);
    } else {
      setActiveAppName('');
    }
  }, 400);
}

function restoreWindow(appId) {
  const entry = windows.get(appId);
  if (!entry || entry.state !== 'minimized') return;

  entry.el.style.display = '';
  entry.state = 'normal';
  focusWindow(appId);
}

function toggleMaximize(appId) {
  const entry = windows.get(appId);
  if (!entry) return;

  const desktop = document.getElementById('desktop');
  const deskRect = desktop.getBoundingClientRect();

  if (entry.state === 'maximized') {
    // Restore
    const pm = entry.preMax;
    entry.el.style.left = pm.left + 'px';
    entry.el.style.top = pm.top + 'px';
    entry.el.style.width = pm.width + 'px';
    entry.el.style.height = pm.height + 'px';
    entry.el.classList.remove('maximized');
    entry.state = 'normal';
    entry.preMax = null;
  } else {
    // Maximize
    entry.preMax = {
      left: entry.el.offsetLeft,
      top: entry.el.offsetTop,
      width: entry.el.offsetWidth,
      height: entry.el.offsetHeight,
    };
    entry.el.style.left = '0px';
    entry.el.style.top = '0px';
    entry.el.style.width = deskRect.width + 'px';
    entry.el.style.height = deskRect.height + 'px';
    entry.el.classList.add('maximized');
    entry.state = 'maximized';
  }
}

// ── Dock ──
function initDock() {
  const dock = document.getElementById('dock');
  if (!dock) return;

  APP_REGISTRY.filter(a => a.dock).forEach(app => {
    const item = document.createElement('div');
    item.className = 'dock-item';
    item.dataset.app = app.id;
    item.innerHTML = `
      <div class="dock-tooltip">${app.title}</div>
      <div class="dock-icon">${app.icon}</div>
      <div class="dock-dot"></div>
    `;
    item.addEventListener('click', () => openApp(app.id));
    dock.appendChild(item);
  });
}

function updateDockDot(appId, isOpen) {
  const item = document.querySelector(`.dock-item[data-app="${appId}"]`);
  if (item) {
    item.classList.toggle('active', isOpen);
  }
}

// ── Context Menu ──
function initContextMenu() {
  const menu = document.getElementById('context-menu');
  const desktop = document.getElementById('desktop');

  // Desktop background right-click
  desktop.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.window') || e.target.closest('#dock')) return;
    e.preventDefault();
    showContextMenu(e, [
      { label: 'About TapasOS', action: () => showAboutDialog() },
      { label: 'App Launcher', shortcut: '\u2318Space', action: () => openSpotlight() },
      { type: 'separator' },
      ...APP_REGISTRY.map(app => ({
        label: `Open ${app.title}`,
        icon: app.icon,
        action: () => openApp(app.id),
      })),
      { type: 'separator' },
      { label: 'Refresh Desktop', shortcut: '\u2318R', action: () => location.reload() },
    ]);
  });

  // Dock right-click
  document.getElementById('dock').addEventListener('contextmenu', (e) => {
    const dockItem = e.target.closest('.dock-item');
    e.preventDefault();

    if (dockItem) {
      // Right-click on a specific dock icon
      const appId = dockItem.dataset.app;
      const appDef = APP_REGISTRY.find(a => a.id === appId);
      const isOpen = windows.has(appId);
      const isMinimized = isOpen && windows.get(appId).state === 'minimized';

      const items = [
        { label: appDef.title, disabled: true, icon: appDef.icon },
        { type: 'separator' },
        { label: isOpen ? 'Show' : 'Open', action: () => openApp(appId) },
      ];
      if (isOpen && !isMinimized) {
        items.push({ label: 'Minimize', action: () => minimizeWindow(appId) });
      }
      if (isOpen) {
        items.push({ label: 'Close', action: () => closeWindow(appId) });
      }
      items.push({ type: 'separator' });
      items.push({ label: 'Close All Windows', action: () => closeAllWindows() });
      showContextMenu(e, items);
    } else {
      // Right-click on dock background
      showContextMenu(e, [
        { label: 'Open All Apps', action: () => APP_REGISTRY.forEach(a => openApp(a.id)) },
        { label: 'Minimize All', action: () => minimizeAllWindows() },
        { type: 'separator' },
        { label: 'Close All Windows', action: () => closeAllWindows() },
      ]);
    }
  });

  // Window titlebar right-click
  desktop.addEventListener('contextmenu', (e) => {
    const titlebar = e.target.closest('.window-titlebar');
    if (!titlebar) return;
    e.preventDefault();
    e.stopPropagation();

    const win = titlebar.closest('.window');
    const appId = win.dataset.appId;
    const appDef = APP_REGISTRY.find(a => a.id === appId);
    const winData = windows.get(appId);

    showContextMenu(e, [
      { label: appDef ? appDef.title : appId, disabled: true, icon: appDef?.icon },
      { type: 'separator' },
      { label: 'Minimize', action: () => minimizeWindow(appId) },
      { label: winData?.state === 'maximized' ? 'Restore' : 'Maximize', action: () => toggleMaximize(appId) },
      { type: 'separator' },
      { label: 'Close', shortcut: '\u2318W', action: () => closeWindow(appId) },
      { type: 'separator' },
      { label: 'Close All Windows', action: () => closeAllWindows() },
    ]);
  });

  document.addEventListener('click', () => menu.classList.remove('visible'));
  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('#desktop') && !e.target.closest('#dock')) {
      menu.classList.remove('visible');
    }
  });
}

function showContextMenu(e, items) {
  const menu = document.getElementById('context-menu');
  menu.innerHTML = '';

  items.forEach(item => {
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'context-menu-separator';
      menu.appendChild(sep);
    } else {
      const el = document.createElement('div');
      el.className = 'context-menu-item' + (item.disabled ? ' disabled' : '');
      el.innerHTML = `
        ${item.icon ? `<span>${item.icon}</span>` : ''}
        <span>${item.label}</span>
        ${item.shortcut ? `<span class="context-menu-shortcut">${item.shortcut}</span>` : ''}
      `;
      if (!item.disabled) {
        el.addEventListener('click', () => {
          menu.classList.remove('visible');
          item.action();
        });
      }
      menu.appendChild(el);
    }
  });

  // Make visible off-screen to measure height
  menu.style.left = '-9999px';
  menu.style.top = '-9999px';
  menu.classList.add('visible');

  const menuH = menu.offsetHeight;
  const menuW = menu.offsetWidth || 220;
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  // If menu would overflow bottom, open above the click point
  let top = e.clientY;
  if (top + menuH + 10 > winH) {
    top = e.clientY - menuH;
  }
  top = Math.max(4, Math.min(top, winH - menuH - 4));

  let left = e.clientX;
  left = Math.max(4, Math.min(left, winW - menuW - 4));

  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
}

function closeAllWindows() {
  for (const appId of [...windows.keys()]) {
    closeWindow(appId);
  }
}

function minimizeAllWindows() {
  for (const [appId, winData] of windows.entries()) {
    if (winData.state !== 'minimized') {
      minimizeWindow(appId);
    }
  }
}

function showAboutDialog() {
  const appId = '__about';
  if (windows.has(appId)) { focusWindow(appId); return; }

  const desktop = document.getElementById('desktop');
  const deskRect = desktop.getBoundingClientRect();
  const w = 380, h = 260;

  const win = document.createElement('div');
  win.className = 'window focused';
  win.dataset.appId = appId;
  win.style.left = ((deskRect.width - w) / 2) + 'px';
  win.style.top = ((deskRect.height - h) / 2) + 'px';
  win.style.width = w + 'px';
  win.style.height = h + 'px';
  win.style.zIndex = ++zCounter;
  win.style.minWidth = '300px';
  win.style.minHeight = '200px';

  win.innerHTML = `
    <div class="window-titlebar">
      <div class="window-titlebar-left">
        <span class="window-title">About TapasOS</span>
      </div>
      <div class="window-traffic-lights">
        <button class="traffic-light close" title="Close"></button>
        <button class="traffic-light minimize" title="Minimize"></button>
        <button class="traffic-light maximize" title="Maximize"></button>
      </div>
    </div>
    <div class="window-body" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;">
      <div style="font-family:var(--font-display);font-size:22px;font-weight:800;background:linear-gradient(135deg,var(--cyan),var(--violet-light));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">TapasOS</div>
      <div style="color:var(--text-muted);font-size:12px;">Version 2.0 — Portfolio Operating System</div>
      <div style="color:var(--text-muted);font-size:12px;line-height:1.6;">
        Built by Tapas Kumar Patra<br>
        HTML / CSS / Vanilla JS — No frameworks<br>
        AI-powered. Auto-updated. Open source.
      </div>
      <div style="color:var(--text-dim);font-size:11px;font-family:var(--font-mono);margin-top:8px;">tapas-patra.github.io</div>
    </div>
  `;

  desktop.appendChild(win);
  windows.set(appId, { el: win, state: 'normal', preMax: null });
  focusWindow(appId);
  bindTitlebarDrag(win);
  bindResizeHandles(win);
  bindTrafficLights(win, appId);
  win.addEventListener('mousedown', () => focusWindow(appId));
}

// ── Keyboard Shortcuts ──
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Cmd+W or Ctrl+W — close focused window
    if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
      e.preventDefault();
      const focused = [...windows.entries()].find(([, w]) => w.el.classList.contains('focused'));
      if (focused) closeWindow(focused[0]);
    }

    // Cmd+M or Ctrl+M — minimize focused window
    if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
      e.preventDefault();
      const focused = [...windows.entries()].find(([, w]) => w.el.classList.contains('focused'));
      if (focused) minimizeWindow(focused[0]);
    }

    // Cmd+Space or Ctrl+Space — App Launcher (Spotlight)
    if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
      e.preventDefault();
      toggleSpotlight();
    }

    // Escape — close context menu & spotlight
    if (e.key === 'Escape') {
      document.getElementById('context-menu')?.classList.remove('visible');
      closeSpotlight();
    }
  });
}

// ── Particle Mesh Wallpaper ──
function initParticles() {
  const canvas = document.getElementById('desktop-canvas');
  const desktopEl = document.getElementById('desktop');
  if (!canvas || !desktopEl) return;

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  let animId = null;
  let frame = 0;

  // ── Config ──
  const COUNT = 80;
  const CONNECT = 150;
  const HOVER_R = 200;
  const MIN_SPEED = 0.3;

  // ── Mouse state — tracked globally so hover works over windows too ──
  let mx = -9999, my = -9999;
  document.addEventListener('mousemove', e => {
    const r = desktopEl.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (x >= 0 && y >= 0 && x <= r.width && y <= r.height) {
      mx = x; my = y;
    } else {
      mx = -9999; my = -9999;
    }
  });
  document.addEventListener('mouseleave', () => { mx = -9999; my = -9999; });

  // ── Click ripples ──
  const ripples = [];
  desktopEl.addEventListener('click', e => {
    if (e.target.closest('.window') || e.target.closest('#context-menu')) return;
    const r = desktopEl.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    ripples.push({ x: cx, y: cy, radius: 0, life: 1 });
    particles.forEach(p => {
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 250 && d > 0) {
        const f = (1 - d / 250) * 3;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
    });
  });

  // ── Nebula blobs ──
  const nebulae = Array.from({ length: 4 }, () => ({
    x: Math.random(), y: Math.random(),
    r: 200 + Math.random() * 200,
    hue: Math.random() > 0.5 ? 190 : 270,
    speed: 0.0001 + Math.random() * 0.0002,
    phase: Math.random() * Math.PI * 2,
  }));

  // ── Shooting stars ──
  const stars = [];

  // ── Particles ──
  const particles = [];

  function resize() {
    const r = desktopEl.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W; canvas.height = H;
  }

  function createParticles() {
    particles.length = 0;
    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = MIN_SPEED + Math.random() * 0.3;
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        baseR: 0.5 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.7 ? 270 : 190,
        trail: [],
      });
    }
  }

  function draw() {
    frame++;
    ctx.clearRect(0, 0, W, H);

    // Nebulae
    for (const n of nebulae) {
      const t = frame * n.speed + n.phase;
      const nx = (n.x + Math.sin(t) * 0.15) * W;
      const ny = (n.y + Math.cos(t * 0.7) * 0.1) * H;
      const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
      g.addColorStop(0, `hsla(${n.hue},80%,50%,0.025)`);
      g.addColorStop(0.6, `hsla(${n.hue},60%,40%,0.01)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(nx - n.r, ny - n.r, n.r * 2, n.r * 2);
    }

    // Mouse glow
    if (mx > 0 && my > 0) {
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, HOVER_R);
      g.addColorStop(0, 'rgba(0,229,255,0.08)');
      g.addColorStop(0.4, 'rgba(124,58,237,0.04)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(mx, my, HOVER_R, 0, Math.PI * 2);
      ctx.fill();
    }

    // Connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < CONNECT) {
          const alpha = (1 - d / CONNECT) * 0.13;
          const pulse = 0.7 + Math.sin(frame * 0.02 + i * 0.5) * 0.3;
          ctx.strokeStyle = `rgba(0,229,255,${alpha * pulse})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Particles
    for (const p of particles) {
      const dx = p.x - mx, dy = p.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Hover interaction — lines + repulsion
      if (dist < HOVER_R && mx > 0) {
        const a = (1 - dist / HOVER_R) * 0.4;
        ctx.strokeStyle = `rgba(167,139,250,${a})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mx, my);
        ctx.stroke();
        const f = (1 - dist / HOVER_R) * 0.5;
        p.vx += (dx / dist) * f;
        p.vy += (dy / dist) * f;
      }

      // Dampen
      p.vx *= 0.988;
      p.vy *= 0.988;

      // Enforce minimum speed — particles must always drift
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd < MIN_SPEED) {
        if (spd > 0.001) {
          p.vx = (p.vx / spd) * MIN_SPEED;
          p.vy = (p.vy / spd) * MIN_SPEED;
        } else {
          const a = Math.random() * Math.PI * 2;
          p.vx = Math.cos(a) * MIN_SPEED;
          p.vy = Math.sin(a) * MIN_SPEED;
        }
      }

      // Move
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
      if (p.x > W) { p.x = W; p.vx = -Math.abs(p.vx); }
      if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
      if (p.y > H) { p.y = H; p.vy = -Math.abs(p.vy); }

      // Breathing
      const breath = Math.sin(frame * 0.03 + p.phase) * 0.5;
      const glow = (dist < HOVER_R && mx > 0) ? (1 - dist / HOVER_R) : 0;
      const size = p.baseR + breath + glow * 2.5;

      // Trail
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 4) p.trail.shift();
      for (let ti = 0; ti < p.trail.length; ti++) {
        const ta = (ti / p.trail.length) * 0.08;
        ctx.fillStyle = `hsla(${p.hue},80%,60%,${ta})`;
        ctx.beginPath();
        ctx.arc(p.trail[ti].x, p.trail[ti].y, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Main dot
      const pa = 0.35 + glow * 0.55 + breath * 0.1;
      const hue = glow > 0.3 ? 270 : p.hue;
      ctx.fillStyle = `hsla(${hue},80%,65%,${pa})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Glow ring
      if (p.baseR > 1.2 || glow > 0.2) {
        ctx.strokeStyle = `hsla(${hue},70%,60%,${pa * 0.3})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size + 3 + glow * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Shooting stars
    if (Math.random() < 0.003) {
      const left = Math.random() > 0.5;
      stars.push({
        x: left ? -20 : W + 20, y: Math.random() * H * 0.5,
        vx: left ? (3 + Math.random() * 4) : -(3 + Math.random() * 4),
        vy: 1.5 + Math.random() * 2,
        life: 1, decay: 0.012 + Math.random() * 0.008,
        len: 40 + Math.random() * 60,
      });
    }
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      const mag = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      const tx = s.x - (s.vx / mag) * s.len;
      const ty = s.y - (s.vy / mag) * s.len;
      const g = ctx.createLinearGradient(s.x, s.y, tx, ty);
      g.addColorStop(0, `rgba(255,255,255,${s.life * 0.8})`);
      g.addColorStop(0.3, `rgba(0,229,255,${s.life * 0.4})`);
      g.addColorStop(1, 'transparent');
      ctx.strokeStyle = g; ctx.lineWidth = 1.5 * s.life;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${s.life * 0.9})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, 1.5 * s.life, 0, Math.PI * 2); ctx.fill();
      s.x += s.vx; s.y += s.vy; s.life -= s.decay;
      if (s.life <= 0) stars.splice(i, 1);
    }

    // Click ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.radius += 4; rp.life -= 0.02;
      if (rp.life <= 0) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(0,229,255,${rp.life * 0.3})`; ctx.lineWidth = 2 * rp.life;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2); ctx.stroke();
      if (rp.radius > 30) {
        ctx.strokeStyle = `rgba(167,139,250,${rp.life * 0.2})`; ctx.lineWidth = rp.life;
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.radius * 0.6, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // Vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.75);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(2,10,18,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    animId = requestAnimationFrame(draw);
  }

  // Defer start slightly to ensure layout is complete
  requestAnimationFrame(() => {
    resize();
    if (W > 0 && H > 0) {
      createParticles();
      draw();
    }
  });

  window.addEventListener('resize', () => {
    resize();
    createParticles();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      resize();
      draw();
    }
  });
}

// ── Welcome Splash ──
function showWelcomeSplash(onComplete) {
  // Always show the persistent watermark
  try { createDesktopWatermark(); } catch(e) { console.warn('Watermark failed:', e); }

  // Skip particle animation if already seen this session
  if (sessionStorage.getItem('tapasos-welcomed')) {
    onComplete();
    return;
  }
  sessionStorage.setItem('tapasos-welcomed', '1');

  // Wrap entire splash in try-catch — it's eye candy, not critical
  try { runSplashAnimation(onComplete); } catch(e) { console.warn('Splash failed:', e); onComplete(); }
}

function runSplashAnimation(onComplete) {

  const overlay = document.createElement('div');
  overlay.id = 'welcome-splash';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '9500',
    background: 'transparent', pointerEvents: 'none',
  });

  const cvs = document.createElement('canvas');
  Object.assign(cvs.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
  overlay.appendChild(cvs);
  document.body.appendChild(overlay);

  const c = cvs.getContext('2d');
  cvs.width = window.innerWidth;
  cvs.height = window.innerHeight;
  const cx = cvs.width / 2, cy = cvs.height / 2;

  // Sample text pixels from offscreen canvas
  const textPts = [];
  const offCvs = document.createElement('canvas');
  const offC = offCvs.getContext('2d');
  offCvs.width = 500; offCvs.height = 100;
  offC.fillStyle = '#fff';
  offC.font = 'bold 60px Syne, sans-serif';
  offC.textAlign = 'center';
  offC.textBaseline = 'middle';
  offC.fillText('TapasOS', 250, 50);
  const imgData = offC.getImageData(0, 0, 500, 100);

  for (let y = 0; y < 100; y += 3) {
    for (let x = 0; x < 500; x += 3) {
      if (imgData.data[(y * 500 + x) * 4 + 3] > 128) {
        textPts.push({ x: x - 250 + cx, y: y - 50 + cy });
      }
    }
  }

  const N = Math.min(textPts.length, 300);
  const pts = [];
  for (let i = 0; i < N; i++) {
    const target = textPts[Math.floor(i * textPts.length / N)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 300 + Math.random() * 400;
    pts.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      tx: target.x, ty: target.y,
      hue: Math.random() > 0.5 ? 190 : 270,
      size: 1.5 + Math.random() * 1.5,
    });
  }

  let t = 0;
  const CONVERGE = 80;
  const HOLD = 50;
  const DISPERSE = 50;  // particles disperse, text stays
  const TOTAL = CONVERGE + HOLD + DISPERSE;

  // Hide the watermark during animation — we'll reveal it at the end
  const watermark = document.getElementById('desktop-watermark');
  if (watermark) watermark.style.opacity = '0';

  function animate() {
    t++;
    c.clearRect(0, 0, cvs.width, cvs.height);

    if (t <= CONVERGE) {
      const p = t / CONVERGE;
      const ease = 1 - Math.pow(1 - p, 3);
      pts.forEach(pt => {
        const px = pt.x + (pt.tx - pt.x) * ease;
        const py = pt.y + (pt.ty - pt.y) * ease;
        c.fillStyle = `hsla(${pt.hue}, 80%, 65%, ${0.3 + ease * 0.7})`;
        c.beginPath();
        c.arc(px, py, pt.size * (0.5 + ease * 0.5), 0, Math.PI * 2);
        c.fill();
        if (ease > 0.5 && Math.random() > 0.92) {
          const other = pts[Math.floor(Math.random() * pts.length)];
          const ox = other.x + (other.tx - other.x) * ease;
          const oy = other.y + (other.ty - other.y) * ease;
          c.strokeStyle = `rgba(0, 229, 255, ${(ease - 0.5) * 0.15})`;
          c.lineWidth = 0.4;
          c.beginPath();
          c.moveTo(px, py);
          c.lineTo(ox, oy);
          c.stroke();
        }
      });

    } else if (t <= CONVERGE + HOLD) {
      const holdT = (t - CONVERGE) / HOLD;
      const pulse = 1 + Math.sin(holdT * Math.PI * 2) * 0.05;
      pts.forEach(pt => {
        c.fillStyle = `hsla(${pt.hue}, 80%, 70%, 0.9)`;
        c.beginPath();
        c.arc(pt.tx, pt.ty, pt.size * pulse, 0, Math.PI * 2);
        c.fill();
      });
      // Glow
      const glow = c.createRadialGradient(cx, cy, 0, cx, cy, 280);
      glow.addColorStop(0, `rgba(0, 229, 255, ${0.08 * (1 + Math.sin(holdT * Math.PI))})`);
      glow.addColorStop(0.5, `rgba(124, 58, 237, ${0.04 * (1 + Math.sin(holdT * Math.PI))})`);
      glow.addColorStop(1, 'transparent');
      c.fillStyle = glow;
      c.fillRect(cx - 300, cy - 300, 600, 600);
      // Subtitle
      const subAlpha = Math.min(holdT * 2, 1);
      c.font = '14px "DM Sans", sans-serif';
      c.fillStyle = `rgba(107, 143, 163, ${subAlpha * 0.8})`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('Welcome to the portfolio OS', cx, cy + 50);

    } else {
      // Disperse: particles scatter, but text stays as watermark fades in
      const disperseT = (t - CONVERGE - HOLD) / DISPERSE;
      const alpha = 1 - disperseT;
      pts.forEach(pt => {
        const angle = Math.atan2(pt.ty - cy, pt.tx - cx);
        const dist = disperseT * disperseT * 500;
        const px = pt.tx + Math.cos(angle) * dist;
        const py = pt.ty + Math.sin(angle) * dist;
        c.fillStyle = `hsla(${pt.hue}, 80%, 65%, ${alpha * 0.6})`;
        c.beginPath();
        c.arc(px, py, pt.size * Math.max(alpha, 0.3), 0, Math.PI * 2);
        c.fill();
      });
      // Cross-fade: reveal the permanent watermark as particles disperse
      if (watermark) watermark.style.opacity = String(disperseT);
    }

    if (t < TOTAL) {
      requestAnimationFrame(animate);
    } else {
      overlay.remove();
      if (watermark) watermark.style.opacity = '1';
      onComplete();
    }
  }

  requestAnimationFrame(animate);
}

// ── Persistent Desktop Watermark ──
function createDesktopWatermark() {
  if (document.getElementById('desktop-watermark')) return;
  const desktop = document.getElementById('desktop');
  const mark = document.createElement('div');
  mark.id = 'desktop-watermark';
  Object.assign(mark.style, {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: '1',
    pointerEvents: 'none',
    textAlign: 'center',
    transition: 'opacity 0.5s ease',
  });
  mark.innerHTML = `
    <div style="font-family:var(--font-display);font-size:48px;font-weight:800;
      background:linear-gradient(135deg,rgba(0,229,255,0.12),rgba(167,139,250,0.12));
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
      letter-spacing:4px;user-select:none;">TapasOS</div>
    <div style="font-family:var(--font-body);font-size:13px;color:rgba(107,143,163,0.2);
      margin-top:6px;letter-spacing:1px;user-select:none;">Portfolio Operating System</div>
  `;
  desktop.appendChild(mark);
}

// ── Spotlight App Launcher ──
let spotlightOpen = false;

function toggleSpotlight() {
  spotlightOpen ? closeSpotlight() : openSpotlight();
}

function openSpotlight() {
  if (spotlightOpen) return;
  spotlightOpen = true;

  const overlay = document.createElement('div');
  overlay.id = 'spotlight-overlay';
  overlay.addEventListener('click', closeSpotlight);

  const box = document.createElement('div');
  box.id = 'spotlight-box';
  box.innerHTML = `
    <input type="text" id="spotlight-input" placeholder="Search apps..." autocomplete="off" spellcheck="false">
    <div id="spotlight-results"></div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('visible');
    document.getElementById('spotlight-input').focus();
  });

  const input = box.querySelector('#spotlight-input');
  const results = box.querySelector('#spotlight-results');

  renderSpotlightResults(results, '');

  input.addEventListener('input', () => {
    renderSpotlightResults(results, input.value.trim().toLowerCase());
  });

  input.addEventListener('keydown', (e) => {
    const items = results.querySelectorAll('.spotlight-item');
    const active = results.querySelector('.spotlight-item.active');
    let idx = [...items].indexOf(active);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      idx = Math.min(idx + 1, items.length - 1);
      items.forEach(i => i.classList.remove('active'));
      items[idx]?.classList.add('active');
      items[idx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      idx = Math.max(idx - 1, 0);
      items.forEach(i => i.classList.remove('active'));
      items[idx]?.classList.add('active');
      items[idx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = active || items[0];
      if (sel) {
        const appId = sel.dataset.app;
        closeSpotlight();
        openApp(appId);
      }
    }
  });

  box.addEventListener('click', (e) => e.stopPropagation());
}

function renderSpotlightResults(container, query) {
  const matched = APP_REGISTRY.filter(a =>
    !query || a.title.toLowerCase().includes(query) || a.id.toLowerCase().includes(query)
  );

  container.innerHTML = matched.map((app, i) => `
    <div class="spotlight-item ${i === 0 ? 'active' : ''}" data-app="${app.id}">
      <span class="spotlight-icon">${app.icon}</span>
      <div class="spotlight-info">
        <span class="spotlight-title">${app.title}</span>
      </div>
    </div>
  `).join('') || '<div class="spotlight-empty">No apps found</div>';

  container.querySelectorAll('.spotlight-item').forEach(el => {
    el.addEventListener('click', () => {
      closeSpotlight();
      openApp(el.dataset.app);
    });
  });
}

function closeSpotlight() {
  if (!spotlightOpen) return;
  spotlightOpen = false;
  const overlay = document.getElementById('spotlight-overlay');
  if (overlay) {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
  }
}

// ── Staggered Dock Entrance ──
export function animateDockEntrance() {
  const items = document.querySelectorAll('.dock-item');
  items.forEach((item, i) => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    setTimeout(() => {
      item.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    }, 80 * i);
  });
}

// ── Window Open Animation ──
function animateWindowOpen(win) {
  win.style.opacity = '0';
  win.style.transform = 'scale(0.92)';
  requestAnimationFrame(() => {
    win.style.transition = 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
    win.style.opacity = '1';
    win.style.transform = 'scale(1)';
    setTimeout(() => {
      win.style.transition = '';
      win.style.transform = '';
    }, 260);
  });
}
