// TapasOS Control Center — menubar dropdown with quick toggles

import { isMuted, toggleMute, playClick, getVolume, setVolume } from './sounds.js';
import { lockNow } from './lock-screen.js';
import { WALLPAPERS, setWallpaper, getWallpaperId } from './wallpaper.js';

const LS_BRIGHT = 'tapasos-brightness';
const LS_WIFI = 'tapasos-wifi';

let panelEl = null;
let isOpen = false;

// ── Wi-Fi (real + user toggle) ──
// Wi-Fi is "on" only if BOTH the browser has connectivity AND the user hasn't toggled it off.
let wifiListeners = [];
let wifiUserEnabled = localStorage.getItem(LS_WIFI) !== 'off';

export function isOnline() {
  return navigator.onLine && wifiUserEnabled;
}

export function onConnectivityChange(cb) {
  wifiListeners.push(cb);
}

function fireConnectivityChange() {
  const online = isOnline();
  wifiListeners.forEach(cb => cb(online));
}

function toggleWifi() {
  wifiUserEnabled = !wifiUserEnabled;
  localStorage.setItem(LS_WIFI, wifiUserEnabled ? 'on' : 'off');
  updateWifiIndicator(isOnline());
  fireConnectivityChange();
}

export function initControlCenter() {
  const menuRight = document.querySelector('.menubar-right');
  if (!menuRight) return;
  const clock = menuRight.querySelector('.menubar-clock');

  // Wi-Fi status indicator in menubar
  const wifiIndicator = document.createElement('div');
  wifiIndicator.className = 'cc-wifi-indicator';
  wifiIndicator.id = 'cc-wifi-indicator';
  wifiIndicator.title = isOnline() ? 'Wi-Fi: Connected' : 'Wi-Fi: Disconnected';
  wifiIndicator.innerHTML = getWifiIcon(isOnline());
  menuRight.insertBefore(wifiIndicator, clock);

  // CC trigger
  const trigger = document.createElement('div');
  trigger.className = 'cc-trigger';
  trigger.title = 'Control Center';
  trigger.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="8" cy="6" r="2" fill="currentColor"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="currentColor"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2" fill="currentColor"/></svg>`;

  menuRight.insertBefore(trigger, clock);

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) close(); else open(trigger);
  });

  document.addEventListener('click', (e) => {
    if (isOpen && panelEl && !panelEl.contains(e.target) && !trigger.contains(e.target)) {
      close();
    }
  });

  // Listen to real browser online/offline events
  window.addEventListener('online', () => {
    updateWifiIndicator(isOnline());
    fireConnectivityChange();
  });
  window.addEventListener('offline', () => {
    updateWifiIndicator(false);
    fireConnectivityChange();
  });

  applyBrightness(getBrightness());
}

function updateWifiIndicator(online) {
  const el = document.getElementById('cc-wifi-indicator');
  if (!el) return;
  el.title = online ? 'Wi-Fi: Connected' : 'Wi-Fi: Disconnected';
  el.innerHTML = getWifiIcon(online);
  el.classList.toggle('offline', !online);

  // Also update the CC panel if open
  if (isOpen && panelEl) {
    const wifiTile = panelEl.querySelector('[data-toggle="wifi"]');
    if (wifiTile) {
      wifiTile.classList.toggle('active', online);
      const status = wifiTile.querySelector('.cc-tile-status');
      if (status) {
        if (!wifiUserEnabled) status.textContent = 'Off';
        else if (!navigator.onLine) status.textContent = 'No Internet';
        else status.textContent = 'Connected';
      }
    }
  }
}

function getWifiIcon(online) {
  if (online) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>`;
  }
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0" opacity="0.3"/><path d="M1.42 9a16 16 0 0 1 21.16 0" opacity="0.3"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0" opacity="0.3"/><circle cx="12" cy="20" r="1" opacity="0.3"/><line x1="2" y1="2" x2="22" y2="22" stroke="#FF5F56" stroke-width="2"/></svg>`;
}

function open(anchor) {
  if (isOpen) return;
  isOpen = true;

  panelEl = document.createElement('div');
  panelEl.id = 'control-center';
  panelEl.innerHTML = buildPanel();
  document.body.appendChild(panelEl);

  const rect = anchor.getBoundingClientRect();
  panelEl.style.top = `${rect.bottom + 6}px`;
  panelEl.style.right = `${window.innerWidth - rect.right - 20}px`;

  requestAnimationFrame(() => panelEl.classList.add('visible'));
  bindEvents();
}

