// Skills.app — System Preferences-style skills viewer (fetches from tapas-data)

const SKILLS_YAML_URL = 'https://tapas-patra.github.io/tapas-data/skills.yaml';
const PROFICIENCY_LEVELS = { beginner: 25, intermediate: 50, advanced: 75, expert: 95 };

let skillCategories = [];
let githubLanguages = {};

export async function init(container) {
  injectStyles();

  container.innerHTML = `
    <div class="skills-container">
      <div class="skills-loading">Loading skills...</div>
    </div>
  `;

  // Load GitHub languages and skills YAML in parallel
  const [langData, yamlText] = await Promise.all([
    fetch('data.json?t=' + Date.now()).then(r => r.json()).catch(() => ({})),
    fetch(SKILLS_YAML_URL + '?t=' + Date.now()).then(r => r.text()).catch(() => ''),
  ]);

  githubLanguages = langData.github?.languages || {};

  if (yamlText) {
    skillCategories = parseSkillsYaml(yamlText);
  }

  if (skillCategories.length === 0) {
    container.querySelector('.skills-container').innerHTML =
      '<div class="skills-empty">Could not load skills data.</div>';
    return;
  }

  container.querySelector('.skills-container').innerHTML = `
    <div class="skills-grid" id="skills-grid">
      ${skillCategories.map(cat => `
        <div class="skills-pane" data-cat="${cat.id}">
          <div class="skills-pane-icon">${cat.icon || '\uD83D\uDCCB'}</div>
          <div class="skills-pane-name">${cat.category}</div>
        </div>
      `).join('')}
    </div>
    <div class="skills-detail" id="skills-detail" style="display:none;">
      <button class="skills-back" id="skills-back">\u2190 All Skills</button>
      <div class="skills-detail-header" id="skills-detail-header"></div>
      <div class="skills-detail-list" id="skills-detail-list"></div>
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
  const cat = skillCategories.find(c => c.id === catId);
  if (!cat) return;

  container.querySelector('#skills-grid').style.display = 'none';
  const detail = container.querySelector('#skills-detail');
  detail.style.display = '';

  container.querySelector('#skills-detail-header').innerHTML = `
    <span class="skills-detail-icon">${cat.icon || '\uD83D\uDCCB'}</span>
    <span class="skills-detail-title">${cat.category}</span>
  `;

  const list = container.querySelector('#skills-detail-list');

  if (cat.from_github) {
    const sorted = Object.entries(githubLanguages)
      .sort((a, b) => b[1].percentage - a[1].percentage);

    if (sorted.length === 0) {
      list.innerHTML = '<div class="skills-empty">No language data yet.</div>';
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
    const skills = cat.skills || [];
    if (skills.length === 0) {
      list.innerHTML = '<div class="skills-empty">No skills listed.</div>';
      return;
    }
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

// ── Minimal YAML parser for skills.yaml structure ──
function parseSkillsYaml(text) {
  const entries = [];
  const blocks = text.split(/\n  - id:\s*/);
  blocks.shift(); // Remove header before first entry

  for (const block of blocks) {
    const entry = { id: '', category: '', icon: '', from_github: false, skills: [] };
    const lines = block.split('\n');

    entry.id = lines[0].trim();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^\s{4}(\w[\w_]*):\s*(.+)/);
      if (match) {
        const [, key, val] = match;
        if (key === 'category') entry.category = val.trim();
        else if (key === 'icon') entry.icon = val.trim().replace(/^["']|["']$/g, '');
        else if (key === 'from_github') entry.from_github = val.trim() === 'true';
      }

      // Parse skills array
      if (line.match(/^\s{4}skills:\s*$/)) {
        for (let j = i + 1; j < lines.length; j++) {
          const sLine = lines[j];
          if (sLine.match(/^\s{6}- name:\s*/)) {
            const skill = { name: '', proficiency: 'intermediate', years: 0 };
            skill.name = sLine.replace(/^\s{6}- name:\s*/, '').trim();
            // Read next lines for proficiency and years
            for (let k = j + 1; k < lines.length && k <= j + 3; k++) {
              const pMatch = lines[k].match(/^\s{8}proficiency:\s*(.+)/);
              const yMatch = lines[k].match(/^\s{8}years:\s*(.+)/);
              if (pMatch) skill.proficiency = pMatch[1].trim();
              if (yMatch) skill.years = parseFloat(yMatch[1].trim());
            }
            entry.skills.push(skill);
          }
          // Stop if we hit another top-level key (text:, etc.)
          if (sLine.match(/^\s{4}\w/) && !sLine.match(/^\s{6}/)) break;
        }
      }
    }

    if (entry.id && entry.category) entries.push(entry);
  }

  return entries;
}

// ── Styles ──
function injectStyles() {
  if (document.getElementById('skills-styles')) return;
  const s = document.createElement('style');
  s.id = 'skills-styles';
  s.textContent = `
    .skills-container { height:100%; overflow-y:auto; padding:20px; }
    .skills-loading, .skills-empty {
      display:flex; align-items:center; justify-content:center; height:100%;
      color:var(--text-dim); font-size:13px; font-family:var(--font-mono);
    }

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
