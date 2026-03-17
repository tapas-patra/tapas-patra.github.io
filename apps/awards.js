// Awards.app — fetches from tapas-data/awards.yaml

const AWARDS_YAML_URL = 'https://tapas-patra.github.io/tapas-data/awards.yaml';

let awardsData = null;

export async function init(container) {
  injectStyles();

  container.innerHTML = `
    <div class="awards-container">
      <div class="awards-loading">Loading awards...</div>
    </div>
  `;

  try {
    const text = await fetch(AWARDS_YAML_URL + '?t=' + Date.now()).then(r => r.text());
    awardsData = parseAwardsYaml(text);
  } catch {
    awardsData = null;
  }

  if (!awardsData || awardsData.organizations.length === 0) {
    container.querySelector('.awards-container').innerHTML =
      '<div class="awards-empty">Could not load awards data.</div>';
    return;
  }

  const allAwards = awardsData.organizations.flatMap(o => o.awards);

  container.querySelector('.awards-container').innerHTML = `
    <div class="awards-header">
      <div class="awards-title">Awards & Recognition</div>
      <div class="awards-subtitle">
        <strong>${awardsData.summary.total} Performance Awards</strong> (${awardsData.summary.period})
        &middot; ${awardsData.summary.highlight}
      </div>
    </div>

    ${awardsData.organizations.map(org => `
      <div class="awards-org-section">
        <div class="awards-org">
          <span class="awards-org-line"></span>
          ${esc(org.name)} (${esc(org.period)})
          <span class="awards-org-line awards-org-line-fill"></span>
        </div>
        <div class="awards-grid">
          ${org.awards.map(a => `
            <div class="award-card" data-id="${a.id}">
              <img class="award-card-img" src="${a.image}" alt="${esc(a.name)}">
              <div class="award-card-body">
                <div class="award-card-name">${esc(a.name)}</div>
                <div class="award-card-times">${a.times}x</div>
                <div class="award-card-desc">${esc(a.desc.slice(0, 60))}...</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}

    <div class="award-modal-overlay" id="award-modal-overlay">
      <div class="award-modal">
        <div class="award-modal-header">
          <div class="award-modal-title" id="award-modal-title"></div>
          <button class="award-modal-close" id="award-modal-close">&times;</button>
        </div>
        <div class="award-modal-body">
          <div class="award-modal-image" id="award-modal-image"></div>
          <div class="award-modal-info">
            <div class="award-modal-times" id="award-modal-times"></div>
            <div class="award-modal-desc" id="award-modal-desc"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Card clicks
  container.querySelector('.awards-container').addEventListener('click', (e) => {
    const card = e.target.closest('.award-card');
    if (card) {
      const award = allAwards.find(a => a.id === card.dataset.id);
      if (award) openModal(container, award);
    }
  });

  // Close modal
  container.querySelector('#award-modal-close').addEventListener('click', () => closeModal(container));
  container.querySelector('#award-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal(container);
  });
}

function openModal(container, award) {
  const overlay = container.querySelector('#award-modal-overlay');
  container.querySelector('#award-modal-title').textContent = award.name;
  container.querySelector('#award-modal-times').textContent = `Received ${award.times}x`;
  container.querySelector('#award-modal-desc').textContent = award.desc;
  container.querySelector('#award-modal-image').innerHTML =
    `<img src="${award.image}" alt="${esc(award.name)}">`;
  overlay.classList.add('visible');
}

function closeModal(container) {
  container.querySelector('#award-modal-overlay').classList.remove('visible');
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Minimal YAML parser for awards.yaml structure ──
function parseAwardsYaml(text) {
  const result = {
    summary: { total: 0, period: '', highlight: '' },
    organizations: []
  };

  // Parse summary
  const totalMatch = text.match(/^\s*total:\s*(\d+)/m);
  const periodMatch = text.match(/^\s*period:\s*"?([^"\n]+)"?/m);
  const highlightMatch = text.match(/^\s*highlight:\s*"?([^"\n]+)"?/m);
  if (totalMatch) result.summary.total = parseInt(totalMatch[1]);
  if (periodMatch) result.summary.period = periodMatch[1].trim();
  if (highlightMatch) result.summary.highlight = highlightMatch[1].trim();

  // Split by organization blocks
  const orgBlocks = text.split(/\n  - name:\s*/);
  orgBlocks.shift(); // Remove everything before first org

  for (const block of orgBlocks) {
    const lines = block.split('\n');
    const orgName = lines[0].trim();

    // Skip commented-out orgs
    if (orgName.startsWith('#')) continue;

    const periodLine = lines.find(l => l.match(/^\s+period:/));
    const orgPeriod = periodLine ? periodLine.replace(/.*period:\s*"?/, '').replace(/"?\s*$/, '').trim() : '';

    const org = { name: orgName, period: orgPeriod, awards: [] };

    // Split by award entries
    const awardBlocks = block.split(/\n      - id:\s*/);
    awardBlocks.shift(); // Remove org header

    for (const aBlock of awardBlocks) {
      const aLines = aBlock.split('\n');
      const award = { id: aLines[0].trim(), name: '', times: 0, image: '', desc: '' };

      for (const line of aLines) {
        const nameMatch = line.match(/^\s+name:\s*(.+)/);
        const timesMatch = line.match(/^\s+times:\s*(\d+)/);
        const imageMatch = line.match(/^\s+image:\s*(.+)/);
        if (nameMatch) award.name = nameMatch[1].trim();
        if (timesMatch) award.times = parseInt(timesMatch[1]);
        if (imageMatch) award.image = imageMatch[1].trim();
      }

      // Parse multi-line desc (folded scalar with >)
      const descStart = aBlock.indexOf('desc: >');
      if (descStart !== -1) {
        const descLines = [];
        const afterDesc = aBlock.substring(descStart).split('\n').slice(1);
        for (const dl of afterDesc) {
          // Stop at next field (less indented) or empty
          if (dl.match(/^\s{6}\w/) || dl.match(/^\s{4}-/) || dl.match(/^\s{2}-/) || dl.trim() === '') {
            if (dl.trim() === '') { descLines.push(''); continue; }
            if (!dl.match(/^\s{8,}/)) break;
          }
          descLines.push(dl.trim());
        }
        award.desc = descLines.filter(Boolean).join(' ').trim();
      }

      if (award.id && award.name) org.awards.push(award);
    }

    if (org.name) result.organizations.push(org);
  }

  return result;
}

// ── Styles ──
function injectStyles() {
  if (document.getElementById('awards-styles')) return;
  const s = document.createElement('style');
  s.id = 'awards-styles';
  s.textContent = `
    .awards-container { height:100%; overflow-y:auto; padding:20px; }
    .awards-loading, .awards-empty {
      display:flex; align-items:center; justify-content:center; height:100%;
      color:var(--text-dim); font-size:13px; font-family:var(--font-mono);
    }

    .awards-header { text-align:center; margin-bottom:16px; }
    .awards-title {
      font-family:var(--font-display); font-size:18px; font-weight:700;
      color:var(--text-primary); margin-bottom:6px;
    }
    .awards-subtitle { font-size:13px; color:var(--text-muted); }
    .awards-subtitle strong { color:var(--text-primary); }

    .awards-org-section { margin-bottom:20px; }
    .awards-org {
      display:flex; align-items:center; gap:8px; margin-bottom:12px;
      font-size:12px; font-weight:600; color:var(--cyan); text-transform:uppercase;
      letter-spacing:0.5px;
    }
    .awards-org-line { width:20px; height:1px; background:var(--cyan); flex-shrink:0; }
    .awards-org-line-fill { flex:1; background:var(--glass-border); }

    .awards-grid {
      display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:12px;
    }

    .award-card {
      background:var(--glass); border:1px solid var(--glass-border); border-radius:10px;
      padding:14px; display:flex; gap:12px; align-items:flex-start;
      cursor:pointer; transition:border-color 0.2s, transform 0.15s;
    }
    .award-card:hover { border-color:var(--violet); transform:translateY(-2px); }
    .award-card-img {
      width:48px; height:48px; border-radius:8px; object-fit:cover; flex-shrink:0;
    }
    .award-card-body { min-width:0; }
    .award-card-name { font-size:13px; font-weight:600; color:var(--text-primary); }
    .award-card-times { font-size:11px; color:var(--violet-light, #c084fc); font-family:var(--font-mono); }
    .award-card-desc { font-size:11px; color:var(--text-dim); margin-top:4px; line-height:1.4; }

    /* Modal */
    .award-modal-overlay {
      position:absolute; inset:0; z-index:100;
      background:rgba(0,0,0,0.75); backdrop-filter:blur(6px);
      display:flex; align-items:center; justify-content:center;
      opacity:0; pointer-events:none; transition:opacity 0.25s;
    }
    .award-modal-overlay.visible { opacity:1; pointer-events:auto; }
    .award-modal {
      background:var(--glass); border:1px solid var(--glass-border); border-radius:14px;
      max-width:460px; width:calc(100% - 32px); max-height:80%; overflow:hidden;
      display:flex; flex-direction:column;
      transform:scale(0.92); transition:transform 0.25s;
    }
    .award-modal-overlay.visible .award-modal { transform:scale(1); }
    .award-modal-header {
      display:flex; justify-content:space-between; align-items:center;
      padding:16px 20px 12px; border-bottom:1px solid var(--glass-border);
    }
    .award-modal-title { font-size:16px; font-weight:700; color:var(--text-primary); }
    .award-modal-close {
      width:28px; height:28px; border-radius:50%; border:none;
      background:var(--glass); color:var(--text-muted); font-size:16px;
      cursor:pointer; display:flex; align-items:center; justify-content:center;
      transition:background 0.2s;
    }
    .award-modal-close:hover { background:rgba(255,255,255,0.12); }
    .award-modal-body { padding:20px; overflow-y:auto; }
    .award-modal-image {
      border-radius:10px; overflow:hidden; background:rgba(0,0,0,0.3); margin-bottom:16px;
    }
    .award-modal-image img { width:100%; display:block; object-fit:contain; max-height:280px; }
    .award-modal-times {
      font-size:13px; color:var(--violet-light, #c084fc); font-family:var(--font-mono); margin-bottom:8px;
    }
    .award-modal-desc { font-size:13px; color:var(--text-muted); line-height:1.7; }
  `;
  document.head.appendChild(s);
}
