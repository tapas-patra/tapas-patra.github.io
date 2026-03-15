// Skills.app — System Preferences-style skills viewer

const SKILL_CATEGORIES = [
  { id: 'languages', name: 'Languages',  icon: '\uD83D\uDCBB', fromGithub: true },
  { id: 'backend',   name: 'Backend',    icon: '\u2699\uFE0F' },
  { id: 'ai-ml',     name: 'AI / ML',    icon: '\uD83E\uDDE0' },
  { id: 'databases',  name: 'Databases',  icon: '\uD83D\uDDC4\uFE0F' },
  { id: 'testing',   name: 'Testing',    icon: '\uD83E\uDDEA' },
  { id: 'cloud',     name: 'Cloud',      icon: '\u2601\uFE0F' },
  { id: 'tools',     name: 'Tools',      icon: '\uD83D\uDEE0\uFE0F' },
];

// Manual skills (from profile.md spec — will eventually come from API)
const MANUAL_SKILLS = {
  backend:   [
    { name: 'FastAPI',       proficiency: 'expert',       years: 3 },
    { name: 'Node.js',       proficiency: 'advanced',     years: 4 },
    { name: 'Express',       proficiency: 'advanced',     years: 4 },
    { name: 'REST APIs',     proficiency: 'expert',       years: 5 },
    { name: 'GraphQL',       proficiency: 'intermediate', years: 2 },
    { name: 'Microservices', proficiency: 'advanced',     years: 3 },
  ],
  'ai-ml': [
    { name: 'RAG',               proficiency: 'advanced',     years: 1.5 },
    { name: 'LLM Integration',   proficiency: 'advanced',     years: 2 },
    { name: 'Prompt Engineering', proficiency: 'advanced',     years: 2 },
    { name: 'Embeddings',        proficiency: 'advanced',     years: 1.5 },
    { name: 'Vector Databases',  proficiency: 'intermediate', years: 1 },
  ],
  databases: [
    { name: 'PostgreSQL',  proficiency: 'expert',       years: 4 },
    { name: 'Supabase',    proficiency: 'advanced',     years: 2 },
    { name: 'MongoDB',     proficiency: 'intermediate', years: 3 },
    { name: 'Redis',       proficiency: 'intermediate', years: 2 },
  ],
  testing: [
    { name: 'Selenium',      proficiency: 'expert',   years: 4 },
    { name: 'Playwright',    proficiency: 'advanced',  years: 2 },
    { name: 'TestRail',      proficiency: 'expert',    years: 3 },
    { name: 'CI/CD Testing', proficiency: 'advanced',  years: 3 },
  ],
  cloud: [
    { name: 'AWS',                proficiency: 'intermediate', years: 3 },
    { name: 'GitHub Actions',     proficiency: 'advanced',     years: 3 },
    { name: 'Docker',             proficiency: 'advanced',     years: 3 },
    { name: 'Vercel',             proficiency: 'advanced',     years: 2 },
    { name: 'Render',             proficiency: 'intermediate', years: 1 },
    { name: 'Cloudflare Workers', proficiency: 'intermediate', years: 1 },
  ],
  tools: [
    { name: 'Git',     proficiency: 'expert',   years: 5 },
    { name: 'VS Code', proficiency: 'expert',   years: 5 },
    { name: 'Postman', proficiency: 'advanced',  years: 4 },
    { name: 'Jira',    proficiency: 'advanced',  years: 4 },
    { name: 'Linux',   proficiency: 'advanced',  years: 4 },
  ],
};

const PROFICIENCY_LEVELS = { beginner: 25, intermediate: 50, advanced: 75, expert: 95 };

let githubLanguages = {};

export async function init(container) {
  injectStyles();

  // Load GitHub language data
  try {
    const resp = await fetch('data.json');
    const data = await resp.json();
    githubLanguages = data.github?.languages || {};
  } catch { /* use empty */ }

  container.innerHTML = `
    <div class="skills-container">
      <div class="skills-grid" id="skills-grid">
        ${SKILL_CATEGORIES.map(cat => `
          <div class="skills-pane" data-cat="${cat.id}">
            <div class="skills-pane-icon">${cat.icon}</div>
            <div class="skills-pane-name">${cat.name}</div>
          </div>
        `).join('')}
      </div>
      <div class="skills-detail" id="skills-detail" style="display:none;">
        <button class="skills-back" id="skills-back">\u2190 All Skills</button>
        <div class="skills-detail-header" id="skills-detail-header"></div>
        <div class="skills-detail-list" id="skills-detail-list"></div>
      </div>
    </div>
  `;

  container.querySelector('#skills-grid').addEventListener('click', (e) => {
    const pane = e.target.closest('.skills-pane');
    if (pane) openCategory(container, pane.dataset.cat);
  });

  container.querySelector('#skills-back').addEventListener('click', () => {
    container.querySelector('#skills-grid').style.display = '';
    container.querySelector('#skills-detail').style.display = 'none';
  });
}

