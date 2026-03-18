// Finder — TapasOS virtual filesystem browser

const FS = {
  name: '~',
  type: 'folder',
  children: [
    {
      name: 'Applications',
      type: 'folder',
      icon: '\uD83D\uDCC1',
      children: '__APPS__', // populated dynamically
    },
    {
      name: 'Desktop',
      type: 'folder',
      icon: '\uD83D\uDCBB',
      children: [
        { name: 'welcome.txt', type: 'file', icon: '\uD83D\uDCC4', content: 'Welcome to TapasOS!\n\nThis is the interactive portfolio of Tapas Kumar Patra.\nExplore the filesystem, open apps, or try Tapas.ai to chat.' },
        { name: 'README.md', type: 'file', icon: '\uD83D\uDCC4', content: 'TapasOS v3.0.26\n\nAn AI-first developer portfolio disguised as a browser-based operating system.\n\nBuilt with: Vanilla JS, CSS, Web Audio API\nFrameworks: Zero\nDependencies: Zero' },
      ],
    },
    {
      name: 'Documents',
      type: 'folder',
      icon: '\uD83D\uDCC1',
      children: [
        {
          name: 'Experience',
          type: 'folder',
          icon: '\uD83D\uDCC1',
          children: [
            { name: 'Setu_PineLabs.md', type: 'file', icon: '\uD83D\uDCBC', content: 'SDET II @ Setu by Pine Labs\nJanuary 2026 - Present\n\nBuilding and scaling quality infrastructure for payment solutions.\nFintech, API testing, CI/CD pipelines.', appId: 'experience' },
            { name: 'Wipro_Technologies.md', type: 'file', icon: '\uD83D\uDCBC', content: 'Software Engineer (Automation) @ Wipro Technologies\nOctober 2021 - December 2025\nClient: Ford Motor Company\n\n- Architected end-to-end Python automation framework\n- 1000+ automated test scripts\n- Built 6+ production tools\n- Led teams of 16-20 engineers\n- 19 performance awards', appId: 'experience' },
          ],
        },
        {
          name: 'Education',
          type: 'folder',
          icon: '\uD83D\uDCC1',
          children: [
            { name: 'BITS_Pilani_MTech.md', type: 'file', icon: '\uD83C\uDF93', content: 'M.Tech in Software Systems\nBITS Pilani (WILP)\n\nWork Integrated Learning Programme', appId: 'education' },
            { name: 'NCC_BCA.md', type: 'file', icon: '\uD83C\uDF93', content: 'Bachelor of Computer Applications\nN.C. College', appId: 'education' },
          ],
        },
        { name: 'resume.pdf', type: 'file', icon: '\uD83D\uDCC4', appId: 'resume' },
        { name: 'awards.txt', type: 'file', icon: '\uD83C\uDFC6', content: '19 Performance Awards at Wipro Technologies\n2x Outstanding Performance Rating (5/5)\n\nRecognized for automation framework design, team leadership, and tool development.', appId: 'awards' },
      ],
    },
    {
      name: 'Projects',
      type: 'folder',
      icon: '\uD83D\uDCC1',
      children: [
        { name: 'TapasOS', type: 'folder', icon: '\uD83D\uDCC1', children: [
          { name: 'index.html', type: 'file', icon: '\uD83C\uDF10', content: 'TapasOS — AI-first portfolio\n\nBrowser-based operating system with:\n- Window manager\n- Dock with magnification\n- Spotlight search\n- 12+ apps\n- RAG-powered AI chatbot\n- Boot sequence with system detection\n- Sound system (Web Audio API)' },
          { name: 'os/', type: 'file', icon: '\uD83D\uDCC2', content: 'Core OS modules:\ndesktop.js, menubar.js, boot.js, sounds.js,\nlock-screen.js, wallpaper.js, control-center.js,\nnotifications.js, analytics.js, admin.js' },
          { name: 'apps/', type: 'file', icon: '\uD83D\uDCC2', content: 'App modules:\nai-assistant.js, projects.js, skills.js,\nactivity.js, terminal.js, settings.js,\nawards.js, resume.js, experience.js,\neducation.js, contact.js, finder.js' },
        ]},
        { name: 'PortfolioBot', type: 'folder', icon: '\uD83D\uDCC1', children: [
          { name: 'README.md', type: 'file', icon: '\uD83D\uDCC4', content: 'Portfolio Bot — FastAPI Backend\n\nRAG pipeline with:\n- Multi-provider AI (OpenAI, Gemini, Groq)\n- SSE streaming\n- pgvector embeddings\n- Supabase PostgreSQL\n- Entry-level diff sync from YAML' },
        ]},
        { name: 'TapasData', type: 'folder', icon: '\uD83D\uDCC1', children: [
          { name: 'README.md', type: 'file', icon: '\uD83D\uDCC4', content: 'Tapas Data Repository\n\nYAML data files:\nprofile.yaml, experience.yaml, education.yaml,\nskills.yaml, projects.yaml, awards.yaml\n\nAuto-synced to Supabase via /admin/sync endpoint.\nGitHub Pages dashboard for monitoring.' },
        ]},
      ],
    },
    {
      name: '.config',
      type: 'folder',
      icon: '\u2699\uFE0F',
      children: [
        { name: 'theme.json', type: 'file', icon: '\uD83D\uDD27', content: '{\n  "wallpaper": "' + (localStorage.getItem('tapasos-wallpaper') || 'particles') + '",\n  "sound": "' + (localStorage.getItem('tapasos-sound') || 'on') + '",\n  "volume": ' + (localStorage.getItem('tapasos-volume') || '80') + '\n}' },
        { name: 'dock.json', type: 'file', icon: '\uD83D\uDD27', content: JSON.stringify(JSON.parse(localStorage.getItem('tapasos-dock-apps') || '["ai-assistant","projects","skills","activity","settings"]'), null, 2) },
      ],
    },
  ],
};

