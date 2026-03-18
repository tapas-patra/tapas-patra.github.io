// Mission Control — zoomed-out overview of all open windows
// Hotkey: F3 or Option+Tab
// Also accessible from right-click context menu

let active = false;
let overlay = null;

export function initMissionControl() {
  injectStyles();
}

export function toggleMissionControl() {
  if (active) {
    closeMissionControl();
  } else {
    openMissionControl();
  }
}

export function isMissionControlActive() {
  return active;
}

function openMissionControl() {
  const windowsMap = window.__tapasos_getWindows?.();
  if (!windowsMap || windowsMap.size === 0) return;

  active = true;

  overlay = document.createElement('div');
  overlay.id = 'mission-control';
  overlay.innerHTML = `
    <div class="mc-header">
      <div class="mc-title">Mission Control</div>
      <div class="mc-hint">Click a window to focus &middot; Press Esc or F3 to exit</div>
    </div>
    <div class="mc-grid" id="mc-grid"></div>
  `;

  document.body.appendChild(overlay);

  const grid = overlay.querySelector('#mc-grid');
  const registry = window.__tapasos_getAppRegistry?.() || [];

  // Collect visible (non-minimized) and minimized windows separately
  const visibleWindows = [];
  const minimizedWindows = [];

  windowsMap.forEach((entry, appId) => {
    const appDef = registry.find(a => a.id === appId);
    if (entry.state === 'minimized') {
      minimizedWindows.push({ appId, entry, appDef });
    } else {
      visibleWindows.push({ appId, entry, appDef });
    }
  });

  // Render visible windows as thumbnail cards
  visibleWindows.forEach(({ appId, entry, appDef }) => {
    const card = createWindowCard(appId, entry, appDef, false);
    grid.appendChild(card);
  });

  // Render minimized windows (dimmed)
  minimizedWindows.forEach(({ appId, entry, appDef }) => {
    const card = createWindowCard(appId, entry, appDef, true);
    grid.appendChild(card);
  });

  // If no windows at all (shouldn't happen due to early return, but safety)
  if (visibleWindows.length === 0 && minimizedWindows.length === 0) {
    grid.innerHTML = '<div class="mc-empty">No open windows</div>';
  }

  // Backdrop click closes
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('mc-grid') || e.target.classList.contains('mc-header')) {
      closeMissionControl();
    }
  });

  requestAnimationFrame(() => overlay.classList.add('visible'));
}

function createWindowCard(appId, entry, appDef, isMinimized) {
  const card = document.createElement('div');
  card.className = `mc-card ${isMinimized ? 'mc-minimized' : ''} ${entry.el.classList.contains('focused') ? 'mc-focused' : ''}`;
  card.dataset.appId = appId;

  // Capture a visual snapshot of the window
  const winEl = entry.el;
  const titlebar = winEl.querySelector('.window-titlebar');
  const body = winEl.querySelector('.window-body');

  // Get dimensions for aspect ratio
  const w = winEl.offsetWidth || 640;
  const h = winEl.offsetHeight || 460;
  const aspect = w / h;

  card.innerHTML = `
    <div class="mc-card-preview" style="aspect-ratio: ${aspect.toFixed(2)};">
      <div class="mc-card-titlebar">
        <span class="mc-card-icon">${appDef?.icon || ''}</span>
        <span class="mc-card-title">${appDef?.title || appId}</span>
      </div>
      <div class="mc-card-body">
        ${isMinimized ? '<div class="mc-card-minimized-label">Minimized</div>' : ''}
      </div>
    </div>
    <div class="mc-card-label">
      <span>${appDef?.icon || ''}</span>
      <span>${appDef?.title || appId}</span>
    </div>
  `;

  // Try to render a mini clone of the window body for the preview
  if (!isMinimized && body) {
    const previewBody = card.querySelector('.mc-card-body');
    try {
      const clone = body.cloneNode(true);
      clone.style.cssText = `
        width: ${w}px;
        height: ${h - 36}px;
        transform: scale(${Math.min(280 / w, 200 / (h - 36))});
        transform-origin: top left;
        pointer-events: none;
        overflow: hidden;
        position: absolute;
        top: 0;
        left: 0;
      `;
      // Remove IDs to avoid duplicates
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      previewBody.style.position = 'relative';
      previewBody.style.overflow = 'hidden';
      previewBody.appendChild(clone);
    } catch {
      // Fallback — just show icon
    }
  }

  card.addEventListener('click', (e) => {
    e.stopPropagation();
    selectWindow(appId, isMinimized);
  });

  return card;
}

