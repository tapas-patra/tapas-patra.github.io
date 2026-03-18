// Calendar.app — Monthly calendar view + career timeline events

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Career events — key dates
const EVENTS = [
  // Work
  { date: '2021-10-01', title: 'Joined Wipro Technologies', desc: 'Software Engineer (Automation) — Ford Motor Company account', category: 'work', icon: '\uD83C\uDFE2' },
  { date: '2022-01-15', title: 'First Automation Framework', desc: 'Architected end-to-end Python test automation framework', category: 'milestone', icon: '\u2B50' },
  { date: '2022-06-01', title: 'Rookie Rockstar Award', desc: 'Outstanding new joiner recognition at Wipro', category: 'award', icon: '\uD83C\uDFC6' },
  { date: '2022-09-01', title: 'Led Team of 16 Engineers', desc: 'Promoted to lead automation team for Ford project', category: 'milestone', icon: '\uD83D\uDE80' },
  { date: '2023-03-15', title: '500+ Test Scripts Milestone', desc: 'Automation suite crossed 500 automated test cases', category: 'milestone', icon: '\u2B50' },
  { date: '2023-06-01', title: 'Outstanding Performance (5/5)', desc: 'First outstanding performance rating at Wipro', category: 'award', icon: '\uD83C\uDFC6' },
  { date: '2023-09-01', title: 'Built 3 Production Tools', desc: 'Internal tools adopted across teams', category: 'milestone', icon: '\uD83D\uDD27' },
  { date: '2024-03-01', title: '1000+ Test Scripts', desc: 'Automation framework scaled to 1000+ test cases', category: 'milestone', icon: '\u2B50' },
  { date: '2024-06-01', title: '2nd Outstanding Rating (5/5)', desc: 'Back-to-back outstanding performance', category: 'award', icon: '\uD83C\uDFC6' },
  { date: '2024-09-01', title: '6+ Production Tools Built', desc: 'Suite of developer tools in production use', category: 'milestone', icon: '\uD83D\uDD27' },
  { date: '2025-03-01', title: '19th Performance Award', desc: 'Total of 19 awards in 4+ years at Wipro', category: 'award', icon: '\uD83C\uDFC6' },
  { date: '2025-12-31', title: 'Last Day at Wipro', desc: 'Completed 4+ years at Wipro Technologies', category: 'work', icon: '\uD83D\uDC4B' },
  { date: '2026-01-01', title: 'Joined Setu by Pine Labs', desc: 'SDET II — Building quality infrastructure for payments', category: 'work', icon: '\uD83C\uDFE2' },
  { date: '2026-02-01', title: 'TapasOS Launched', desc: 'AI-first portfolio disguised as a browser OS', category: 'project', icon: '\uD83D\uDDA5\uFE0F' },

  // Education
  { date: '2017-06-01', title: 'Started BCA', desc: 'Bachelor of Computer Applications — N.C. College', category: 'education', icon: '\uD83C\uDF93' },
  { date: '2020-06-01', title: 'Completed BCA', desc: 'Graduated with Bachelor of Computer Applications', category: 'education', icon: '\uD83C\uDF93' },
  { date: '2022-08-01', title: 'Started M.Tech at BITS Pilani', desc: 'M.Tech in Software Systems (WILP)', category: 'education', icon: '\uD83C\uDF93' },
];

