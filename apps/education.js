// Education.app — Card grid view, fetches from tapas-data/education.yaml

const EDU_YAML_URL = 'https://tapas-patra.github.io/tapas-data/education.yaml';

export async function init(container) {
  injectStyles();

  container.innerHTML = `
    <div class="edu-container">
      <div class="edu-loading">Loading education...</div>
    </div>
  `;

  let entries = [];
  try {
    const text = await fetch(EDU_YAML_URL + '?t=' + Date.now()).then(r => r.text());
    entries = parseEducationYaml(text);
  } catch { /* */ }

  if (entries.length === 0) {
    container.querySelector('.edu-container').innerHTML =
      '<div class="edu-empty">Could not load education data.</div>';
    return;
  }

  container.querySelector('.edu-container').innerHTML = `
    <div class="edu-header">
      <div class="edu-title">Education</div>
    </div>
    <div class="edu-grid">
      ${entries.map(e => `
        <div class="edu-card">
          <div class="edu-icon">${getEduIcon(e.degree)}</div>
          <div class="edu-degree">${esc(e.degree)}</div>
          ${e.institution ? `<div class="edu-inst">${esc(e.institution)}</div>` : ''}
          <div class="edu-period">${esc(e.period)}</div>
          ${e.text ? `<div class="edu-desc">${esc(e.text)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function getEduIcon(degree) {
  const d = degree.toLowerCase();
  if (d.includes('m.tech') || d.includes('master')) return '\uD83C\uDF93';
  if (d.includes('bachelor') || d.includes('b.c.a')) return '\uD83D\uDCDA';
  return '\uD83C\uDFEB';
}

function parseEducationYaml(text) {
  const entries = [];
  const blocks = text.split(/\n  - id:\s*/);
  blocks.shift();

  for (const block of blocks) {
    const lines = block.split('\n');
    const entry = { id: lines[0].trim(), degree: '', institution: '', period: '', text: '' };

    for (const line of lines) {
      const m = line.match(/^\s{4}(\w[\w_]*):\s*(.+)/);
      if (m) {
        const [, key, val] = m;
        const v = val.trim().replace(/^["']|["']$/g, '');
        if (key === 'degree') entry.degree = v;
        else if (key === 'institution') entry.institution = v;
        else if (key === 'period') entry.period = v;
      }
    }

    const textIdx = block.indexOf('text: >');
    if (textIdx !== -1) {
      const textLines = [];
      const afterText = block.substring(textIdx).split('\n').slice(1);
      for (const tl of afterText) {
        if (tl.trim() === '') break;
        if (!tl.match(/^\s{6,}/)) break;
        textLines.push(tl.trim());
      }
      entry.text = textLines.join(' ');
    }

    if (entry.id && entry.degree) entries.push(entry);
  }

  return entries;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function injectStyles() {
  if (document.getElementById('edu-styles')) return;
  const s = document.createElement('style');
  s.id = 'edu-styles';
  s.textContent = `
    .edu-container { height:100%; overflow-y:auto; padding:20px 24px; }
    .edu-loading, .edu-empty {
      display:flex; align-items:center; justify-content:center; height:100%;
      color:var(--text-dim); font-size:13px; font-family:var(--font-mono);
    }

    .edu-header { margin-bottom:20px; }
    .edu-title {
      font-family:var(--font-display); font-size:18px; font-weight:700; color:var(--text-primary);
    }

    .edu-grid {
      display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:14px;
    }

    .edu-card {
      background:var(--glass); border:1px solid var(--glass-border); border-radius:12px;
      padding:20px; transition:border-color 0.2s, transform 0.15s;
    }
    .edu-card:hover { border-color:var(--cyan); transform:translateY(-2px); }

    .edu-icon { font-size:32px; margin-bottom:10px; }
    .edu-degree { font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:4px; }
    .edu-inst { font-size:13px; color:var(--cyan); margin-bottom:6px; }
    .edu-period { font-size:12px; color:var(--text-dim); font-family:var(--font-mono); margin-bottom:10px; }
    .edu-desc { font-size:12px; color:var(--text-muted); line-height:1.6; }
  `;
  document.head.appendChild(s);
}
