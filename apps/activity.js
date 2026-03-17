// Activity.monitor — GitHub stats dashboard

export async function init(container) {
  injectStyles();

  container.innerHTML = `
    <div class="activity-container">
      <div class="activity-loading">Loading activity data...</div>
    </div>
  `;

  let data;
  try {
    const resp = await fetch('data.json?t=' + Date.now());
    data = await resp.json();
  } catch {
    container.querySelector('.activity-container').innerHTML =
      '<div class="activity-empty">Could not load activity data. Run sync-github workflow.</div>';
    return;
  }

  const gh = data.github || {};

  container.querySelector('.activity-container').innerHTML = `
    <div class="activity-stats" id="activity-stats">
      <div class="activity-stat">
        <div class="activity-stat-value" data-target="${gh.total_commits_year || 0}">0</div>
        <div class="activity-stat-label">Commits this year</div>
      </div>
      <div class="activity-stat">
        <div class="activity-stat-value" data-target="${gh.streak_days || 0}">0</div>
        <div class="activity-stat-label">Day streak</div>
      </div>
      <div class="activity-stat">
        <div class="activity-stat-value" data-target="${gh.total_repos || 0}">0</div>
        <div class="activity-stat-label">Repositories</div>
      </div>
      <div class="activity-stat">
        <div class="activity-stat-value" data-target="${Object.keys(gh.languages || {}).length}">0</div>
        <div class="activity-stat-label">Languages</div>
      </div>
    </div>

    <div class="activity-section">
      <div class="activity-section-title">Contribution Graph (52 weeks)</div>
      <div class="activity-graph" id="activity-graph"></div>
    </div>

    <div class="activity-columns">
      <div class="activity-section" style="flex:1;">
        <div class="activity-section-title">Language Breakdown</div>
        <canvas id="activity-donut" width="180" height="180"></canvas>
        <div class="activity-legend" id="activity-legend"></div>
      </div>
      <div class="activity-section" style="flex:1;">
        <div class="activity-section-title">GitHub Status</div>
        <div class="activity-status">
          <div class="activity-status-row">
            <span>Committed today</span>
            <span class="activity-dot ${gh.committed_today ? 'active' : ''}">${gh.committed_today ? 'Yes' : 'Not yet'}</span>
          </div>
          <div class="activity-status-row">
            <span>Last updated</span>
            <span style="color:var(--text-dim);font-size:11px;font-family:var(--font-mono);">${formatDate(data.meta?.last_updated)}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  animateCounters();
  renderContributionGraph(gh.commit_weeks || []);
  renderDonutChart(gh.languages || {});
}

function animateCounters() {
  document.querySelectorAll('.activity-stat-value[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target) || 0;
    if (target === 0) return;
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(target * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function renderContributionGraph(weeks) {
  const graph = document.getElementById('activity-graph');
  if (!graph || weeks.length === 0) {
    if (graph) graph.innerHTML = '<div class="activity-empty-small">No contribution data yet</div>';
    return;
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS = ['Sun','','Mon','','Wed','','Fri'];

  // Normalize weeks: support both {days:[{count,date}]} and [0,2,3,...] formats
  const normalized = weeks.map(week => {
    const days = week.days || week;
    return days.map(d => typeof d === 'number' ? { count: d, date: '' } : d);
  });

  // Build month labels from first day of each week
  let monthLabels = '';
  let lastMonth = -1;
  normalized.forEach((week, i) => {
    const firstDay = week[0];
    if (firstDay && firstDay.date) {
      const month = new Date(firstDay.date).getMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        monthLabels += `<div class="contrib-month" style="grid-column:${i + 2}">${MONTHS[month]}</div>`;
      }
    }
  });

  // Day labels (left column)
  const dayLabelsHtml = DAYS.map(d =>
    `<div class="contrib-day-label">${d}</div>`
  ).join('');

  // Grid cells: 7 rows (Sun–Sat) x N columns (weeks)
  let cellsHtml = '';
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < normalized.length; col++) {
      const day = normalized[col][row];
      if (!day) {
        cellsHtml += '<div class="contrib-day empty"></div>';
        continue;
      }
      const count = day.count || 0;
      const level = getContribLevel(count);
      const title = day.date ? `${day.date}: ${count} contributions` : `${count} contributions`;
      cellsHtml += `<div class="contrib-day level-${level}" title="${title}"></div>`;
    }
  }

  const totalCols = normalized.length;
  graph.innerHTML = `
    <div class="contrib-wrapper">
      <div class="contrib-months" style="grid-template-columns: 28px repeat(${totalCols}, 1fr)">
        <div></div>${monthLabels}
      </div>
      <div class="contrib-grid" style="grid-template-columns: 28px repeat(${totalCols}, 1fr)">
        ${DAYS.map((d, i) => `<div class="contrib-day-label">${d}</div>${normalized.map((week, col) => {
          const day = week[i];
          if (!day) return '<div class="contrib-day empty"></div>';
          const count = day.count || 0;
          const level = getContribLevel(count);
          const title = day.date ? `${day.date}: ${count} contributions` : `${count} contributions`;
          return `<div class="contrib-day level-${level}" title="${title}"></div>`;
        }).join('')}`).join('')}
      </div>
    </div>`;
}

function getContribLevel(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

function renderDonutChart(languages) {
  const canvas = document.getElementById('activity-donut');
  const legend = document.getElementById('activity-legend');
  if (!canvas || !legend) return;

  const allSorted = Object.entries(languages)
    .sort((a, b) => b[1].percentage - a[1].percentage);

  // Show top languages individually, group the rest as "Other"
  const TOP = 10;
  let sorted;
  if (allSorted.length > TOP) {
    const top = allSorted.slice(0, TOP);
    const otherPct = allSorted.slice(TOP).reduce((sum, [, d]) => sum + d.percentage, 0);
    sorted = [...top, ['Other', { percentage: Math.round(otherPct * 10) / 10 }]];
  } else {
    sorted = allSorted;
  }

  if (sorted.length === 0) {
    legend.innerHTML = '<div class="activity-empty-small">No language data</div>';
    return;
  }

  const colors = ['#00E5FF', '#7C3AED', '#A78BFA', '#27C93F', '#FFBD2E', '#FF5F56', '#3178c6', '#f1e05a', '#e44d26', '#42b883', '#8957e5', '#6B8FA3'];
  const ctx = canvas.getContext('2d');
  const cx = 90, cy = 90, outer = 80, inner = 50;

  let startAngle = -Math.PI / 2;
  sorted.forEach(([, data], i) => {
    const slice = (data.percentage / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, startAngle, startAngle + slice);
    ctx.arc(cx, cy, inner, startAngle + slice, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    startAngle += slice;
  });

  // Center text
  ctx.fillStyle = '#E8F4F8';
  ctx.font = '600 16px "Syne", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sorted.length.toString(), cx, cy - 6);
  ctx.font = '400 9px "DM Sans", sans-serif';
  ctx.fillStyle = '#6B8FA3';
  ctx.fillText('languages', cx, cy + 10);

  // Legend
  legend.innerHTML = sorted.map(([lang, data], i) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${colors[i % colors.length]}"></span>
      <span class="legend-name">${lang}</span>
      <span class="legend-pct">${data.percentage}%</span>
    </div>
  `).join('');
}

