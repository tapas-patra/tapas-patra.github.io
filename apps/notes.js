// Notes.app — Create and manage notes, auto-saved to localStorage

const LS_KEY = 'tapasos-notes';

let container = null;
let notes = [];
let activeId = null;
let searchQuery = '';

export async function init(el) {
  container = el;
  notes = loadNotes();

  // Create a welcome note if first time
  if (notes.length === 0) {
    notes.push(createNote('Welcome to Notes', 'This is your personal notepad in TapasOS.\n\nYour notes are saved automatically in your browser.\n\n- Click + to create a new note\n- Click any note in the sidebar to edit\n- Notes auto-save as you type'));
    save();
  }

  activeId = notes[0]?.id || null;
  injectStyles();
  render();
}

function createNote(title, body) {
  const now = Date.now();
  return { id: 'n_' + now + '_' + Math.random().toString(36).slice(2, 6), title: title || 'Untitled', body: body || '', created: now, modified: now };
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(notes));
}

function render() {
  const filtered = searchQuery
    ? notes.filter(n => n.title.toLowerCase().includes(searchQuery) || n.body.toLowerCase().includes(searchQuery))
    : notes;

  const active = notes.find(n => n.id === activeId);

  container.innerHTML = `
    <div class="notes-app">
      <div class="notes-sidebar">
        <div class="notes-sidebar-header">
          <div class="notes-sidebar-title">Notes</div>
          <button class="notes-new-btn" title="New Note">+</button>
        </div>
        <div class="notes-search-wrap">
          <input type="text" class="notes-search" placeholder="Search notes..." value="${esc(searchQuery)}">
        </div>
        <div class="notes-list">
          ${filtered.length === 0 ? '<div class="notes-list-empty">No notes found</div>' : ''}
          ${filtered.map(n => `
            <div class="notes-list-item ${n.id === activeId ? 'active' : ''}" data-id="${n.id}">
              <div class="notes-list-title">${esc(n.title) || 'Untitled'}</div>
              <div class="notes-list-preview">${esc(getPreview(n.body))}</div>
              <div class="notes-list-date">${formatDate(n.modified)}</div>
            </div>
          `).join('')}
        </div>
        <div class="notes-sidebar-footer">${notes.length} note${notes.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="notes-editor">
        ${active ? `
          <div class="notes-editor-toolbar">
            <span class="notes-editor-date">Last edited ${formatDate(active.modified)}</span>
            <button class="notes-delete-btn" title="Delete Note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
          <input type="text" class="notes-title-input" value="${esc(active.title)}" placeholder="Title" spellcheck="false">
          <textarea class="notes-body-input" placeholder="Start writing..." spellcheck="false">${esc(active.body)}</textarea>
        ` : `
          <div class="notes-empty-state">
            <div class="notes-empty-icon">\uD83D\uDCDD</div>
            <div class="notes-empty-text">Select a note or create a new one</div>
          </div>
        `}
      </div>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  // New note
  container.querySelector('.notes-new-btn')?.addEventListener('click', () => {
    const note = createNote('', '');
    notes.unshift(note);
    activeId = note.id;
    save();
    render();
    // Focus the title input
    setTimeout(() => container.querySelector('.notes-title-input')?.focus(), 50);
  });

  // Select note
  container.querySelectorAll('.notes-list-item').forEach(el => {
    el.addEventListener('click', () => {
      activeId = el.dataset.id;
      render();
    });
  });

  // Search
  const searchInput = container.querySelector('.notes-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      renderSidebar();
    });
  }

  // Title editing
  const titleInput = container.querySelector('.notes-title-input');
  if (titleInput) {
    titleInput.addEventListener('input', () => {
      const note = notes.find(n => n.id === activeId);
      if (note) {
        note.title = titleInput.value;
        note.modified = Date.now();
        save();
        updateSidebarItem(note);
      }
    });
  }

  // Body editing
  const bodyInput = container.querySelector('.notes-body-input');
  if (bodyInput) {
    bodyInput.addEventListener('input', () => {
      const note = notes.find(n => n.id === activeId);
      if (note) {
        note.body = bodyInput.value;
        note.modified = Date.now();
        save();
        updateSidebarItem(note);
      }
    });
    // Tab key inserts spaces instead of moving focus
    bodyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = bodyInput.selectionStart;
        bodyInput.value = bodyInput.value.substring(0, start) + '  ' + bodyInput.value.substring(bodyInput.selectionEnd);
        bodyInput.selectionStart = bodyInput.selectionEnd = start + 2;
        bodyInput.dispatchEvent(new Event('input'));
      }
    });
  }

  // Delete
  container.querySelector('.notes-delete-btn')?.addEventListener('click', () => {
    if (!activeId) return;
    const idx = notes.findIndex(n => n.id === activeId);
    notes.splice(idx, 1);
    activeId = notes[0]?.id || null;
    save();
    render();
  });
}

// Update sidebar item without full re-render (prevents losing editor focus)
function updateSidebarItem(note) {
  const el = container.querySelector(`.notes-list-item[data-id="${note.id}"]`);
  if (!el) return;
  el.querySelector('.notes-list-title').textContent = note.title || 'Untitled';
  el.querySelector('.notes-list-preview').textContent = getPreview(note.body);
  el.querySelector('.notes-list-date').textContent = formatDate(note.modified);
}

function renderSidebar() {
  const filtered = searchQuery
    ? notes.filter(n => n.title.toLowerCase().includes(searchQuery) || n.body.toLowerCase().includes(searchQuery))
    : notes;

  const list = container.querySelector('.notes-list');
  if (!list) return;

  list.innerHTML = filtered.length === 0
    ? '<div class="notes-list-empty">No notes found</div>'
    : filtered.map(n => `
      <div class="notes-list-item ${n.id === activeId ? 'active' : ''}" data-id="${n.id}">
        <div class="notes-list-title">${esc(n.title) || 'Untitled'}</div>
        <div class="notes-list-preview">${esc(getPreview(n.body))}</div>
        <div class="notes-list-date">${formatDate(n.modified)}</div>
      </div>
    `).join('');

  // Re-bind click events on sidebar items
  list.querySelectorAll('.notes-list-item').forEach(el => {
    el.addEventListener('click', () => {
      activeId = el.dataset.id;
      render();
    });
  });

  // Update count
  const footer = container.querySelector('.notes-sidebar-footer');
  if (footer) footer.textContent = `${notes.length} note${notes.length !== 1 ? 's' : ''}`;
}

function getPreview(body) {
  if (!body) return 'No content';
  const line = body.split('\n').find(l => l.trim()) || '';
  return line.length > 60 ? line.slice(0, 60) + '...' : line;
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function injectStyles() {
  if (document.getElementById('notes-styles')) return;
  const style = document.createElement('style');
  style.id = 'notes-styles';
  style.textContent = `
    .notes-app {
      display: flex;
      height: 100%;
      font-family: var(--font-body);
    }

    .notes-sidebar {
      width: 220px;
      flex-shrink: 0;
      background: rgba(0,0,0,0.2);
      border-right: 1px solid rgba(255,255,255,0.06);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .notes-sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 12px 8px;
    }

    .notes-sidebar-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .notes-new-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: var(--cyan);
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }

    .notes-new-btn:hover {
      background: rgba(0, 229, 255, 0.12);
    }

    .notes-search-wrap {
      padding: 0 10px 8px;
    }

    .notes-search {
      width: 100%;
      padding: 5px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 11px;
      outline: none;
      transition: border-color 0.15s;
    }

    .notes-search:focus {
      border-color: rgba(0, 229, 255, 0.3);
    }

    .notes-search::placeholder {
      color: var(--text-dim);
    }

    .notes-list {
      flex: 1;
      overflow-y: auto;
      padding: 0 6px;
    }

    .notes-list-item {
      padding: 10px 8px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 2px;
      transition: background 0.12s;
    }

    .notes-list-item:hover {
      background: rgba(255,255,255,0.04);
    }

    .notes-list-item.active {
      background: rgba(0, 229, 255, 0.1);
    }

    .notes-list-title {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notes-list-item.active .notes-list-title {
      color: var(--cyan);
    }

    .notes-list-preview {
      font-size: 11px;
      color: var(--text-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    }

    .notes-list-date {
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--text-dim);
    }

    .notes-list-empty {
      text-align: center;
      color: var(--text-dim);
      font-size: 11px;
      padding: 20px 0;
    }

    .notes-sidebar-footer {
      padding: 8px 12px;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
      border-top: 1px solid rgba(255,255,255,0.04);
      text-align: center;
    }

    .notes-editor {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .notes-editor-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .notes-editor-date {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
    }

    .notes-delete-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-dim);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .notes-delete-btn:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    }

    .notes-title-input {
      width: 100%;
      padding: 12px 16px 4px;
      border: none;
      background: transparent;
      color: var(--text-primary);
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      outline: none;
    }

    .notes-title-input::placeholder {
      color: var(--text-dim);
    }

    .notes-body-input {
      flex: 1;
      width: 100%;
      padding: 8px 16px 16px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.7;
      outline: none;
      resize: none;
    }

    .notes-body-input::placeholder {
      color: var(--text-dim);
    }

    .notes-empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-dim);
    }

    .notes-empty-icon {
      font-size: 36px;
      opacity: 0.4;
    }

    .notes-empty-text {
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);
}