let container = null;
let currentPath = ['~'];
let selectedFile = null;

export async function init(el) {
  container = el;

  // Populate Applications folder dynamically
  populateApps();

  injectStyles();
  render();
}

function populateApps() {
  const appsFolder = FS.children.find(c => c.name === 'Applications');
  if (appsFolder && appsFolder.children === '__APPS__') {
    // Import APP_REGISTRY would create circular dep, so read from DOM
    const dockItems = document.querySelectorAll('.dock-item');
    const apps = [];

    // Get all apps from the spotlight index (they're in the DOM as data)
    // Instead, hardcode from known registry
    const registry = [
      { id: 'ai-assistant', title: 'Tapas.ai', icon: '\uD83E\uDD16' },
      { id: 'projects', title: 'Projects.finder', icon: '\uD83D\uDCC2' },
      { id: 'skills', title: 'Skills.app', icon: '\u26A1' },
      { id: 'activity', title: 'Activity.monitor', icon: '\uD83D\uDCC8' },
      { id: 'awards', title: 'Awards.app', icon: '\uD83C\uDFC6' },
      { id: 'resume', title: 'Resume.app', icon: '\uD83D\uDCC4' },
      { id: 'terminal', title: 'Terminal.app', icon: '\u2328\uFE0F' },
      { id: 'experience', title: 'Experience.app', icon: '\uD83D\uDCBC' },
      { id: 'education', title: 'Education.app', icon: '\uD83C\uDF93' },
      { id: 'contact', title: 'Contact.app', icon: '\uD83D\uDCEC' },
      { id: 'settings', title: 'Settings.app', icon: '\u2699\uFE0F' },
      { id: 'finder', title: 'Finder', icon: '\uD83D\uDCBB' },
      { id: 'classic', title: 'Classic.view', icon: '\uD83C\uDF10' },
    ];

    appsFolder.children = registry.map(app => ({
      name: app.title,
      type: 'app',
      icon: app.icon,
      appId: app.id,
    }));
  }
}

function resolve(path) {
  let node = FS;
  for (let i = 1; i < path.length; i++) {
    if (!node.children || typeof node.children === 'string') return null;
    node = node.children.find(c => c.name === path[i]);
    if (!node) return null;
  }
  return node;
}

