// Awards.app — Trophy shelf

const AWARDS = [
  { name: 'Outstanding Performance',     count: 2, years: '2022–2024', icon: '\uD83C\uDF1F', desc: 'Top performance rating across all review cycles. Recognized for consistent delivery of high-impact projects.' },
  { name: 'Excellence Award',            count: 3, years: '2021–2024', icon: '\uD83C\uDFC6', desc: 'Awarded for exceptional contribution to team goals and going above and beyond regular responsibilities.' },
  { name: 'Innovation Champion',         count: 2, years: '2022–2023', icon: '\uD83D\uDCA1', desc: 'Recognized for introducing novel solutions and tools that improved team productivity significantly.' },
  { name: 'Quality Champion',            count: 3, years: '2021–2024', icon: '\uD83D\uDEE1\uFE0F', desc: 'Awarded for maintaining zero production defects and establishing quality best practices.' },
  { name: 'Team Player',                 count: 2, years: '2022–2023', icon: '\uD83E\uDD1D', desc: 'Recognized by peers for collaboration, knowledge sharing, and mentoring junior team members.' },
  { name: 'Automation Hero',             count: 2, years: '2022–2024', icon: '\u2699\uFE0F', desc: 'Recognized for automating manual processes and saving significant engineering hours.' },
  { name: 'On-Time Delivery',            count: 3, years: '2021–2024', icon: '\u23F0', desc: 'Consistently delivered projects on or ahead of schedule without compromising quality.' },
  { name: 'Customer Impact',             count: 2, years: '2023–2024', icon: '\uD83C\uDFAF', desc: 'Recognized for building features that directly improved customer satisfaction metrics.' },
];

const TOTAL_AWARDS = AWARDS.reduce((sum, a) => sum + a.count, 0);

export function init(container) {
  injectStyles();

  container.innerHTML = `
    <div class="awards-container">
      <div class="awards-summary">
        <span class="awards-summary-number">${TOTAL_AWARDS}</span> awards
        <span class="awards-summary-sep">\u00B7</span> 4 years
        <span class="awards-summary-sep">\u00B7</span> 2\u00D7 Outstanding Performance Rating
      </div>
      <div class="awards-grid">
        ${AWARDS.map(a => `
          <div class="award-card">
            <div class="award-card-icon">${a.icon}</div>
            <div class="award-card-name">${a.name}</div>
            <div class="award-card-meta">
              <span class="award-count">\u00D7${a.count}</span>
              <span class="award-years">${a.years}</span>
            </div>
            <div class="award-card-desc">${a.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function injectStyles() {
  if (document.getElementById('awards-styles')) return;
  const s = document.createElement('style');
  s.id = 'awards-styles';
  s.textContent = `
    .awards-container { height:100%; overflow-y:auto; padding:20px; }

    .awards-summary {
      text-align:center; margin-bottom:20px; font-size:13px; color:var(--text-muted);
    }
    .awards-summary-number {
      font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--cyan);
    }
    .awards-summary-sep { color:var(--text-dim); margin:0 6px; }

    .awards-grid {
      display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:12px;
    }

    .award-card {
      background:var(--glass); border:1px solid var(--glass-border); border-radius:12px;
      padding:16px; text-align:center; transition:border-color 0.2s, transform 0.2s, box-shadow 0.2s;
      cursor:default; position:relative; overflow:hidden;
    }
    .award-card:hover {
      border-color:var(--violet); transform:translateY(-3px);
      box-shadow:0 8px 24px rgba(124,58,237,0.15);
    }

    .award-card-icon { font-size:36px; margin-bottom:8px; }
    .award-card-name { font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:6px; }
    .award-card-meta { display:flex; justify-content:center; gap:10px; font-size:11px; margin-bottom:8px; }
    .award-count {
      background:var(--violet); color:#fff; padding:1px 8px; border-radius:10px;
      font-family:var(--font-mono); font-size:10px;
    }
    .award-years { color:var(--text-dim); font-family:var(--font-mono); font-size:10px; }

    .award-card-desc {
      font-size:11px; color:var(--text-muted); line-height:1.5;
      max-height:0; overflow:hidden; opacity:0;
      transition:max-height 0.3s ease, opacity 0.3s ease;
    }
    .award-card:hover .award-card-desc {
      max-height:100px; opacity:1;
    }
  `;
  document.head.appendChild(s);
}