const CATEGORY_COLORS = {
  work: { bg: 'rgba(0, 229, 255, 0.12)', border: 'rgba(0, 229, 255, 0.3)', text: 'var(--cyan)' },
  award: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' },
  milestone: { bg: 'rgba(124, 58, 237, 0.12)', border: 'rgba(124, 58, 237, 0.3)', text: 'var(--violet-light)' },
  education: { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' },
  project: { bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.3)', text: '#ec4899' },
};

let container = null;
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let selectedDate = null;
let activeView = 'calendar'; // 'calendar' or 'timeline'

export async function init(el) {
  container = el;
  injectStyles();
  render();
}

function render() {
  container.innerHTML = `
    <div class="cal-app">
      <div class="cal-sidebar">
        <div class="cal-sidebar-title">Calendar</div>
        <div class="cal-view-tabs">
          <button class="cal-view-tab ${activeView === 'calendar' ? 'active' : ''}" data-view="calendar">Calendar</button>
          <button class="cal-view-tab ${activeView === 'timeline' ? 'active' : ''}" data-view="timeline">Timeline</button>
        </div>
        <div class="cal-sidebar-section">
          <div class="cal-sidebar-label">Categories</div>
          ${Object.entries(CATEGORY_COLORS).map(([cat, c]) => `
            <div class="cal-cat-item">
              <span class="cal-cat-dot" style="background:${c.text}"></span>
              <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
              <span class="cal-cat-count">${EVENTS.filter(e => e.category === cat).length}</span>
            </div>
          `).join('')}
        </div>
        <div class="cal-sidebar-section">
          <div class="cal-sidebar-label">Total Events</div>
          <div class="cal-total">${EVENTS.length}</div>
        </div>
      </div>
      <div class="cal-main">
        ${activeView === 'calendar' ? renderCalendar() : renderTimeline()}
      </div>
    </div>
  `;

  bindEvents();
}

function renderCalendar() {
  const year = viewYear;
  const month = viewMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const monthEvents = EVENTS.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  let cells = '';

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells += '<div class="cal-cell cal-cell-empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = monthEvents.filter(e => e.date === dateStr);
    const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
    const isSelected = selectedDate === dateStr;

    cells += `
      <div class="cal-cell ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''} ${dayEvents.length ? 'cal-has-event' : ''}" data-date="${dateStr}">
        <span class="cal-day-num">${day}</span>
        ${dayEvents.length ? `<div class="cal-dots">${dayEvents.map(e => {
          const c = CATEGORY_COLORS[e.category] || CATEGORY_COLORS.work;
          return `<span class="cal-dot" style="background:${c.text}" title="${esc(e.title)}"></span>`;
        }).join('')}</div>` : ''}
      </div>
    `;
  }

  // Events for selected date
  const selEvents = selectedDate ? EVENTS.filter(e => e.date === selectedDate) : [];
  const eventPanel = selectedDate ? `
    <div class="cal-event-panel">
      <div class="cal-event-panel-date">${formatFullDate(selectedDate)}</div>
      ${selEvents.length === 0 ? '<div class="cal-no-events">No events on this date</div>' : ''}
      ${selEvents.map(e => {
        const c = CATEGORY_COLORS[e.category] || CATEGORY_COLORS.work;
        return `
          <div class="cal-event-card" style="background:${c.bg};border-left:3px solid ${c.border}">
            <div class="cal-event-icon">${e.icon}</div>
            <div class="cal-event-info">
              <div class="cal-event-title">${esc(e.title)}</div>
              <div class="cal-event-desc">${esc(e.desc)}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  return `
    <div class="cal-header">
      <button class="cal-nav-btn" data-dir="-1">\u2039</button>
      <div class="cal-month-label">${MONTHS[month]} ${year}</div>
      <button class="cal-nav-btn" data-dir="1">\u203A</button>
      <button class="cal-today-btn" data-action="today">Today</button>
    </div>
    <div class="cal-grid">
      ${DAYS.map(d => `<div class="cal-day-header">${d}</div>`).join('')}
      ${cells}
    </div>
    ${eventPanel}
  `;
}