function close() {
  if (!isOpen || !panelEl) return;
  isOpen = false;
  panelEl.classList.remove('visible');
  setTimeout(() => { panelEl?.remove(); panelEl = null; }, 200);
}

function buildPanel() {
  const muted = isMuted();
  const online = isOnline();
  const brightness = getBrightness();
  const volume = getVolume();
  const wpId = getWallpaperId();

  // Wi-Fi status text
  let wifiStatus;
  if (!wifiUserEnabled) wifiStatus = 'Off';
  else if (!navigator.onLine) wifiStatus = 'No Internet';
  else wifiStatus = 'Connected';

  return `
    <div class="cc-row">
      <div class="cc-tile cc-toggle ${online ? 'active' : ''}" data-toggle="wifi">
        <div class="cc-tile-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>
        </div>
        <div class="cc-tile-info">
          <div class="cc-tile-label">Wi-Fi</div>
          <div class="cc-tile-status">${wifiStatus}</div>
        </div>
      </div>

      <div class="cc-tile cc-toggle ${!muted ? 'active' : ''}" data-toggle="sound">
        <div class="cc-tile-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${
            muted
              ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
              : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'
          }</svg>
        </div>
        <div class="cc-tile-info">
          <div class="cc-tile-label">Sound</div>
          <div class="cc-tile-status">${muted ? 'Off' : 'On'}</div>
        </div>
      </div>
    </div>

    <div class="cc-section">
      <div class="cc-section-label">Volume</div>
      <div class="cc-slider-row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
        <input type="range" class="cc-slider" id="cc-volume" min="0" max="100" value="${volume}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      </div>
    </div>

    <div class="cc-section">
      <div class="cc-section-label">Display</div>
      <div class="cc-slider-row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <input type="range" class="cc-slider" id="cc-brightness" min="50" max="100" value="${brightness}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      </div>
    </div>

    <div class="cc-section">
      <div class="cc-section-label">Wallpaper</div>
      <div class="cc-wp-grid">
        ${WALLPAPERS.slice(0, 8).map(wp => `
          <div class="cc-wp-thumb ${wp.id === wpId ? 'active' : ''}" data-wp="${wp.id}" title="${wp.name}" style="background:${wp.preview}"></div>
        `).join('')}
      </div>
    </div>

    <div class="cc-actions">
      <button class="cc-action-btn" data-action="lock">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Lock Screen
      </button>
    </div>
  `;
}

function bindEvents() {
  if (!panelEl) return;

  // Toggle tiles
  panelEl.querySelectorAll('.cc-toggle').forEach(tile => {
    tile.addEventListener('click', () => {
      const toggle = tile.dataset.toggle;
      playClick();

      if (toggle === 'sound') {
        const nowMuted = toggleMute();
        tile.classList.toggle('active', !nowMuted);
        tile.querySelector('.cc-tile-status').textContent = nowMuted ? 'Off' : 'On';
        const iconEl = tile.querySelector('.cc-tile-icon svg');
        if (iconEl) {
          iconEl.innerHTML = nowMuted
            ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
            : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
        }
      } else if (toggle === 'wifi') {
        toggleWifi();
        const online = isOnline();
        tile.classList.toggle('active', online);
        const status = tile.querySelector('.cc-tile-status');
        if (status) {
          if (!wifiUserEnabled) status.textContent = 'Off';
          else if (!navigator.onLine) status.textContent = 'No Internet';
          else status.textContent = 'Connected';
        }
      }
    });
  });

  // Volume slider
  const volSlider = panelEl.querySelector('#cc-volume');
  if (volSlider) {
    volSlider.addEventListener('input', () => {
      setVolume(parseInt(volSlider.value, 10));
    });
  }

  // Brightness slider
  const slider = panelEl.querySelector('#cc-brightness');
  if (slider) {
    slider.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      applyBrightness(val);
      setBrightness(val);
    });
  }

  // Wallpaper thumbs
  panelEl.querySelectorAll('.cc-wp-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      playClick();
      const wpId = thumb.dataset.wp;
      setWallpaper(wpId);
      panelEl.querySelectorAll('.cc-wp-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  // Lock button
  const lockBtn = panelEl.querySelector('[data-action="lock"]');
  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      close();
      lockNow();
    });
  }
}

// ── Brightness ──

function getBrightness() {
  const val = localStorage.getItem(LS_BRIGHT);
  return val ? parseInt(val, 10) : 100;
}

function setBrightness(val) {
  localStorage.setItem(LS_BRIGHT, String(val));
}

function applyBrightness(val) {
  const desktop = document.getElementById('desktop');
  if (desktop) {
    desktop.style.filter = val < 100 ? `brightness(${val / 100})` : '';
  }
}
