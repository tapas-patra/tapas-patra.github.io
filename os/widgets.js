// Desktop Widgets — real data only, no fakes
// Clock, Mini Calendar, GitHub Heatmap, Quick Stats
// Freely draggable, positions persisted in localStorage

const LS_POSITIONS = 'tapasos-widget-positions';

let widgetLayer = null;
let clockTimer = null;
let githubData = null;
let savedPositions = {};

export function initWidgets() {
  injectStyles();

  try { savedPositions = JSON.parse(localStorage.getItem(LS_POSITIONS)) || {}; } catch { savedPositions = {}; }

  widgetLayer = document.createElement('div');
  widgetLayer.id = 'widget-layer';
  const desktop = document.getElementById('desktop');
  desktop.appendChild(widgetLayer);

  // Fetch real data then render
  fetchGitHubData().then(() => render());
}

async function fetchGitHubData() {
  try {
    const resp = await fetch('data.json');
    if (resp.ok) {
      const data = await resp.json();
      githubData = data.github || null;
    }
  } catch { /* no data available */ }
}

function render() {
  widgetLayer.innerHTML = '';

  // Use requestAnimationFrame to ensure layout is ready
  requestAnimationFrame(() => {
    const lw = widgetLayer.offsetWidth || window.innerWidth;
    const lh = widgetLayer.offsetHeight || window.innerHeight;

    // Default right-column positions — stacked vertically with 10px gap
    const rightX = lw - 240; // 220px widget + 20px margin

    const widgets = [];
    widgets.push(createClockWidget());
    widgets.push(createCalendarWidget());
    if (githubData?.commit_weeks?.length) widgets.push(createHeatmapWidget());
    if (githubData) widgets.push(createStatsWidget());

    let nextY = 16;
    widgets.forEach(w => {
      const id = w.id;
      // Use saved position if available, otherwise stack them
      if (savedPositions[id]) {
        const pos = savedPositions[id];
        const x = Math.max(0, Math.min(pos.x, lw - 240));
        const y = Math.max(0, Math.min(pos.y, lh - 60));
        w.style.left = `${x}px`;
        w.style.top = `${y}px`;
      } else {
        w.style.left = `${Math.max(0, rightX)}px`;
        w.style.top = `${nextY}px`;
      }
      widgetLayer.appendChild(w);
      makeDraggable(w);

      // Calculate next Y based on actual rendered height
      if (!savedPositions[id]) {
        nextY += w.offsetHeight + 10;
      }
    });
  });
}

function savePositions() {
  const widgets = widgetLayer.querySelectorAll('.wgt');
  const pos = {};
  widgets.forEach(w => {
    pos[w.id] = { x: parseInt(w.style.left) || 0, y: parseInt(w.style.top) || 0 };
  });
  savedPositions = pos;
  localStorage.setItem(LS_POSITIONS, JSON.stringify(pos));
}

function makeDraggable(widget) {
  const handle = widget.querySelector('.wgt-drag-handle');
  const el = handle || widget;
  let dragging = false;
  let startX, startY, origX, origY;

  el.addEventListener('mousedown', onDown);
  el.addEventListener('touchstart', onDown, { passive: false });

  function onDown(e) {
    // Ignore if clicking inside interactive content
    if (e.target.closest('a, button, input, select')) return;

    dragging = true;
    widget.classList.add('wgt-dragging');
    widget.style.zIndex = 10;

    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;
    origX = parseInt(widget.style.left) || 0;
    origY = parseInt(widget.style.top) || 0;

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);

    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - startX;
    const dy = point.clientY - startY;

    const layerRect = widgetLayer.getBoundingClientRect();
    const wRect = widget.getBoundingClientRect();

    let nx = origX + dx;
    let ny = origY + dy;

    // Clamp within widget layer
    nx = Math.max(0, Math.min(nx, layerRect.width - wRect.width));
    ny = Math.max(0, Math.min(ny, layerRect.height - wRect.height));

    widget.style.left = `${nx}px`;
    widget.style.top = `${ny}px`;

    e.preventDefault();
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    widget.classList.remove('wgt-dragging');
    widget.style.zIndex = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    savePositions();
  }
}

// ── Clock Widget ──
function createClockWidget() {
  const w = makeWidget('widget-clock');
  const content = document.createElement('div');
  content.className = 'wgt-clock-content';
  w.querySelector('.wgt-body').appendChild(content);

  function tick() {
    const now = new Date();
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const day = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    content.innerHTML = `
      <div class="wgt-clock-time">${h12}:${m}<span class="wgt-clock-ampm">${ampm}</span></div>
      <div class="wgt-clock-date">${day}</div>
    `;
  }

  tick();
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(tick, 1000);

  return w;
}