function render() {
  const node = resolve(currentPath);
  if (!node) { currentPath = ['~']; return render(); }

  const children = Array.isArray(node.children) ? node.children : [];
  const folders = children.filter(c => c.type === 'folder');
  const files = children.filter(c => c.type !== 'folder');

  container.innerHTML = `
    <div class="vfs-app">
      <div class="vfs-sidebar">
        <div class="vfs-sidebar-title">Finder</div>
        ${buildSidebarTree(FS, ['~'])}
      </div>
      <div class="vfs-main">
        <div class="vfs-toolbar">
          <div class="vfs-breadcrumb">
            ${currentPath.map((seg, i) => {
              const isLast = i === currentPath.length - 1;
              return `<span class="vfs-crumb ${isLast ? 'active' : ''}" data-depth="${i}">${seg === '~' ? '\uD83C\uDFE0 Home' : seg}</span>`;
            }).join('<span class="vfs-crumb-sep">/</span>')}
          </div>
          <div class="vfs-item-count">${children.length} item${children.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="vfs-content">
          ${children.length === 0 ? '<div class="vfs-empty">This folder is empty</div>' : ''}
          ${[...folders, ...files].map(child => `
            <div class="vfs-item ${selectedFile === child.name ? 'selected' : ''}" data-name="${esc(child.name)}" data-type="${child.type}">
              <div class="vfs-item-icon">${child.icon || getDefaultIcon(child)}</div>
              <div class="vfs-item-name">${esc(child.name)}</div>
            </div>
          `).join('')}
        </div>
        ${selectedFile ? renderPreview(children.find(c => c.name === selectedFile)) : ''}
      </div>
    </div>
  `;

  bindEvents();
}

function buildSidebarTree(node, path) {
  if (!node.children || typeof node.children === 'string') return '';
  const topFolders = Array.isArray(node.children) ? node.children.filter(c => c.type === 'folder') : [];

  return topFolders.map(child => {
    const childPath = [...path, child.name];
    const isActive = currentPath.join('/') === childPath.join('/');
    const isParent = currentPath.join('/').startsWith(childPath.join('/'));
    return `
      <div class="vfs-sidebar-item ${isActive ? 'active' : ''}" data-path="${esc(childPath.join('/'))}">
        <span>${child.icon || '\uD83D\uDCC1'}</span>
        <span>${esc(child.name)}</span>
      </div>
      ${isParent ? buildSubfolders(child, childPath) : ''}
    `;
  }).join('');
}

function buildSubfolders(node, path) {
  if (!Array.isArray(node.children)) return '';
  const subfolders = node.children.filter(c => c.type === 'folder');
  if (!subfolders.length) return '';

  return subfolders.map(child => {
    const childPath = [...path, child.name];
    const isActive = currentPath.join('/') === childPath.join('/');
    const isParent = currentPath.join('/').startsWith(childPath.join('/'));
    return `
      <div class="vfs-sidebar-item vfs-indent ${isActive ? 'active' : ''}" data-path="${esc(childPath.join('/'))}">
        <span>${child.icon || '\uD83D\uDCC1'}</span>
        <span>${esc(child.name)}</span>
      </div>
      ${isParent ? buildSubfolders(child, childPath) : ''}
    `;
  }).join('');
}

function renderPreview(file) {
  if (!file || file.type === 'folder') return '';
  return `
    <div class="vfs-preview">
      <div class="vfs-preview-header">
        <span class="vfs-preview-icon">${file.icon || getDefaultIcon(file)}</span>
        <span class="vfs-preview-name">${esc(file.name)}</span>
      </div>
      ${file.content ? `<pre class="vfs-preview-content">${esc(file.content)}</pre>` : ''}
      ${file.appId ? `<button class="vfs-preview-open" data-app="${file.appId}">Open in ${file.appId}</button>` : ''}
    </div>
  `;
}

function bindEvents() {
  // Sidebar navigation
  container.querySelectorAll('.vfs-sidebar-item').forEach(el => {
    el.addEventListener('click', () => {
      currentPath = el.dataset.path.split('/');
      selectedFile = null;
      render();
    });
  });

  // Breadcrumb navigation
  container.querySelectorAll('.vfs-crumb:not(.active)').forEach(el => {
    el.addEventListener('click', () => {
      const depth = parseInt(el.dataset.depth, 10);
      currentPath = currentPath.slice(0, depth + 1);
      selectedFile = null;
      render();
    });
  });

  // Item clicks
  container.querySelectorAll('.vfs-item').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.name;
      const type = el.dataset.type;

      if (type === 'folder') {
        currentPath = [...currentPath, name];
        selectedFile = null;
        render();
      } else if (type === 'app') {
        // Open the app
        const node = resolve(currentPath);
        const child = node?.children?.find(c => c.name === name);
        if (child?.appId) {
          const { openApp } = getDesktopAPI();
          if (openApp) openApp(child.appId);
        }
      } else {
        // Select file to show preview
        selectedFile = selectedFile === name ? null : name;
        render();
      }
    });

    // Double-click opens associated app
    el.addEventListener('dblclick', () => {
      const name = el.dataset.name;
      const node = resolve(currentPath);
      const child = node?.children?.find(c => c.name === name);
      if (child?.appId) {
        const { openApp } = getDesktopAPI();
        if (openApp) openApp(child.appId);
      }
    });
  });

  // Preview open button
  container.querySelectorAll('.vfs-preview-open').forEach(btn => {
    btn.addEventListener('click', () => {
      const { openApp } = getDesktopAPI();
      if (openApp) openApp(btn.dataset.app);
    });
  });
}

