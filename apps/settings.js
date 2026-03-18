// Settings.app — Central hub for all TapasOS preferences

import { isMuted, setMuted, getVolume, setVolume } from '../os/sounds.js';
import { getLockTimeout, setLockTimeout } from '../os/lock-screen.js';
import { WALLPAPERS, setWallpaper, getWallpaperId } from '../os/wallpaper.js';

const LS_BRIGHT = 'tapasos-brightness';

const SECTIONS = [
  { id: 'about',      icon: 'laptop',     label: 'About This Mac' },
  { id: 'appearance', icon: 'palette',     label: 'Appearance' },
  { id: 'sound',      icon: 'volume',      label: 'Sound' },
  { id: 'display',    icon: 'sun',         label: 'Display' },
  { id: 'lock',       icon: 'lock',        label: 'Lock Screen' },
  { id: 'keyboard',   icon: 'keyboard',    label: 'Keyboard Shortcuts' },
];

let container = null;
let activeSection = 'about';

export async function init(el) {
  container = el;
  injectStyles();
  render();
}

function render() {
  container.innerHTML = `
    <div class="settings-app">
      <div class="settings-sidebar">
        <div class="settings-sidebar-title">Settings</div>
        ${SECTIONS.map(s => `
          <div class="settings-nav-item ${s.id === activeSection ? 'active' : ''}" data-section="${s.id}">
            ${getIcon(s.icon)}
            <span>${s.label}</span>
          </div>
        `).join('')}
      </div>
      <div class="settings-content" id="settings-content">
        ${renderSection(activeSection)}
      </div>
    </div>
  `;

  bindNav();
  bindSectionEvents();
}

function bindNav() {
  container.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      activeSection = item.dataset.section;
      container.querySelectorAll('.settings-nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const content = container.querySelector('#settings-content');
      content.innerHTML = renderSection(activeSection);
      bindSectionEvents();
    });
  });
}

