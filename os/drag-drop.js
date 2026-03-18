// TapasOS Drag & Drop — dock reorder, Finder→open, text→Notes

export function initDragDrop() {
  injectStyles();
  initDockReorder();
  initDesktopDropZone();
}

// ── Dock Reorder ──
// Drag dock icons to rearrange them, persist order to localStorage

const LS_DOCK = 'tapasos-dock-apps';

function initDockReorder() {
  const dock = document.getElementById('dock');
  if (!dock) return;

  let dragItem = null;
  let placeholder = null;
  let startX = 0;
  let itemOffsetX = 0;

  // Use event delegation since dock items are rebuilt
  dock.addEventListener('mousedown', onMouseDown);

  function onMouseDown(e) {
    const item = e.target.closest('.dock-item');
    if (!item || e.button !== 0) return;

    // Only start drag after a small movement threshold
    const initX = e.clientX;
    const initY = e.clientY;
    let moved = false;

    const onMove = (e2) => {
      const dx = Math.abs(e2.clientX - initX);
      const dy = Math.abs(e2.clientY - initY);
      if (!moved && dx < 8 && dy < 8) return;

      if (!moved) {
        moved = true;
        startDrag(item, e2);
      }
      moveDrag(e2);
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (moved) endDrag();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function startDrag(item, e) {
    dragItem = item;
    const rect = item.getBoundingClientRect();
    itemOffsetX = e.clientX - rect.left;

    // Create placeholder
    placeholder = document.createElement('div');
    placeholder.className = 'dock-placeholder';
    placeholder.style.width = rect.width + 'px';
    placeholder.style.height = rect.height + 'px';
    item.parentNode.insertBefore(placeholder, item);

    // Float the item
    item.classList.add('dock-dragging');
    item.style.position = 'fixed';
    item.style.left = (e.clientX - itemOffsetX) + 'px';
    item.style.top = (rect.top) + 'px';
    item.style.width = rect.width + 'px';
    item.style.zIndex = '30000';
    document.body.appendChild(item);
  }

  function moveDrag(e) {
    if (!dragItem) return;
    dragItem.style.left = (e.clientX - itemOffsetX) + 'px';

    // Find insertion point
    const dockItems = [...dock.querySelectorAll('.dock-item:not(.dock-dragging), .dock-placeholder')];
    let insertBefore = null;

    for (const el of dockItems) {
      if (el === placeholder) continue;
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      if (e.clientX < center) {
        insertBefore = el;
        break;
      }
    }

    if (insertBefore) {
      dock.insertBefore(placeholder, insertBefore);
    } else {
      dock.appendChild(placeholder);
    }
  }

  function endDrag() {
    if (!dragItem || !placeholder) return;

    // Insert dragged item where placeholder is
    dragItem.classList.remove('dock-dragging');
    dragItem.style.position = '';
    dragItem.style.left = '';
    dragItem.style.top = '';
    dragItem.style.width = '';
    dragItem.style.zIndex = '';

    placeholder.parentNode.insertBefore(dragItem, placeholder);
    placeholder.remove();
    placeholder = null;

    // Persist new order
    const newOrder = [...dock.querySelectorAll('.dock-item')].map(el => el.dataset.app).filter(Boolean);
    if (newOrder.length > 0) {
      localStorage.setItem(LS_DOCK, JSON.stringify(newOrder));
    }

    dragItem = null;
  }
}

// ── Desktop Drop Zone ──
// Allows dropping text (from browser selection) onto the desktop
// If Notes is open, it creates a new note. If not, opens Notes with the content.

function initDesktopDropZone() {
  const desktop = document.getElementById('desktop');
  if (!desktop) return;

  // Track drag-over for visual feedback
  desktop.addEventListener('dragover', (e) => {
    // Only accept text/plain drops
    if (!e.dataTransfer.types.includes('text/plain')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    desktop.classList.add('desktop-drop-active');
  });

  desktop.addEventListener('dragleave', (e) => {
    // Only remove if actually leaving the desktop
    if (e.relatedTarget && desktop.contains(e.relatedTarget)) return;
    desktop.classList.remove('desktop-drop-active');
  });

  desktop.addEventListener('drop', (e) => {
    desktop.classList.remove('desktop-drop-active');

    const text = e.dataTransfer.getData('text/plain');
    if (!text || !text.trim()) return;

    e.preventDefault();

    // Save dropped text as a note via localStorage
    const LS_NOTES = 'tapasos-notes';
    try {
      const raw = localStorage.getItem(LS_NOTES);
      const notes = raw ? JSON.parse(raw) : [];
      const now = Date.now();
      const title = text.trim().split('\n')[0].slice(0, 50) || 'Dropped Text';
      notes.unshift({
        id: 'n_' + now + '_' + Math.random().toString(36).slice(2, 6),
        title,
        body: text.trim(),
        created: now,
        modified: now,
      });
      localStorage.setItem(LS_NOTES, JSON.stringify(notes));

      // Open Notes app to show the dropped note
      const openApp = window.__tapasos_openApp;
      if (openApp) openApp('notes');

      // Notify
      const { notify } = window.__tapasos_notify || {};
      if (typeof notify === 'function') {
        notify('Note Created', `"${title}" saved to Notes`, { icon: '\uD83D\uDCDD', duration: 3000, app: 'Notes' });
      }
    } catch { /* ignore */ }
  });

  // Also make Finder items draggable (app items open on drop)
  initFinderDrag();
}

// ── Finder Drag ──
// When Finder is open, app items become draggable. Dropping them on the desktop opens them.

function initFinderDrag() {
  // Use MutationObserver to watch for Finder items appearing
  const observer = new MutationObserver(() => {
    document.querySelectorAll('.vfs-item[data-type="app"]').forEach(item => {
      if (item.dataset.dragReady) return;
      item.dataset.dragReady = 'true';
      item.draggable = true;

      item.addEventListener('dragstart', (e) => {
        const appId = item.dataset.appId || findAppIdByName(item.dataset.name || '');
        if (appId) {
          e.dataTransfer.setData('application/x-tapasos-app', appId);
          e.dataTransfer.effectAllowed = 'move';
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Listen for app drops on desktop — open the app
  const desktop = document.getElementById('desktop');
  desktop.addEventListener('drop', (e) => {
    const appId = e.dataTransfer.getData('application/x-tapasos-app');
    if (appId) {
      e.preventDefault();
      const openApp = window.__tapasos_openApp;
      if (openApp) openApp(appId);
    }
  });

  desktop.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('application/x-tapasos-app')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  });

  // Trash dock icon as drop target — uninstall app
  initTrashDropTarget();
}

function initTrashDropTarget() {
  const dock = document.getElementById('dock');
  if (!dock) return;

  // Use event delegation since dock rebuilds
  dock.addEventListener('dragover', (e) => {
    const trashItem = e.target.closest('.dock-item[data-app="trash"]');
    if (!trashItem) return;
    if (!e.dataTransfer.types.includes('application/x-tapasos-app')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    trashItem.classList.add('trash-drop-hover');
  });

  dock.addEventListener('dragleave', (e) => {
    const trashItem = e.target.closest('.dock-item[data-app="trash"]');
    if (trashItem) trashItem.classList.remove('trash-drop-hover');
  });

  dock.addEventListener('drop', (e) => {
    const trashItem = e.target.closest('.dock-item[data-app="trash"]');
    if (!trashItem) return;
    trashItem.classList.remove('trash-drop-hover');

    const appId = e.dataTransfer.getData('application/x-tapasos-app');
    if (!appId) return;
    e.preventDefault();
    e.stopPropagation(); // Prevent desktop handler from opening the app

    const uninstall = window.__tapasos_uninstallApp;
    if (uninstall) uninstall(appId);
  });
}

function findAppIdByName(name) {
  const registry = window.__tapasos_getAppRegistry?.() || [];
  const match = registry.find(a =>
    a.title.toLowerCase() === name.toLowerCase() ||
    a.title.toLowerCase().replace(/\s/g, '') === name.toLowerCase().replace(/\s/g, '')
  );
  return match?.id || null;
}

function injectStyles() {
  if (document.getElementById('dragdrop-styles')) return;
  const s = document.createElement('style');
  s.id = 'dragdrop-styles';
  s.textContent = `
    /* Dock drag */
    .dock-dragging {
      opacity: 0.9;
      transform: scale(1.15) !important;
      cursor: grabbing !important;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
      transition: none !important;
      pointer-events: none;
    }

    .dock-placeholder {
      background: rgba(0, 229, 255, 0.08);
      border: 2px dashed rgba(0, 229, 255, 0.2);
      border-radius: 12px;
      flex-shrink: 0;
      margin: 0 2px;
      transition: width 0.15s ease;
    }

    /* Desktop drop zone */
    .desktop-drop-active::after {
      content: 'Drop to create a note';
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 229, 255, 0.04);
      border: 2px dashed rgba(0, 229, 255, 0.15);
      border-radius: 12px;
      margin: 8px;
      font-family: var(--font-body);
      font-size: 14px;
      color: rgba(0, 229, 255, 0.5);
      pointer-events: none;
    }

    /* Trash drop target highlight */
    .dock-item.trash-drop-hover {
      transform: scale(1.3) !important;
      filter: drop-shadow(0 0 8px rgba(255, 59, 48, 0.5));
      transition: transform 0.15s ease, filter 0.15s ease;
    }

    /* Finder draggable items */
    .vfs-item[data-type="app"][draggable="true"] {
      cursor: grab;
    }

    .vfs-item[data-type="app"][draggable="true"]:active {
      cursor: grabbing;
    }
  `;
  document.head.appendChild(s);
}
