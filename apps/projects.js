// Projects.finder — Finder-style project explorer

let allProjects = [];
let currentCategory = 'all';
let currentSort = 'recent';
let currentView = 'grid';

export async function init(container) {
  injectStyles();

  container.innerHTML = `
    <div class="finder-container">
      <div class="finder-sidebar" id="finder-sidebar">
        <div class="finder-sidebar-section">
          <div class="finder-sidebar-title">Favorites</div>
          <div class="finder-sidebar-item active" data-cat="all">All Projects</div>
          <div class="finder-sidebar-item" data-cat="pinned">Pinned</div>
        </div>
        <div class="finder-sidebar-section" id="finder-categories">
          <div class="finder-sidebar-title">Categories</div>
        </div>
      </div>
      <div class="finder-main">
        <div class="finder-toolbar">
          <input class="finder-search" type="text" placeholder="Search projects..." id="finder-search">
          <div class="finder-toolbar-right">
            <select class="finder-sort" id="finder-sort">
              <option value="recent">Most Recent</option>
              <option value="stars">Most Starred</option>
              <option value="name">Name</option>
            </select>
            <div class="finder-view-toggle">
              <button class="finder-view-btn active" data-view="grid" title="Grid view">\u25A6</button>
              <button class="finder-view-btn" data-view="list" title="List view">\u2630</button>
            </div>
          </div>
        </div>
        <div class="finder-content" id="finder-content">
          <div class="finder-loading">Loading projects...</div>
        </div>
      </div>
    </div>
  `;

  await loadProjects();
  bindFinderEvents(container);
  renderProjects();
}

async function loadProjects() {
  try {
    const resp = await fetch('data.json?t=' + Date.now());
    const data = await resp.json();
    const repos = data.github?.all_repos || [];
    const pinned = data.github?.pinned_repos || [];
    const pinnedNames = new Set(pinned.map(p => p.name));

    allProjects = repos.map(r => ({
      name: r.name,
      description: r.description || 'No description',
      url: r.url,
      stars: r.stars || 0,
      language: r.language,
      updated_at: r.updated_at,
      topics: r.topics || [],
      is_pinned: pinnedNames.has(r.name),
      is_private: r.is_private || false,
    }));

    // Build category sidebar
    const cats = new Set();
    allProjects.forEach(p => p.topics.forEach(t => cats.add(t)));
    const catContainer = document.getElementById('finder-categories');
    [...cats].sort().forEach(cat => {
      const el = document.createElement('div');
      el.className = 'finder-sidebar-item';
      el.dataset.cat = cat;
      el.textContent = cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      catContainer.appendChild(el);
    });
  } catch {
    allProjects = [];
  }
}

function getFilteredProjects() {
  let projects = [...allProjects];

  // Filter by category
  if (currentCategory === 'pinned') {
    projects = projects.filter(p => p.is_pinned);
  } else if (currentCategory !== 'all') {
    projects = projects.filter(p => p.topics.includes(currentCategory));
  }

  // Search
  const query = document.getElementById('finder-search')?.value.toLowerCase() || '';
  if (query) {
    projects = projects.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query) ||
      (p.language || '').toLowerCase().includes(query) ||
      p.topics.some(t => t.includes(query))
    );
  }

  // Sort
  if (currentSort === 'recent') {
    projects.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  } else if (currentSort === 'stars') {
    projects.sort((a, b) => b.stars - a.stars);
  } else {
    projects.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Pinned always first (unless filtering by specific category)
  if (currentCategory === 'all') {
    projects.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
  }

  return projects;
}

function renderProjects() {
  const content = document.getElementById('finder-content');
  const projects = getFilteredProjects();

  if (projects.length === 0) {
    content.innerHTML = `<div class="finder-empty">No projects found</div>`;
    return;
  }

  if (currentView === 'grid') {
    content.innerHTML = `<div class="finder-grid">
      ${projects.map(p => renderProjectCard(p)).join('')}
    </div>`;
  } else {
    content.innerHTML = `<div class="finder-list">
      ${projects.map(p => renderProjectRow(p)).join('')}
    </div>`;
  }
}

function renderProjectCard(p) {
  const langColor = getLanguageColor(p.language);
  const timeAgo = formatTimeAgo(p.updated_at);
  const tag = p.is_private ? 'div' : 'a';
  const href = p.is_private ? '' : ` href="${p.url}" target="_blank" rel="noopener"`;
  const privateClick = p.is_private ? ` onclick="showPrivatePrompt('${escapeHtml(p.name)}')"` : '';
  return `
    <${tag} class="finder-card${p.is_private ? ' finder-card-private' : ''}"${href}${privateClick}>
      <div class="finder-card-header">
        <span class="finder-card-icon">${p.is_private ? '\uD83D\uDD12' : '\uD83D\uDCC1'}</span>
        ${p.is_pinned ? '<span class="finder-pin" title="Pinned">\uD83D\uDCCC</span>' : ''}
        ${p.is_private ? '<span class="finder-private-badge">Private</span>' : ''}
      </div>
      <div class="finder-card-name">${escapeHtml(p.name)}</div>
      <div class="finder-card-desc">${escapeHtml(p.description)}</div>
      <div class="finder-card-meta">
        ${p.language ? `<span class="finder-lang"><span class="finder-lang-dot" style="background:${langColor}"></span>${p.language}</span>` : ''}
        ${p.stars > 0 ? `<span class="finder-stars">\u2B50 ${p.stars}</span>` : ''}
        <span class="finder-time">${timeAgo}</span>
      </div>
    </${tag}>
  `;
}