function formatDate(iso) {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function injectStyles() {
  if (document.getElementById('activity-styles')) return;
  const s = document.createElement('style');
  s.id = 'activity-styles';
  s.textContent = `
    .activity-container { height:100%; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:16px; }
    .activity-loading, .activity-empty {
      display:flex; align-items:center; justify-content:center; height:100%;
      color:var(--text-dim); font-size:13px; font-family:var(--font-mono);
    }
    .activity-empty-small { color:var(--text-dim); font-size:11px; font-family:var(--font-mono); text-align:center; padding:16px; }

    .activity-stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; }
    .activity-stat {
      background:var(--glass); border:1px solid var(--glass-border); border-radius:10px;
      padding:14px 10px; text-align:center;
    }
    .activity-stat-value {
      font-family:var(--font-display); font-size:24px; font-weight:700; color:var(--cyan);
    }
    .activity-stat-label { font-size:10px; color:var(--text-muted); margin-top:4px; }

    .activity-section {
      background:var(--glass); border:1px solid var(--glass-border); border-radius:10px; padding:14px;
    }
    .activity-section-title {
      font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:12px;
    }

    .activity-columns { display:flex; gap:12px; }

    /* Contribution graph — GitHub-style grid */
    .contrib-wrapper { overflow-x:auto; padding-bottom:4px; }
    .contrib-months {
      display:grid; gap:2px; margin-bottom:4px;
    }
    .contrib-month {
      font-size:9px; color:var(--text-dim); font-family:var(--font-mono);
      white-space:nowrap;
    }
    .contrib-grid {
      display:grid; gap:2px;
    }
    .contrib-day-label {
      font-size:9px; color:var(--text-dim); font-family:var(--font-mono);
      display:flex; align-items:center; height:10px;
    }
    .contrib-day {
      width:auto; height:10px; min-width:10px; border-radius:2px;
    }
    .contrib-day.empty { background:transparent; }
    .contrib-day.level-0 { background:rgba(255,255,255,0.04); }
    .contrib-day.level-1 { background:rgba(0,229,255,0.2); }
    .contrib-day.level-2 { background:rgba(0,229,255,0.4); }
    .contrib-day.level-3 { background:rgba(0,229,255,0.65); }
    .contrib-day.level-4 { background:#00E5FF; box-shadow:0 0 4px rgba(0,229,255,0.3); }

    /* Donut legend */
    .activity-legend { display:flex; flex-wrap:wrap; gap:6px 14px; margin-top:12px; }
    .legend-item { display:flex; align-items:center; gap:5px; font-size:11px; }
    .legend-dot { width:8px; height:8px; border-radius:2px; flex-shrink:0; }
    .legend-name { color:var(--text-muted); }
    .legend-pct { color:var(--text-dim); font-family:var(--font-mono); font-size:10px; }

    /* Status */
    .activity-status { display:flex; flex-direction:column; gap:12px; }
    .activity-status-row { display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-muted); }
    .activity-dot { font-size:11px; font-family:var(--font-mono); color:var(--text-dim); }
    .activity-dot.active { color:var(--cyan); }
  `;
  document.head.appendChild(s);
}