function renderTimeline() {
  const sorted = [...EVENTS].sort((a, b) => new Date(b.date) - new Date(a.date));

  let currentYear = null;
  let html = '<div class="cal-timeline">';

  sorted.forEach(event => {
    const year = new Date(event.date).getFullYear();
    if (year !== currentYear) {
      currentYear = year;
      html += `<div class="cal-tl-year">${year}</div>`;
    }

    const c = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.work;
    html += `
      <div class="cal-tl-item">
        <div class="cal-tl-line" style="background:${c.text}"></div>
        <div class="cal-tl-dot" style="background:${c.text};box-shadow:0 0 8px ${c.border}"></div>
        <div class="cal-tl-card" style="border-left:3px solid ${c.border}">
          <div class="cal-tl-date">${formatShortDate(event.date)}</div>
          <div class="cal-tl-icon">${event.icon}</div>
          <div class="cal-tl-title">${esc(event.title)}</div>
          <div class="cal-tl-desc">${esc(event.desc)}</div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

function bindEvents() {
  // View tabs
  container.querySelectorAll('.cal-view-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeView = btn.dataset.view;
      render();
    });
  });

  // Month navigation
  container.querySelectorAll('.cal-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = parseInt(btn.dataset.dir, 10);
      viewMonth += dir;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      render();
    });
  });

  // Today button
  container.querySelector('[data-action="today"]')?.addEventListener('click', () => {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    selectedDate = null;
    render();
  });

  // Day click
  container.querySelectorAll('.cal-cell:not(.cal-cell-empty)').forEach(cell => {
    cell.addEventListener('click', () => {
      selectedDate = selectedDate === cell.dataset.date ? null : cell.dataset.date;
      render();
    });
  });
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function injectStyles() {
  if (document.getElementById('calendar-styles')) return;
  const style = document.createElement('style');
  style.id = 'calendar-styles';
  style.textContent = `
    .cal-app {
      display: flex;
      height: 100%;
      font-family: var(--font-body);
    }

    .cal-sidebar {
      width: 180px;
      flex-shrink: 0;
      background: rgba(0,0,0,0.2);
      border-right: 1px solid rgba(255,255,255,0.06);
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .cal-sidebar-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      padding: 0 4px;
    }

    .cal-view-tabs {
      display: flex;
      gap: 4px;
      padding: 0 2px;
    }

    .cal-view-tab {
      flex: 1;
      padding: 5px 0;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      color: var(--text-muted);
      font-family: var(--font-body);
      font-size: 11px;
      cursor: pointer;
      transition: background 0.12s, color 0.12s;
    }

    .cal-view-tab:hover { background: rgba(255,255,255,0.06); }
    .cal-view-tab.active { background: rgba(0,229,255,0.12); color: var(--cyan); border-color: rgba(0,229,255,0.2); }

    .cal-sidebar-section { padding: 0 4px; }

    .cal-sidebar-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 6px;
    }

    .cal-cat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-muted);
      padding: 3px 0;
    }

    .cal-cat-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .cal-cat-count {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
    }

    .cal-total {
      font-family: var(--font-mono);
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .cal-main {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
    }

    /* Calendar View */
    .cal-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .cal-month-label {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      min-width: 160px;
      text-align: center;
    }

    .cal-nav-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      color: var(--text-muted);
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.12s;
    }

    .cal-nav-btn:hover { background: rgba(255,255,255,0.08); }

    .cal-today-btn {
      margin-left: auto;
      padding: 4px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      color: var(--text-muted);
      font-family: var(--font-body);
      font-size: 11px;
      cursor: pointer;
      transition: background 0.12s, color 0.12s;
    }

    .cal-today-btn:hover { background: rgba(0,229,255,0.1); color: var(--cyan); }

    .cal-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }

    .cal-day-header {
      text-align: center;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
      padding: 4px 0 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .cal-cell {
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.12s;
      position: relative;
    }

    .cal-cell:hover { background: rgba(255,255,255,0.04); }
    .cal-cell-empty { cursor: default; }
    .cal-cell-empty:hover { background: transparent; }

    .cal-day-num {
      font-size: 13px;
      color: var(--text-muted);
    }

    .cal-today .cal-day-num {
      background: var(--cyan);
      color: #000;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 12px;
    }

    .cal-selected {
      background: rgba(0, 229, 255, 0.08);
      outline: 1px solid rgba(0, 229, 255, 0.2);
    }

    .cal-dots {
      display: flex;
      gap: 2px;
    }

    .cal-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
    }

    /* Event Panel */
    .cal-event-panel {
      margin-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.06);
      padding-top: 12px;
    }

    .cal-event-panel-date {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .cal-no-events {
      font-size: 11px;
      color: var(--text-dim);
    }

    .cal-event-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      margin-bottom: 6px;
    }

    .cal-event-icon { font-size: 18px; flex-shrink: 0; }

    .cal-event-info { flex: 1; min-width: 0; }

    .cal-event-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 2px;
    }

    .cal-event-desc {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Timeline View */
    .cal-timeline {
      position: relative;
      padding-left: 24px;
    }

    .cal-tl-year {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 16px 0 8px -8px;
    }

    .cal-tl-year:first-child { margin-top: 0; }

    .cal-tl-item {
      position: relative;
      padding-bottom: 16px;
      padding-left: 20px;
    }

    .cal-tl-line {
      position: absolute;
      left: 3px;
      top: 8px;
      bottom: 0;
      width: 2px;
      opacity: 0.2;
    }

    .cal-tl-item:last-child .cal-tl-line { display: none; }

    .cal-tl-dot {
      position: absolute;
      left: 0;
      top: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .cal-tl-card {
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(255,255,255,0.03);
    }

    .cal-tl-date {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
      margin-bottom: 2px;
    }

    .cal-tl-icon {
      float: right;
      font-size: 16px;
      margin-left: 8px;
    }

    .cal-tl-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 2px;
    }

    .cal-tl-desc {
      font-size: 11px;
      color: var(--text-muted);
    }
  `;
  document.head.appendChild(style);
}
