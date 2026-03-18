// Experience.app — Timeline view, fetches from tapas-data/experience.yaml

const EXP_YAML_URL = 'https://tapas-patra.github.io/tapas-data/experience.yaml';

export async function init(container) {
  injectStyles();

  container.innerHTML = `
    <div class="exp-container">
      <div class="exp-loading">Loading experience...</div>
    </div>
  `;

  let entries = [];
  try {
    const text = await fetch(EXP_YAML_URL + '?t=' + Date.now()).then(r => r.text());
    entries = parseExperienceYaml(text);
  } catch { /* */ }

  if (entries.length === 0) {
    container.querySelector('.exp-container').innerHTML =
      '<div class="exp-empty">Could not load experience data.</div>';
    return;
  }

  container.querySelector('.exp-container').innerHTML = `
    <div class="exp-header">
      <div class="exp-title">Experience</div>
    </div>
    <div class="exp-timeline">
      ${entries.map(e => `
        <div class="exp-item ${e.current ? 'exp-current' : ''}">
          <div class="exp-dot"></div>
          <div class="exp-date">${esc(e.period)}</div>
          <div class="exp-role">${esc(e.role)}</div>
          <div class="exp-company">${esc(e.company)}${e.account ? ' &middot; ' + esc(e.account) : ''}</div>
          ${e.location ? `<div class="exp-location">${esc(e.location)}</div>` : ''}
          ${e.text ? `<div class="exp-desc">${esc(e.text)}</div>` : ''}
          ${e.highlights.length > 0 ? e.highlights.map(h => `
            <div class="exp-highlight-section">${esc(h.section)}</div>
            <ul class="exp-highlight-list">
              ${h.items.map(item => `<li>${esc(item)}</li>`).join('')}
            </ul>
          `).join('') : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function parseExperienceYaml(text) {
  const entries = [];
  const blocks = text.split(/\n  - id:\s*/);
  blocks.shift();

  for (const block of blocks) {
    const lines = block.split('\n');
    const entry = {
      id: lines[0].trim(),
      company: '', role: '', period: '', location: '', account: '',
      current: false, text: '', highlights: []
    };

    for (const line of lines) {
      const m = line.match(/^\s{4}(\w[\w_]*):\s*(.+)/);
      if (m) {
        const [, key, val] = m;
        const v = val.trim().replace(/^["']|["']$/g, '');
        if (key === 'company') entry.company = v;
        else if (key === 'role') entry.role = v;
        else if (key === 'period') entry.period = v;
        else if (key === 'location') entry.location = v;
        else if (key === 'account') entry.account = v;
        else if (key === 'current') entry.current = v === 'true';
      }
    }

    // Parse text (folded scalar)
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

    // Parse highlights
    const highlightsIdx = block.indexOf('highlights:');
    if (highlightsIdx !== -1) {
      const hBlock = block.substring(highlightsIdx);
      const sections = hBlock.split(/\n\s{6}- section:\s*/);
      sections.shift();

      for (const sBlock of sections) {
        const sLines = sBlock.split('\n');
        const section = sLines[0].trim().replace(/^["']|["']$/g, '');
        const items = [];

        for (const sl of sLines) {
          const itemMatch = sl.match(/^\s{10,}- "(.+)"$/);
          if (itemMatch) items.push(itemMatch[1]);
        }

        if (section && items.length > 0) {
          entry.highlights.push({ section, items });
        }
      }
    }

    if (entry.id && entry.company) entries.push(entry);
  }

  return entries;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function injectStyles() {
  if (document.getElementById('exp-styles')) return;
  const s = document.createElement('style');
  s.id = 'exp-styles';
  s.textContent = `
    .exp-container { height:100%; overflow-y:auto; padding:20px 24px; }
    .exp-loading, .exp-empty {
      display:flex; align-items:center; justify-content:center; height:100%;
      color:var(--text-dim); font-size:13px; font-family:var(--font-mono);
    }

    .exp-header { margin-bottom:20px; }
    .exp-title {
      font-family:var(--font-display); font-size:18px; font-weight:700; color:var(--text-primary);
    }

    .exp-timeline { position:relative; padding-left:24px; }

    .exp-item {
      position:relative; margin-bottom:32px; padding-bottom:4px;
    }
    .exp-item:last-child { margin-bottom:0; }

    .exp-dot {
      position:absolute; left:-24px; top:6px;
      width:10px; height:10px; border-radius:50%; background:var(--cyan);
    }
    .exp-item::after {
      content:''; position:absolute; left:-20px; top:20px;
      width:2px; height:calc(100% + 12px); background:var(--glass-border);
    }
    .exp-item:last-child::after { display:none; }

    .exp-current { border-left:2px solid var(--cyan); padding-left:16px; margin-left:-2px; }
    .exp-current .exp-dot { box-shadow:0 0 0 4px rgba(0,229,255,0.2); }

    .exp-date { font-size:12px; font-family:var(--font-mono); color:var(--text-dim); margin-bottom:4px; }
    .exp-role { font-size:16px; font-weight:700; color:var(--text-primary); }
    .exp-company { font-size:14px; color:var(--cyan); margin-bottom:4px; }
    .exp-location { font-size:11px; color:var(--text-dim); margin-bottom:8px; }
    .exp-desc { font-size:13px; color:var(--text-muted); line-height:1.7; margin-bottom:8px; }

    .exp-highlight-section {
      font-size:13px; font-weight:600; color:var(--text-primary);
      margin-top:12px; margin-bottom:4px;
    }
    .exp-highlight-list {
      padding-left:18px; margin:0;
    }
    .exp-highlight-list li {
      font-size:12px; color:var(--text-muted); line-height:1.7; margin-bottom:2px;
    }
  `;
  document.head.appendChild(s);
}