function getDesktopAPI() {
  // Access openApp from the global scope (it's attached by desktop.js)
  return { openApp: window.__tapasos_openApp };
}

function getDefaultIcon(file) {
  if (file.type === 'folder') return '\uD83D\uDCC1';
  if (file.type === 'app') return '\uD83D\uDCE6';
  const ext = file.name.split('.').pop();
  const icons = {
    'md': '\uD83D\uDCC4', 'txt': '\uD83D\uDCC4', 'pdf': '\uD83D\uDCC4',
    'js': '\uD83D\uDFE8', 'json': '\uD83D\uDD27', 'html': '\uD83C\uDF10',
    'css': '\uD83C\uDFA8', 'yaml': '\uD83D\uDCCB',
  };
  return icons[ext] || '\uD83D\uDCC4';
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function injectStyles() {
  if (document.getElementById('finder-vfs-styles')) return;
  const style = document.createElement('style');
  style.id = 'finder-vfs-styles';
  style.textContent = `
    .vfs-app {
      display: flex;
      height: 100%;
      font-family: var(--font-body);
    }

    .vfs-sidebar {
      width: 180px;
      flex-shrink: 0;
      background: rgba(0,0,0,0.2);
      border-right: 1px solid rgba(255,255,255,0.06);
      padding: 12px 6px;
      overflow-y: auto;
    }

    .vfs-sidebar-title {
      font-family: var(--font-display);
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary);
      padding: 0 8px 10px;
    }

    .vfs-sidebar-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 12px;
      transition: background 0.12s, color 0.12s;
    }

    .vfs-sidebar-item:hover {
      background: rgba(255,255,255,0.05);
    }

    .vfs-sidebar-item.active {
      background: rgba(0, 229, 255, 0.1);
      color: var(--cyan);
    }

    .vfs-indent {
      padding-left: 24px;
    }

    .vfs-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .vfs-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .vfs-breadcrumb {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 12px;
    }

    .vfs-crumb {
      color: var(--text-muted);
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      transition: color 0.12s;
    }

    .vfs-crumb:hover:not(.active) {
      color: var(--cyan);
    }

    .vfs-crumb.active {
      color: var(--text-primary);
      font-weight: 500;
      cursor: default;
    }

    .vfs-crumb-sep {
      color: var(--text-dim);
      font-size: 11px;
    }

    .vfs-item-count {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
    }

    .vfs-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      gap: 4px;
      align-content: start;
    }

    .vfs-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 6px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.12s;
      text-align: center;
    }

    .vfs-item:hover {
      background: rgba(255,255,255,0.04);
    }

    .vfs-item.selected {
      background: rgba(0, 229, 255, 0.1);
      border: 1px solid rgba(0, 229, 255, 0.2);
    }

    .vfs-item-icon {
      font-size: 32px;
      line-height: 1;
    }

    .vfs-item-name {
      font-size: 10px;
      color: var(--text-muted);
      word-break: break-all;
      max-width: 80px;
      line-height: 1.3;
    }

    .vfs-item.selected .vfs-item-name {
      color: var(--text-primary);
    }

    .vfs-empty {
      grid-column: 1 / -1;
      text-align: center;
      color: var(--text-dim);
      font-size: 12px;
      padding: 40px 0;
    }

    .vfs-preview {
      border-top: 1px solid rgba(255,255,255,0.06);
      padding: 12px 16px;
      max-height: 180px;
      overflow-y: auto;
      flex-shrink: 0;
      background: rgba(0,0,0,0.15);
    }

    .vfs-preview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .vfs-preview-icon {
      font-size: 20px;
    }

    .vfs-preview-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .vfs-preview-content {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      white-space: pre-wrap;
      line-height: 1.5;
      margin: 0;
    }

    .vfs-preview-open {
      margin-top: 8px;
      padding: 5px 12px;
      border-radius: 6px;
      border: none;
      background: rgba(0, 229, 255, 0.12);
      color: var(--cyan);
      font-family: var(--font-body);
      font-size: 11px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .vfs-preview-open:hover {
      background: rgba(0, 229, 255, 0.2);
    }
  `;
  document.head.appendChild(style);
}