function bindSectionEvents() {
  // Sound toggle
  const soundToggle = container.querySelector('#settings-sound-toggle');
  if (soundToggle) {
    soundToggle.addEventListener('change', () => {
      setMuted(!soundToggle.checked);
    });
  }

  // Lock timeout
  const lockSelect = container.querySelector('#settings-lock-timeout');
  if (lockSelect) {
    lockSelect.addEventListener('change', () => {
      setLockTimeout(parseInt(lockSelect.value, 10));
    });
  }

  // Volume
  const volSlider = container.querySelector('#settings-volume');
  if (volSlider) {
    volSlider.addEventListener('input', () => {
      const val = parseInt(volSlider.value, 10);
      setVolume(val);
      const label = container.querySelector('#settings-vol-val');
      if (label) label.textContent = val + '%';
    });
  }

  // Brightness
  const brightSlider = container.querySelector('#settings-brightness');
  if (brightSlider) {
    brightSlider.addEventListener('input', () => {
      const val = parseInt(brightSlider.value, 10);
      localStorage.setItem(LS_BRIGHT, String(val));
      const desktop = document.getElementById('desktop');
      if (desktop) desktop.style.filter = val < 100 ? `brightness(${val / 100})` : '';
      const label = container.querySelector('#settings-bright-val');
      if (label) label.textContent = val + '%';
    });
  }

  // Wallpaper selection
  container.querySelectorAll('.settings-wp-card').forEach(card => {
    card.addEventListener('click', () => {
      const wpId = card.dataset.wp;
      setWallpaper(wpId);
      container.querySelectorAll('.settings-wp-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });
}

// ── Section Renderers ──

function renderSection(id) {
  switch (id) {
    case 'about': return renderAbout();
    case 'appearance': return renderAppearance();
    case 'sound': return renderSound();
    case 'display': return renderDisplay();
    case 'lock': return renderLock();
    case 'keyboard': return renderKeyboard();
    default: return '';
  }
}

function renderAbout() {
  const cpuCores = navigator.hardwareConcurrency || 'N/A';
  const memory = navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'N/A';
  const screen_ = `${screen.width} x ${screen.height} @ ${window.devicePixelRatio || 1}x`;
  const browser = detectBrowser();
  const os = detectOS();
  const lang = navigator.language || 'en-US';

  return `
    <div class="settings-section">
      <div class="settings-about-header">
        <div class="settings-about-logo">TapasOS</div>
        <div class="settings-about-version">Version 3.0.26</div>
        <div class="settings-about-tagline">An AI-first developer portfolio</div>
      </div>
      <div class="settings-info-grid">
        <div class="settings-info-row">
          <span class="settings-info-label">Developer</span>
          <span class="settings-info-value">Tapas Kumar Patra</span>
        </div>
        <div class="settings-info-row">
          <span class="settings-info-label">Role</span>
          <span class="settings-info-value">SDET II @ Setu by Pine Labs</span>
        </div>
        <div class="settings-info-row">
          <span class="settings-info-label">Host OS</span>
          <span class="settings-info-value">${esc(os)}</span>
        </div>
        <div class="settings-info-row">
          <span class="settings-info-label">Renderer</span>
          <span class="settings-info-value">${esc(browser)}</span>
        </div>
        <div class="settings-info-row">
          <span class="settings-info-label">CPU Threads</span>
          <span class="settings-info-value">${cpuCores}</span>
        </div>
        <div class="settings-info-row">
          <span class="settings-info-label">Memory</span>
          <span class="settings-info-value">${memory}</span>
        </div>
        <div class="settings-info-row">
          <span class="settings-info-label">Display</span>
          <span class="settings-info-value">${screen_}</span>
        </div>
        <div class="settings-info-row">
          <span class="settings-info-label">Locale</span>
          <span class="settings-info-value">${lang}</span>
        </div>
      </div>
      <div class="settings-about-footer">
        Built with vanilla JS, CSS, and Web Audio API. Zero frameworks. Zero dependencies.
      </div>
    </div>
  `;
}

function renderAppearance() {
  const wpId = getWallpaperId();
  return `
    <div class="settings-section">
      <div class="settings-section-title">Wallpaper</div>
      <div class="settings-wp-grid">
        ${WALLPAPERS.map(wp => `
          <div class="settings-wp-card ${wp.id === wpId ? 'active' : ''}" data-wp="${wp.id}">
            <div class="settings-wp-preview" style="background:${wp.preview}"></div>
            <div class="settings-wp-name">${wp.name}</div>
            <div class="settings-wp-desc">${wp.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSound() {
  const muted = isMuted();
  const volume = getVolume();
  return `
    <div class="settings-section">
      <div class="settings-section-title">Sound</div>
      <div class="settings-option-row">
        <div class="settings-option-info">
          <div class="settings-option-label">System Sounds</div>
          <div class="settings-option-desc">Boot chime, notifications, window open/close, dock clicks, unlock</div>
        </div>
        <label class="settings-toggle">
          <input type="checkbox" id="settings-sound-toggle" ${!muted ? 'checked' : ''}>
          <span class="settings-toggle-slider"></span>
        </label>
      </div>
      <div class="settings-option-row">
        <div class="settings-option-info">
          <div class="settings-option-label">Volume</div>
          <div class="settings-option-desc">Adjust system sound level</div>
        </div>
        <span class="settings-option-value" id="settings-vol-val">${volume}%</span>
      </div>
      <div class="settings-slider-row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
        <input type="range" class="settings-slider" id="settings-volume" min="0" max="100" value="${volume}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      </div>
      <div class="settings-option-row" style="margin-top: 12px;">
        <div class="settings-option-info">
          <div class="settings-option-label">Audio Engine</div>
          <div class="settings-option-desc">Web Audio API — synthesized oscillators, zero audio files</div>
        </div>
        <span class="settings-option-badge">Active</span>
      </div>
    </div>
  `;
}

function renderDisplay() {
  const brightness = getBrightness();
  return `
    <div class="settings-section">
      <div class="settings-section-title">Display</div>
      <div class="settings-option-row">
        <div class="settings-option-info">
          <div class="settings-option-label">Brightness</div>
          <div class="settings-option-desc">Adjust desktop brightness</div>
        </div>
        <span class="settings-option-value" id="settings-bright-val">${brightness}%</span>
      </div>
      <div class="settings-slider-row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <input type="range" class="settings-slider" id="settings-brightness" min="50" max="100" value="${brightness}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      </div>
      <div class="settings-option-row" style="margin-top:16px">
        <div class="settings-option-info">
          <div class="settings-option-label">Resolution</div>
          <div class="settings-option-desc">${screen.width} x ${screen.height} pixels</div>
        </div>
        <span class="settings-option-badge">${window.devicePixelRatio || 1}x Retina</span>
      </div>
      <div class="settings-option-row">
        <div class="settings-option-info">
          <div class="settings-option-label">Color Depth</div>
          <div class="settings-option-desc">${screen.colorDepth}-bit color</div>
        </div>
      </div>
    </div>
  `;
}

function renderLock() {
  const timeout = getLockTimeout();
  const options = [
    { val: 0, label: 'Never' },
    { val: 1, label: '1 minute' },
    { val: 2, label: '2 minutes' },
    { val: 5, label: '5 minutes' },
    { val: 10, label: '10 minutes' },
    { val: 15, label: '15 minutes' },
    { val: 30, label: '30 minutes' },
  ];

  return `
    <div class="settings-section">
      <div class="settings-section-title">Lock Screen</div>
      <div class="settings-option-row">
        <div class="settings-option-info">
          <div class="settings-option-label">Auto-Lock After</div>
          <div class="settings-option-desc">Lock screen activates after period of inactivity</div>
        </div>
        <select class="settings-select" id="settings-lock-timeout">
          ${options.map(o => `<option value="${o.val}" ${o.val === timeout ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>
      <div class="settings-option-row">
        <div class="settings-option-info">
          <div class="settings-option-label">Unlock Method</div>
          <div class="settings-option-desc">Slide to unlock gesture</div>
        </div>
      </div>
      <div class="settings-option-row">
        <div class="settings-option-info">
          <div class="settings-option-label">Manual Lock</div>
          <div class="settings-option-desc">Use keyboard shortcut to lock instantly</div>
        </div>
        <kbd class="settings-kbd">${isMac() ? 'Option' : 'Alt'}+L</kbd>
      </div>
    </div>
  `;
}

function renderKeyboard() {
  const mod = isMac() ? '\u2325' : 'Alt';
  const shortcuts = [
    { action: 'Spotlight Search', keys: `${mod}+K` },
    { action: 'Quick Spotlight', keys: '/' },
    { action: 'Close Window', keys: `${mod}+W` },
    { action: 'Close All Windows', keys: `${mod}+Shift+W` },
    { action: 'Minimize Window', keys: `${mod}+M` },
    { action: 'Maximize / Restore', keys: `${mod}+Enter` },
    { action: 'Hide All Windows', keys: `${mod}+H` },
    { action: 'Cycle Windows', keys: `${mod}+\`` },
    { action: 'Lock Screen', keys: `${mod}+L` },
    { action: 'Dismiss / Close', keys: 'Esc' },
  ];

  return `
    <div class="settings-section">
      <div class="settings-section-title">Keyboard Shortcuts</div>
      <div class="settings-shortcuts-table">
        ${shortcuts.map(s => `
          <div class="settings-shortcut-row">
            <span class="settings-shortcut-action">${s.action}</span>
            <kbd class="settings-kbd">${s.keys}</kbd>
          </div>
        `).join('')}
      </div>
      <div class="settings-shortcuts-note">
        TapasOS uses ${isMac() ? 'Option (\u2325)' : 'Alt'} as the modifier key on all platforms to avoid conflicts with browser shortcuts.
      </div>
    </div>
  `;
}

// ── Helpers ──

function getBrightness() {
  const val = localStorage.getItem(LS_BRIGHT);
  return val ? parseInt(val, 10) : 100;
}

function isMac() {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function detectBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return 'Firefox ' + ua.split('Firefox/')[1].split(' ')[0];
  if (ua.includes('Edg/')) return 'Edge ' + ua.split('Edg/')[1].split(' ')[0];
  if (ua.includes('Chrome/')) return 'Chrome ' + ua.split('Chrome/')[1].split(' ')[0];
  if (ua.includes('Safari/') && ua.includes('Version/')) return 'Safari ' + ua.split('Version/')[1].split(' ')[0];
  return 'Unknown';
}

function detectOS() {
  const ua = navigator.userAgent;
  if (ua.includes('Mac OS X')) {
    const ver = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    return 'macOS ' + (ver ? ver[1].replace(/_/g, '.') : '');
  }
  if (ua.includes('Windows NT')) {
    const map = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
    const ver = ua.match(/Windows NT (\d+\.\d+)/);
    return 'Windows ' + (ver ? (map[ver[1]] || ver[1]) : '');
  }
  if (ua.includes('Linux')) return 'Linux';
  return navigator.platform || 'Unknown';
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function getIcon(name) {
  const icons = {
    laptop: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',
    palette: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
    volume: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    lock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    keyboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/></svg>',
  };
  return icons[name] || '';
}

// ── Scoped Styles ──

function injectStyles() {
  if (document.getElementById('settings-styles')) return;
  const style = document.createElement('style');
  style.id = 'settings-styles';
  style.textContent = `
    .settings-app {
      display: flex;
      height: 100%;
      font-family: var(--font-body);
    }

    .settings-sidebar {
      width: 200px;
      flex-shrink: 0;
      background: rgba(0,0,0,0.2);
      border-right: 1px solid rgba(255,255,255,0.06);
      padding: 16px 8px;
      overflow-y: auto;
    }

    .settings-sidebar-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      padding: 0 8px 12px;
    }

    .settings-nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 8px;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 12px;
      transition: background 0.15s, color 0.15s;
    }

    .settings-nav-item:hover {
      background: rgba(255,255,255,0.05);
    }

    .settings-nav-item.active {
      background: rgba(0, 229, 255, 0.1);
      color: var(--cyan);
    }

    .settings-nav-item svg {
      flex-shrink: 0;
      opacity: 0.7;
    }

    .settings-nav-item.active svg {
      opacity: 1;
    }

    .settings-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .settings-section {}

    .settings-section-title {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 16px;
    }

    /* About */
    .settings-about-header {
      text-align: center;
      padding: 20px 0 24px;
    }

    .settings-about-logo {
      font-family: var(--font-display);
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--cyan), var(--violet-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 4px;
    }

    .settings-about-version {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .settings-about-tagline {
      font-size: 12px;
      color: var(--text-dim);
    }

    .settings-info-grid {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      overflow: hidden;
    }

    .settings-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }

    .settings-info-row:last-child {
      border-bottom: none;
    }

    .settings-info-label {
      font-size: 12px;
      color: var(--text-muted);
    }

    .settings-info-value {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-primary);
    }

    .settings-about-footer {
      margin-top: 16px;
      text-align: center;
      font-size: 11px;
      color: var(--text-dim);
      font-style: italic;
    }

    /* Options */
    .settings-option-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      margin-bottom: 8px;
    }

    .settings-option-info {
      flex: 1;
      min-width: 0;
    }

    .settings-option-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 2px;
    }

    .settings-option-desc {
      font-size: 11px;
      color: var(--text-dim);
    }

    .settings-option-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--cyan);
      background: rgba(0,229,255,0.1);
      border: 1px solid rgba(0,229,255,0.2);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .settings-option-value {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Toggle switch */
    .settings-toggle {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 22px;
      flex-shrink: 0;
    }

    .settings-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .settings-toggle-slider {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.1);
      border-radius: 11px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .settings-toggle-slider::before {
      content: '';
      position: absolute;
      left: 2px;
      top: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--text-muted);
      transition: transform 0.2s, background 0.2s;
    }

    .settings-toggle input:checked + .settings-toggle-slider {
      background: rgba(0, 229, 255, 0.3);
    }

    .settings-toggle input:checked + .settings-toggle-slider::before {
      transform: translateX(18px);
      background: var(--cyan);
    }

    /* Select */
    .settings-select {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 12px;
      padding: 4px 8px;
      cursor: pointer;
      outline: none;
    }

    .settings-select:focus {
      border-color: var(--cyan);
    }

    .settings-select option {
      background: #1a1a2e;
      color: var(--text-primary);
    }

    /* Slider */
    .settings-slider-row {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-muted);
      padding: 0 4px;
    }

    .settings-slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 4px;
      border-radius: 2px;
      background: rgba(255,255,255,0.1);
      outline: none;
    }

    .settings-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--text-primary);
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    }

    .settings-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--text-primary);
      cursor: pointer;
      border: none;
    }

    /* Wallpaper grid */
    .settings-wp-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .settings-wp-card {
      cursor: pointer;
      border-radius: 10px;
      border: 2px solid transparent;
      overflow: hidden;
      transition: border-color 0.15s, transform 0.1s;
    }

    .settings-wp-card:hover {
      transform: scale(1.03);
    }

    .settings-wp-card.active {
      border-color: var(--cyan);
      box-shadow: 0 0 12px var(--cyan-glow);
    }

    .settings-wp-preview {
      aspect-ratio: 16/10;
      border-radius: 8px 8px 0 0;
    }

    .settings-wp-name {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-primary);
      padding: 6px 8px 2px;
    }

    .settings-wp-desc {
      font-size: 10px;
      color: var(--text-dim);
      padding: 0 8px 6px;
    }

    /* Keyboard shortcuts */
    .settings-shortcuts-table {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      overflow: hidden;
    }

    .settings-shortcut-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }

    .settings-shortcut-row:last-child {
      border-bottom: none;
    }

    .settings-shortcut-action {
      font-size: 12px;
      color: var(--text-muted);
    }

    .settings-kbd {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-primary);
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .settings-shortcuts-note {
      margin-top: 12px;
      font-size: 11px;
      color: var(--text-dim);
      font-style: italic;
    }
  `;
  document.head.appendChild(style);
}
