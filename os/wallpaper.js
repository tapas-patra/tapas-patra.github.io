// TapasOS Wallpaper System — built-in gradient wallpapers + dynamic time-based option

const LS_KEY = 'tapasos-wallpaper';
const DEFAULT_WALLPAPER = 'particles';

// Built-in wallpapers — CSS gradients (zero network requests)
export const WALLPAPERS = [
  {
    id: 'particles',
    name: 'Particle Mesh',
    desc: 'Interactive particle network',
    preview: 'linear-gradient(135deg, #0a0a12, #111120)',
    css: null, // special — uses canvas particles
  },
  {
    id: 'aurora',
    name: 'Aurora',
    desc: 'Northern lights gradient',
    preview: 'linear-gradient(160deg, #0a0a12 0%, #0d1f2d 20%, #1a0a2e 40%, #0d2818 60%, #0a1628 80%, #0a0a12 100%)',
    css: `
      background: #0a0a12;
      background-image:
        radial-gradient(ellipse 120% 60% at 20% 80%, rgba(0,229,255,0.15) 0%, transparent 60%),
        radial-gradient(ellipse 80% 50% at 60% 20%, rgba(124,58,237,0.18) 0%, transparent 55%),
        radial-gradient(ellipse 100% 40% at 80% 70%, rgba(34,197,94,0.1) 0%, transparent 50%),
        radial-gradient(ellipse 60% 60% at 40% 50%, rgba(0,229,255,0.06) 0%, transparent 50%);
    `,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    desc: 'Deep space blue',
    preview: 'linear-gradient(145deg, #020515, #0a1628, #0d0d2b)',
    css: `
      background: #020515;
      background-image:
        radial-gradient(ellipse 80% 80% at 30% 30%, rgba(10,22,40,0.8) 0%, transparent 70%),
        radial-gradient(ellipse 60% 60% at 70% 70%, rgba(13,13,43,0.6) 0%, transparent 60%),
        radial-gradient(circle at 50% 50%, rgba(124,58,237,0.04) 0%, transparent 50%);
    `,
  },
  {
    id: 'ember',
    name: 'Ember',
    desc: 'Warm dark ember glow',
    preview: 'linear-gradient(145deg, #0a0a0a, #1a0a0a, #0d0808)',
    css: `
      background: #0a0808;
      background-image:
        radial-gradient(ellipse 80% 60% at 25% 75%, rgba(239,68,68,0.12) 0%, transparent 60%),
        radial-gradient(ellipse 70% 50% at 70% 30%, rgba(245,158,11,0.1) 0%, transparent 55%),
        radial-gradient(ellipse 50% 40% at 50% 50%, rgba(239,68,68,0.04) 0%, transparent 40%);
    `,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    desc: 'Deep ocean blue-green',
    preview: 'linear-gradient(145deg, #020d15, #051a20, #03120a)',
    css: `
      background: #020d15;
      background-image:
        radial-gradient(ellipse 90% 70% at 30% 70%, rgba(0,229,255,0.1) 0%, transparent 60%),
        radial-gradient(ellipse 70% 50% at 70% 25%, rgba(34,197,94,0.08) 0%, transparent 55%),
        radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,100,180,0.06) 0%, transparent 50%);
    `,
  },
  {
    id: 'nebula',
    name: 'Nebula',
    desc: 'Purple cosmic nebula',
    preview: 'linear-gradient(145deg, #0a0515, #150a20, #0d0520)',
    css: `
      background: #0a0515;
      background-image:
        radial-gradient(ellipse 70% 60% at 25% 40%, rgba(124,58,237,0.18) 0%, transparent 55%),
        radial-gradient(ellipse 80% 50% at 75% 65%, rgba(167,139,250,0.1) 0%, transparent 55%),
        radial-gradient(ellipse 50% 50% at 50% 20%, rgba(236,72,153,0.08) 0%, transparent 50%),
        radial-gradient(ellipse 60% 40% at 60% 80%, rgba(0,229,255,0.06) 0%, transparent 45%);
    `,
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    desc: 'Clean dark minimal',
    preview: 'linear-gradient(145deg, #0a0a0a, #141414, #0d0d0d)',
    css: `
      background: #0a0a0a;
      background-image:
        radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 60%);
    `,
  },
  {
    id: 'dynamic',
    name: 'Dynamic',
    desc: 'Changes with time of day',
    preview: 'conic-gradient(from 180deg, #0a1628, #1a0a2e, #2e0a1a, #1a180a, #0a1628)',
    css: null, // special — computed from current hour
  },
];