function selectWindow(appId, isMinimized) {
  closeMissionControl(() => {
    if (isMinimized) {
      window.__tapasos_restoreWindow?.(appId);
    }
    window.__tapasos_focusWindow?.(appId);
  });
}

function closeMissionControl(callback) {
  if (!active || !overlay) {
    callback?.();
    return;
  }

  active = false;
  overlay.classList.remove('visible');

  setTimeout(() => {
    overlay?.remove();
    overlay = null;
    callback?.();
  }, 250);
}

export { closeMissionControl };

function injectStyles() {
  if (document.getElementById('mc-styles')) return;
  const style = document.createElement('style');
  style.id = 'mc-styles';
  style.textContent = `
    #mission-control {
      position: fixed;
      inset: 0;
      z-index: 18000;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      opacity: 0;
      transition: opacity 0.25s ease;
    }

    #mission-control.visible {
      opacity: 1;
    }

    .mc-header {
      text-align: center;
      padding: 24px 20px 12px;
      flex-shrink: 0;
    }

    .mc-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .mc-hint {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
    }

    .mc-grid {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 20px 40px 40px;
      overflow-y: auto;
    }

    .mc-card {
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      width: 280px;
      flex-shrink: 0;
    }

    .mc-card:hover {
      transform: translateY(-4px) scale(1.03);
    }

    .mc-card:hover .mc-card-preview {
      border-color: rgba(0, 229, 255, 0.4);
      box-shadow: 0 8px 32px rgba(0, 229, 255, 0.12), 0 4px 16px rgba(0,0,0,0.4);
    }

    .mc-card.mc-focused .mc-card-preview {
      border-color: rgba(0, 229, 255, 0.3);
    }

    .mc-card.mc-minimized {
      opacity: 0.5;
    }

    .mc-card.mc-minimized:hover {
      opacity: 0.8;
    }

    .mc-card-preview {
      background: linear-gradient(145deg, rgba(22,22,40,0.95), rgba(17,17,32,0.95));
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }

    .mc-card-titlebar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: rgba(0,0,0,0.3);
      border-bottom: 1px solid rgba(255,255,255,0.04);
      flex-shrink: 0;
    }

    .mc-card-icon {
      font-size: 12px;
    }

    .mc-card-title {
      font-family: var(--font-body);
      font-size: 10px;
      font-weight: 500;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mc-card-body {
      flex: 1;
      min-height: 120px;
      overflow: hidden;
      position: relative;
    }

    .mc-card-minimized-label {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-dim);
    }

    .mc-card-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 0 0;
      font-family: var(--font-body);
      font-size: 11px;
      color: var(--text-muted);
    }

    .mc-empty {
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--text-dim);
    }

    /* Entrance animation for cards */
    #mission-control.visible .mc-card {
      animation: mc-card-in 0.3s ease both;
    }

    #mission-control.visible .mc-card:nth-child(1) { animation-delay: 0.05s; }
    #mission-control.visible .mc-card:nth-child(2) { animation-delay: 0.1s; }
    #mission-control.visible .mc-card:nth-child(3) { animation-delay: 0.15s; }
    #mission-control.visible .mc-card:nth-child(4) { animation-delay: 0.2s; }
    #mission-control.visible .mc-card:nth-child(5) { animation-delay: 0.25s; }
    #mission-control.visible .mc-card:nth-child(6) { animation-delay: 0.3s; }
    #mission-control.visible .mc-card:nth-child(n+7) { animation-delay: 0.35s; }

    @keyframes mc-card-in {
      from {
        opacity: 0;
        transform: scale(0.85) translateY(20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}