// ── Mini Calendar Widget ──
function createCalendarWidget() {
  const w = makeWidget('widget-calendar');
  const body = w.querySelector('.wgt-body');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  let grid = '<div class="wgt-cal-grid">';
  days.forEach(d => { grid += `<div class="wgt-cal-head">${d}</div>`; });

  for (let i = 0; i < firstDay; i++) {
    grid += '<div class="wgt-cal-empty"></div>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today;
    grid += `<div class="wgt-cal-day ${isToday ? 'wgt-cal-today' : ''}">${d}</div>`;
  }

  grid += '</div>';

  body.innerHTML = `
    <div class="wgt-cal-month">${monthName}</div>
    ${grid}
  `;

  return w;
}

// ── GitHub Heatmap Widget ──
function createHeatmapWidget() {
  const w = makeWidget('widget-heatmap');
  const body = w.querySelector('.wgt-body');

  // Get last 12 weeks of commit data
  const weeks = githubData.commit_weeks || [];
  const recentWeeks = weeks.slice(-12);

  body.innerHTML = `
    <div class="wgt-hm-title">GitHub Contributions</div>
    <div class="wgt-hm-grid">
      ${recentWeeks.map(week =>
        `<div class="wgt-hm-col">${week.days.map(day => {
          const level = day.count === 0 ? 0 : day.count <= 2 ? 1 : day.count <= 5 ? 2 : day.count <= 10 ? 3 : 4;
          return `<div class="wgt-hm-cell wgt-hm-l${level}" title="${day.date}: ${day.count} commits"></div>`;
        }).join('')}</div>`
      ).join('')}
    </div>
    <div class="wgt-hm-legend">
      <span class="wgt-hm-legend-label">Less</span>
      <div class="wgt-hm-cell wgt-hm-l0"></div>
      <div class="wgt-hm-cell wgt-hm-l1"></div>
      <div class="wgt-hm-cell wgt-hm-l2"></div>
      <div class="wgt-hm-cell wgt-hm-l3"></div>
      <div class="wgt-hm-cell wgt-hm-l4"></div>
      <span class="wgt-hm-legend-label">More</span>
    </div>
  `;

  return w;
}