function renderProjectRow(p) {
  const langColor = getLanguageColor(p.language);
  const timeAgo = formatTimeAgo(p.updated_at);
  const tag = p.is_private ? 'div' : 'a';
  const href = p.is_private ? '' : ` href="${p.url}" target="_blank" rel="noopener"`;
  const privateClick = p.is_private ? ` onclick="showPrivatePrompt('${escapeHtml(p.name)}')"` : '';
  return `
    <${tag} class="finder-row${p.is_private ? ' finder-row-private' : ''}"${href}${privateClick}>
      <span class="finder-row-icon">${p.is_private ? '\uD83D\uDD12' : '\uD83D\uDCC1'}</span>
      <span class="finder-row-name">${p.is_pinned ? '\uD83D\uDCCC ' : ''}${escapeHtml(p.name)}${p.is_private ? ' <span class="finder-private-badge-sm">Private</span>' : ''}</span>
      <span class="finder-row-desc">${escapeHtml(p.description)}</span>
      ${p.language ? `<span class="finder-row-lang"><span class="finder-lang-dot" style="background:${langColor}"></span>${p.language}</span>` : '<span></span>'}
      <span class="finder-row-stars">${p.stars > 0 ? '\u2B50 ' + p.stars : ''}</span>
      <span class="finder-row-time">${timeAgo}</span>
    </${tag}>
  `;
}

function bindFinderEvents(container) {
  container.querySelector('#finder-search').addEventListener('input', renderProjects);
  container.querySelector('#finder-sort').addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderProjects();
  });

  container.querySelector('#finder-sidebar').addEventListener('click', (e) => {
    const item = e.target.closest('.finder-sidebar-item');
    if (!item) return;
    container.querySelectorAll('.finder-sidebar-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    currentCategory = item.dataset.cat;
    renderProjects();
  });

  container.querySelector('.finder-view-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.finder-view-btn');
    if (!btn) return;
    container.querySelectorAll('.finder-view-btn').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    renderProjects();
  });
}

const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Go: '#00ADD8', Rust: '#dea584',
  Ruby: '#701516', PHP: '#4F5D95', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', Vue: '#41b883',
};