let wallpaperEl = null;

export function initWallpaper() {
  // Create wallpaper layer behind the canvas
  const desktop = document.getElementById('desktop');
  if (!desktop) return;

  wallpaperEl = document.createElement('div');
  wallpaperEl.id = 'desktop-wallpaper';
  desktop.insertBefore(wallpaperEl, desktop.firstChild);

  applyWallpaper(getWallpaperId());

  // Update dynamic wallpaper every 10 minutes
  setInterval(() => {
    if (getWallpaperId() === 'dynamic') applyDynamic();
  }, 10 * 60 * 1000);
}

export function getWallpaperId() {
  return localStorage.getItem(LS_KEY) || DEFAULT_WALLPAPER;
}

export function setWallpaper(id) {
  localStorage.setItem(LS_KEY, id);
  applyWallpaper(id);
}

function applyWallpaper(id) {
  const canvas = document.getElementById('desktop-canvas');
  const wp = WALLPAPERS.find(w => w.id === id);
  if (!wp || !wallpaperEl) return;

  if (id === 'particles') {
    // Show canvas, hide wallpaper layer
    wallpaperEl.style.cssText = '';
    wallpaperEl.classList.remove('active');
    if (canvas) canvas.style.display = '';
  } else if (id === 'dynamic') {
    if (canvas) canvas.style.display = 'none';
    applyDynamic();
  } else {
    // Static gradient wallpaper
    if (canvas) canvas.style.display = 'none';
    wallpaperEl.style.cssText = wp.css;
    wallpaperEl.classList.add('active');
  }
}

function applyDynamic() {
  if (!wallpaperEl) return;
  const hour = new Date().getHours();

  let css;
  if (hour >= 5 && hour < 8) {
    // Dawn — warm orange/pink
    css = `
      background: #0d0808;
      background-image:
        radial-gradient(ellipse 90% 50% at 50% 90%, rgba(245,158,11,0.15) 0%, transparent 60%),
        radial-gradient(ellipse 70% 40% at 30% 60%, rgba(236,72,153,0.1) 0%, transparent 55%),
        radial-gradient(ellipse 60% 50% at 70% 40%, rgba(124,58,237,0.08) 0%, transparent 50%);
    `;
  } else if (hour >= 8 && hour < 12) {
    // Morning — bright blue
    css = `
      background: #050d18;
      background-image:
        radial-gradient(ellipse 80% 60% at 60% 30%, rgba(0,150,255,0.12) 0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 30% 60%, rgba(0,229,255,0.08) 0%, transparent 55%);
    `;
  } else if (hour >= 12 && hour < 17) {
    // Afternoon — cyan/green
    css = `
      background: #030d10;
      background-image:
        radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,229,255,0.1) 0%, transparent 55%),
        radial-gradient(ellipse 70% 50% at 30% 70%, rgba(34,197,94,0.08) 0%, transparent 50%);
    `;
  } else if (hour >= 17 && hour < 20) {
    // Evening — warm violet/orange
    css = `
      background: #0a0510;
      background-image:
        radial-gradient(ellipse 80% 50% at 50% 80%, rgba(245,158,11,0.12) 0%, transparent 55%),
        radial-gradient(ellipse 70% 60% at 60% 30%, rgba(124,58,237,0.15) 0%, transparent 55%),
        radial-gradient(ellipse 50% 40% at 30% 50%, rgba(236,72,153,0.06) 0%, transparent 45%);
    `;
  } else {
    // Night — deep purple/blue
    css = `
      background: #050510;
      background-image:
        radial-gradient(ellipse 80% 60% at 30% 30%, rgba(124,58,237,0.14) 0%, transparent 55%),
        radial-gradient(ellipse 60% 50% at 70% 70%, rgba(0,229,255,0.06) 0%, transparent 50%),
        radial-gradient(ellipse 40% 40% at 50% 50%, rgba(167,139,250,0.04) 0%, transparent 40%);
    `;
  }

  wallpaperEl.style.cssText = css;
  wallpaperEl.classList.add('active');
}