// ── Quick Stats Widget ──
function createStatsWidget() {
  const w = makeWidget('widget-stats');
  const body = w.querySelector('.wgt-body');

  const g = githubData;
  const stats = [];

  if (g.total_repos) stats.push({ label: 'Repos', value: g.total_repos });
  if (g.streak_days != null) stats.push({ label: 'Streak', value: `${g.streak_days}d` });
  if (g.total_commits_year) stats.push({ label: 'Commits', value: g.total_commits_year });

  // Top languages from real data
  const langs = g.languages || {};
  const topLangs = Object.entries(langs)
    .sort((a, b) => b[1].percentage - a[1].percentage)
    .slice(0, 4);

  body.innerHTML = `
    ${stats.length ? `
      <div class="wgt-stats-row">
        ${stats.map(s => `
          <div class="wgt-stat">
            <div class="wgt-stat-value">${s.value}</div>
            <div class="wgt-stat-label">${s.label}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
    ${topLangs.length ? `
      <div class="wgt-langs">
        <div class="wgt-langs-bar">
          ${topLangs.map(([name, info]) => `<div class="wgt-lang-seg" style="width:${info.percentage}%;background:${langColor(name)}" title="${name}: ${info.percentage}%"></div>`).join('')}
        </div>
        <div class="wgt-langs-labels">
          ${topLangs.map(([name, info]) => `
            <span class="wgt-lang-item">
              <span class="wgt-lang-dot" style="background:${langColor(name)}"></span>
              ${name} <span class="wgt-lang-pct">${info.percentage}%</span>
            </span>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;

  return w;
}

// ── Helpers ──

function makeWidget(id) {
  const w = document.createElement('div');
  w.className = 'wgt';
  w.id = id;
  w.innerHTML = `
    <div class="wgt-drag-handle">
      <div class="wgt-drag-dots"></div>
    </div>
    <div class="wgt-body"></div>
  `;
  return w;
}

const LANG_COLORS = {
  Python: '#3572A5',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  'C#': '#178600',
  Shell: '#89e051',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  TeX: '#3D6117',
  SCSS: '#c6538c',
  PLpgSQL: '#336790',
  Dockerfile: '#384d54',
};

function langColor(name) {
  return LANG_COLORS[name] || '#8b8b8b';
}

function injectStyles() {
  if (document.getElementById('widget-styles')) return;
  const style = document.createElement('style');
  style.id = 'widget-styles';
  style.textContent = `
    #widget-layer {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      overflow: hidden;
    }

    .wgt {
      position: absolute;
      pointer-events: auto;
      background: rgba(18, 18, 30, 0.55);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      width: 220px;
      overflow: hidden;
      transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
    }

    .wgt:hover {
      background: rgba(18, 18, 30, 0.7);
      border-color: rgba(255,255,255,0.1);
    }

    .wgt:hover .wgt-drag-handle {
      opacity: 1;
    }

    .wgt.wgt-dragging {
      cursor: grabbing;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      border-color: rgba(0, 229, 255, 0.2);
      background: rgba(18, 18, 30, 0.8);
      transform: scale(1.02);
      transition: background 0.1s, border-color 0.1s, box-shadow 0.1s, transform 0.15s;
    }

    .wgt-drag-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px 0 0;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .wgt-drag-dots {
      width: 32px;
      height: 4px;
      border-radius: 2px;
      background: rgba(255,255,255,0.15);
    }

    .wgt-body {
      padding: 10px 14px 14px;
    }

    /* ── Clock ── */
    .wgt-clock-time {
      font-family: var(--font-display);
      font-size: 36px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }

    .wgt-clock-ampm {
      font-size: 14px;
      font-weight: 400;
      color: var(--text-muted);
      margin-left: 4px;
    }

    .wgt-clock-date {
      font-family: var(--font-body);
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* ── Mini Calendar ── */
    .wgt-cal-month {
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .wgt-cal-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
      text-align: center;
    }

    .wgt-cal-head {
      font-family: var(--font-mono);
      font-size: 8px;
      color: var(--text-dim);
      padding: 2px 0;
    }

    .wgt-cal-empty {
      padding: 2px 0;
    }

    .wgt-cal-day {
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--text-muted);
      padding: 2px 0;
      border-radius: 4px;
    }

    .wgt-cal-today {
      background: var(--cyan, #00e5ff);
      color: #000;
      font-weight: 700;
    }

    /* ── GitHub Heatmap ── */
    .wgt-hm-title {
      font-family: var(--font-body);
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .wgt-hm-grid {
      display: flex;
      gap: 2px;
      justify-content: flex-end;
    }

    .wgt-hm-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .wgt-hm-cell {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .wgt-hm-l0 { background: rgba(255,255,255,0.04); }
    .wgt-hm-l1 { background: rgba(0, 229, 255, 0.15); }
    .wgt-hm-l2 { background: rgba(0, 229, 255, 0.35); }
    .wgt-hm-l3 { background: rgba(0, 229, 255, 0.6); }
    .wgt-hm-l4 { background: rgba(0, 229, 255, 0.9); }

    .wgt-hm-legend {
      display: flex;
      align-items: center;
      gap: 3px;
      justify-content: flex-end;
      margin-top: 6px;
    }

    .wgt-hm-legend .wgt-hm-cell {
      width: 8px;
      height: 8px;
    }

    .wgt-hm-legend-label {
      font-family: var(--font-mono);
      font-size: 8px;
      color: var(--text-dim);
    }

    /* ── Quick Stats ── */
    .wgt-stats-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }

    .wgt-stat {
      flex: 1;
      text-align: center;
      padding: 6px 4px;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
    }

    .wgt-stat-value {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      color: var(--cyan, #00e5ff);
      line-height: 1.2;
    }

    .wgt-stat-label {
      font-family: var(--font-mono);
      font-size: 8px;
      color: var(--text-dim);
      margin-top: 2px;
    }

    /* ── Language Bar ── */
    .wgt-langs {
      margin-top: 2px;
    }

    .wgt-langs-bar {
      display: flex;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      background: rgba(255,255,255,0.04);
    }

    .wgt-lang-seg {
      min-width: 3px;
      transition: width 0.3s ease;
    }

    .wgt-langs-labels {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }

    .wgt-lang-item {
      display: flex;
      align-items: center;
      gap: 3px;
      font-family: var(--font-mono);
      font-size: 8px;
      color: var(--text-muted);
    }

    .wgt-lang-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .wgt-lang-pct {
      color: var(--text-dim);
    }
  `;
  document.head.appendChild(style);
}