function openCategory(container, catId) {
  const cat = SKILL_CATEGORIES.find(c => c.id === catId);
  if (!cat) return;

  container.querySelector('#skills-grid').style.display = 'none';
  const detail = container.querySelector('#skills-detail');
  detail.style.display = '';

  container.querySelector('#skills-detail-header').innerHTML = `
    <span class="skills-detail-icon">${cat.icon}</span>
    <span class="skills-detail-title">${cat.name}</span>
  `;

  const list = container.querySelector('#skills-detail-list');

  if (cat.fromGithub) {
    // Languages from GitHub data
    const sorted = Object.entries(githubLanguages)
      .sort((a, b) => b[1].percentage - a[1].percentage);

    if (sorted.length === 0) {
      list.innerHTML = '<div class="skills-empty">No language data yet. Run sync-github workflow.</div>';
      return;
    }

    list.innerHTML = sorted.map(([lang, data]) => `
      <div class="skill-item">
        <div class="skill-item-header">
          <span class="skill-name">${lang}</span>
          <span class="skill-pct">${data.percentage}%</span>
        </div>
        <div class="skill-bar-track">
          <div class="skill-bar-fill github-lang" style="width:${data.percentage}%"></div>
        </div>
      </div>
    `).join('');
  } else {
    const skills = MANUAL_SKILLS[catId] || [];
    list.innerHTML = skills.map(s => `
      <div class="skill-item">
        <div class="skill-item-header">
          <span class="skill-name">${s.name}</span>
          <span class="skill-meta">${s.proficiency} \u00B7 ${s.years}y</span>
        </div>
        <div class="skill-bar-track">
          <div class="skill-bar-fill" style="width:${PROFICIENCY_LEVELS[s.proficiency] || 50}%"></div>
        </div>
      </div>
    `).join('');
  }
}

function injectStyles() {
  if (document.getElementById('skills-styles')) return;
  const s = document.createElement('style');
  s.id = 'skills-styles';
  s.textContent = `
    .skills-container { height:100%; overflow-y:auto; padding:20px; }

    .skills-grid {
      display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));
      gap:12px; max-width:600px; margin:0 auto;
    }
    .skills-pane {
      background:var(--glass); border:1px solid var(--glass-border); border-radius:12px;
      padding:20px 12px; text-align:center; cursor:pointer;
      transition:border-color 0.2s, background 0.2s, transform 0.15s;
    }
    .skills-pane:hover { border-color:var(--cyan); background:var(--glass-hover); transform:translateY(-2px); }
    .skills-pane-icon { font-size:32px; margin-bottom:8px; }
    .skills-pane-name { font-size:12px; color:var(--text-primary); font-weight:500; }

    .skills-detail { max-width:500px; margin:0 auto; }
    .skills-back {
      background:none; border:none; color:var(--cyan); font-size:12px;
      cursor:pointer; font-family:var(--font-body); margin-bottom:16px; padding:0;
    }
    .skills-back:hover { text-decoration:underline; }
    .skills-detail-header {
      display:flex; align-items:center; gap:10px; margin-bottom:20px;
    }
    .skills-detail-icon { font-size:28px; }
    .skills-detail-title { font-size:18px; font-weight:600; font-family:var(--font-display); }

    .skills-detail-list { display:flex; flex-direction:column; gap:14px; }
    .skills-empty { color:var(--text-dim); font-size:12px; font-family:var(--font-mono); text-align:center; padding:24px; }

    .skill-item {}
    .skill-item-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
    .skill-name { font-size:13px; color:var(--text-primary); font-weight:500; }
    .skill-pct { font-size:11px; color:var(--cyan); font-family:var(--font-mono); }
    .skill-meta { font-size:10px; color:var(--text-dim); font-family:var(--font-mono); text-transform:capitalize; }

    .skill-bar-track { height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; }
    .skill-bar-fill {
      height:100%; border-radius:3px; transition:width 0.6s cubic-bezier(0.4,0,0.2,1);
      background:linear-gradient(90deg, var(--violet), var(--cyan));
    }
    .skill-bar-fill.github-lang { background:linear-gradient(90deg, var(--cyan), var(--violet-light)); }
  `;
  document.head.appendChild(s);
}