function getLanguageColor(lang) {
  return LANG_COLORS[lang] || '#6B8FA3';
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// Global — called from inline onclick on private repo cards
window.showPrivatePrompt = function(repoName) {
  // Remove existing prompt if any
  document.querySelector('.finder-private-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'finder-private-overlay';
  overlay.innerHTML = `
    <div class="finder-private-dialog">
      <div class="finder-private-icon">\uD83D\uDD12</div>
      <div class="finder-private-title">${repoName}</div>
      <div class="finder-private-msg">This is a private repository.<br>Admin access required to view the source code.</div>
      <div class="finder-private-hint">Interested? Reach out to discuss.</div>
      <div class="finder-private-actions">
        <a class="finder-private-btn" href="mailto:tapas.patra0406@gmail.com?subject=Access request: ${repoName}">Request Access</a>
        <button class="finder-private-btn finder-private-close">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.finder-private-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
};

function injectStyles() {
  if (document.getElementById('finder-styles')) return;
  const s = document.createElement('style');
  s.id = 'finder-styles';
  s.textContent = `
    .finder-container { display:flex; height:100%; }
    .finder-sidebar {
      width:180px; flex-shrink:0; border-right:1px solid var(--glass-border);
      padding:12px 0; overflow-y:auto; background:rgba(0,0,0,0.15);
    }
    .finder-sidebar-title {
      font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px;
      padding:8px 14px 4px; font-weight:600;
    }
    .finder-sidebar-item {
      padding:5px 14px; font-size:12px; color:var(--text-muted); cursor:pointer;
      transition:background 0.15s, color 0.15s; border-radius:0;
    }
    .finder-sidebar-item:hover { background:var(--glass); color:var(--text-primary); }
    .finder-sidebar-item.active { background:var(--violet); color:#fff; }
    .finder-sidebar-section { margin-bottom:8px; }

    .finder-main { flex:1; display:flex; flex-direction:column; min-width:0; }
    .finder-toolbar {
      display:flex; align-items:center; gap:8px; padding:8px 12px;
      border-bottom:1px solid var(--glass-border); flex-shrink:0;
    }
    .finder-toolbar-right { display:flex; align-items:center; gap:8px; margin-left:auto; }
    .finder-search {
      flex:1; max-width:240px; background:var(--glass); border:1px solid var(--glass-border);
      border-radius:6px; padding:5px 10px; color:var(--text-primary); font-size:12px;
      font-family:var(--font-body); outline:none;
    }
    .finder-search:focus { border-color:var(--cyan); }
    .finder-search::placeholder { color:var(--text-dim); }
    .finder-sort {
      background:var(--glass); border:1px solid var(--glass-border); border-radius:6px;
      padding:4px 8px; color:var(--text-muted); font-size:11px; font-family:var(--font-body);
      outline:none; cursor:pointer;
    }
    .finder-view-toggle { display:flex; gap:2px; }
    .finder-view-btn {
      background:none; border:1px solid var(--glass-border); color:var(--text-dim);
      width:26px; height:26px; border-radius:4px; cursor:pointer; font-size:12px;
      display:flex; align-items:center; justify-content:center;
    }
    .finder-view-btn.active { background:var(--glass); color:var(--text-primary); border-color:var(--cyan); }

    .finder-content { flex:1; overflow-y:auto; padding:12px; }
    .finder-loading, .finder-empty {
      display:flex; align-items:center; justify-content:center; height:100%;
      color:var(--text-dim); font-size:13px; font-family:var(--font-mono);
    }

    .finder-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px; }
    .finder-card {
      background:var(--glass); border:1px solid var(--glass-border); border-radius:10px;
      padding:14px; cursor:pointer; transition:border-color 0.2s, background 0.2s;
      text-decoration:none; color:inherit; display:block;
    }
    .finder-card:hover { border-color:var(--cyan); background:var(--glass-hover); }
    .finder-card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .finder-card-icon { font-size:28px; }
    .finder-pin { font-size:12px; }
    .finder-card-name { font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:4px; word-break:break-word; }
    .finder-card-desc { font-size:11px; color:var(--text-muted); line-height:1.4; margin-bottom:10px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .finder-card-meta { display:flex; gap:10px; font-size:10px; color:var(--text-dim); align-items:center; flex-wrap:wrap; }
    .finder-lang { display:flex; align-items:center; gap:4px; }
    .finder-lang-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

    .finder-list { display:flex; flex-direction:column; gap:2px; }
    .finder-row {
      display:grid; grid-template-columns:24px 140px 1fr 90px 60px 70px; gap:8px;
      align-items:center; padding:6px 10px; border-radius:6px; font-size:12px;
      cursor:pointer; text-decoration:none; color:inherit; transition:background 0.15s;
    }
    .finder-row:hover { background:var(--glass); }
    .finder-row-icon { font-size:14px; }
    .finder-row-name { font-weight:500; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .finder-row-desc { color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .finder-row-lang { display:flex; align-items:center; gap:4px; color:var(--text-dim); font-size:11px; }
    .finder-row-stars { color:var(--text-dim); font-size:11px; text-align:right; }
    .finder-row-time { color:var(--text-dim); font-size:10px; text-align:right; }

    /* Private repo styles */
    .finder-card-private, .finder-row-private { cursor:pointer; }
    .finder-card-private { border-style:dashed; }
    .finder-private-badge {
      font-size:9px; background:rgba(255,95,86,0.15); color:#FF5F56; padding:2px 7px;
      border-radius:8px; font-weight:600; letter-spacing:0.3px;
    }
    .finder-private-badge-sm {
      font-size:8px; background:rgba(255,95,86,0.15); color:#FF5F56; padding:1px 5px;
      border-radius:6px; font-weight:600; vertical-align:middle; margin-left:4px;
    }

    /* Private repo dialog overlay */
    .finder-private-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);
      display:flex; align-items:center; justify-content:center; z-index:9999;
      animation:fadeIn 0.2s ease;
    }
    .finder-private-dialog {
      background:var(--bg-surface, #1a1a2e); border:1px solid var(--glass-border, rgba(255,255,255,0.1));
      border-radius:14px; padding:28px 32px; text-align:center; max-width:340px; width:90%;
      box-shadow:0 20px 60px rgba(0,0,0,0.5);
    }
    .finder-private-icon { font-size:36px; margin-bottom:10px; }
    .finder-private-title {
      font-size:16px; font-weight:700; color:var(--text-primary, #e8f4f8); margin-bottom:8px;
      font-family:var(--font-mono, monospace);
    }
    .finder-private-msg { font-size:13px; color:var(--text-muted, #6b8fa3); line-height:1.5; margin-bottom:6px; }
    .finder-private-hint { font-size:11px; color:var(--text-dim, #3d5a6e); margin-bottom:18px; }
    .finder-private-actions { display:flex; gap:8px; justify-content:center; }
    .finder-private-btn {
      padding:7px 18px; border-radius:8px; font-size:12px; font-family:var(--font-body, sans-serif);
      cursor:pointer; text-decoration:none; border:1px solid var(--glass-border, rgba(255,255,255,0.1));
      color:var(--text-primary, #e8f4f8); background:var(--glass, rgba(255,255,255,0.05));
      transition:background 0.2s, border-color 0.2s;
    }
    .finder-private-btn:first-child {
      background:var(--violet, #7c3aed); border-color:var(--violet, #7c3aed); color:#fff;
    }
    .finder-private-btn:hover { border-color:var(--cyan, #00e5ff); }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  `;
  document.head.appendChild(s);
}
