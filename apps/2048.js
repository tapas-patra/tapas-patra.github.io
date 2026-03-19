// 2048 — Slide and merge tiles

let container, score, board, gameOver;
let gridSize = 4;
let settingsOpen = false;
let helpOpen = false;

export function init(el) {
  container = el;
  injectStyles();
  startGame();
  window.addEventListener('keydown', handleKey);
}

function startGame() {
  board = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
  score = 0;
  gameOver = false;
  addTile();
  addTile();
  render();
}

function addTile() {
  const empty = [];
  board.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function slide(row) {
  let arr = row.filter(v => v);
  const merged = [];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      score += arr[i];
      arr[i + 1] = 0;
      merged.push(i);
    }
  }
  arr = arr.filter(v => v);
  while (arr.length < gridSize) arr.push(0);
  return arr;
}

function move(dir) {
  if (gameOver) return;
  const prev = JSON.stringify(board);
  if (dir === 'left') board = board.map(r => slide(r));
  else if (dir === 'right') board = board.map(r => slide([...r].reverse()).reverse());
  else if (dir === 'up') { transpose(); board = board.map(r => slide(r)); transpose(); }
  else if (dir === 'down') { transpose(); board = board.map(r => slide([...r].reverse()).reverse()); transpose(); }

  if (JSON.stringify(board) !== prev) {
    addTile();
    if (!canMove()) gameOver = true;
    render();
  }
}

function transpose() {
  board = board[0].map((_, c) => board.map(r => r[c]));
}

function canMove() {
  for (let r = 0; r < gridSize; r++) for (let c = 0; c < gridSize; c++) {
    if (!board[r][c]) return true;
    if (c < gridSize - 1 && board[r][c] === board[r][c + 1]) return true;
    if (r < gridSize - 1 && board[r][c] === board[r + 1][c]) return true;
  }
  return false;
}

const COLORS = {
  0:'rgba(255,255,255,0.03)',2:'#1a3a4a',4:'#1a4a3a',8:'#4a3a1a',16:'#5a2a1a',
  32:'#6a1a1a',64:'#7a1a2a',128:'#2a3a6a',256:'#2a4a7a',512:'#3a2a6a',
  1024:'#5a2a6a',2048:'#00e5ff',4096:'#00b8d4',8192:'#0097a7',
  16384:'#00796b',32768:'#00695c',65536:'#004d40',131072:'#1b5e20'
};
const TEXT_COLORS = { 0:'transparent',2:'#aaddee',4:'#aaeedd' };

function tileFontSize() {
  if (gridSize <= 4) return '20px';
  if (gridSize === 5) return '16px';
  return '14px';
}

function render() {
  container.innerHTML = `
    <div class="g2048-app">
      <div class="g2048-header">
        <span class="g2048-score">Score: <strong>${score}</strong></span>
        <div class="g2048-header-buttons">
          <button class="g2048-icon-btn" id="g2048-help-btn" title="How to Play">?</button>
          <button class="g2048-icon-btn" id="g2048-settings-btn" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          <button class="g2048-restart" id="g2048-restart">New Game</button>
        </div>
      </div>
      <div class="g2048-board" style="grid-template-columns:repeat(${gridSize},1fr);">
        ${board.map(row => row.map(v => `
          <div class="g2048-tile" style="background:${COLORS[v] || '#00e5ff'};color:${TEXT_COLORS[v] || '#fff'};font-size:${tileFontSize()}">
            ${v || ''}
          </div>
        `).join('')).join('')}
      </div>
      ${gameOver ? '<div class="g2048-over">Game Over! Score: ' + score + '</div>' : ''}
      <div class="g2048-hint">Arrow keys to slide tiles</div>
      ${settingsOpen ? renderSettings() : ''}
      ${helpOpen ? renderHelp() : ''}
    </div>
  `;
  container.querySelector('#g2048-restart')?.addEventListener('click', startGame);
  container.querySelector('#g2048-settings-btn')?.addEventListener('click', toggleSettings);
  container.querySelector('#g2048-help-btn')?.addEventListener('click', toggleHelp);
  container.querySelector('#g2048-settings-close')?.addEventListener('click', toggleSettings);
  container.querySelector('#g2048-help-close')?.addEventListener('click', toggleHelp);

  // Settings radio buttons
  container.querySelectorAll('input[name="g2048-gridsize"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      gridSize = parseInt(e.target.value);
      settingsOpen = false;
      startGame();
    });
  });
}

function renderSettings() {
  const sizes = [
    { value: 4, label: '4x4', desc: 'Classic' },
    { value: 5, label: '5x5', desc: 'Medium' },
    { value: 6, label: '6x6', desc: 'Large' }
  ];
  return `
    <div class="g2048-overlay">
      <div class="g2048-panel">
        <div class="g2048-panel-header">
          <span class="g2048-panel-title">Settings</span>
          <button class="g2048-close-btn" id="g2048-settings-close">&times;</button>
        </div>
        <div class="g2048-panel-body">
          <div class="g2048-setting-label">Grid Size</div>
          <div class="g2048-grid-options">
            ${sizes.map(s => `
              <label class="g2048-grid-option ${gridSize === s.value ? 'g2048-grid-option--active' : ''}">
                <input type="radio" name="g2048-gridsize" value="${s.value}" ${gridSize === s.value ? 'checked' : ''} />
                <span class="g2048-grid-option-label">${s.label}</span>
                <span class="g2048-grid-option-desc">${s.desc}</span>
              </label>
            `).join('')}
          </div>
          <div class="g2048-setting-note">Changing grid size restarts the game.</div>
        </div>
      </div>
    </div>
  `;
}

function renderHelp() {
  return `
    <div class="g2048-overlay">
      <div class="g2048-panel">
        <div class="g2048-panel-header">
          <span class="g2048-panel-title">How to Play</span>
          <button class="g2048-close-btn" id="g2048-help-close">&times;</button>
        </div>
        <div class="g2048-panel-body">
          <div class="g2048-help-item">
            <span class="g2048-help-icon">&#8592;&#8593;&#8595;&#8594;</span>
            <span class="g2048-help-text">Use <strong>arrow keys</strong> to slide all tiles in that direction.</span>
          </div>
          <div class="g2048-help-item">
            <span class="g2048-help-icon">+</span>
            <span class="g2048-help-text">Tiles with the <strong>same number</strong> merge when they collide.</span>
          </div>
          <div class="g2048-help-item">
            <span class="g2048-help-icon">&#9733;</span>
            <span class="g2048-help-text">Goal: reach the <strong>2048</strong> tile!</span>
          </div>
          <div class="g2048-help-item">
            <span class="g2048-help-icon">&#9734;</span>
            <span class="g2048-help-text">Each merge <strong>adds to your score</strong> by the merged value.</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function toggleSettings() {
  settingsOpen = !settingsOpen;
  helpOpen = false;
  render();
}

function toggleHelp() {
  helpOpen = !helpOpen;
  settingsOpen = false;
  render();
}

function handleKey(e) {
  if (!container?.isConnected) return;
  if (settingsOpen || helpOpen) {
    if (e.key === 'Escape') {
      settingsOpen = false;
      helpOpen = false;
      render();
    }
    return;
  }
  const map = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' };
  if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
}

function injectStyles() {
  if (document.getElementById('g2048-styles')) return;
  const s = document.createElement('style');
  s.id = 'g2048-styles';
  s.textContent = `
    .g2048-app { display:flex; flex-direction:column; height:100%; background:#0a0a12; align-items:center; position:relative; }
    .g2048-header { display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 16px; }
    .g2048-header-buttons { display:flex; align-items:center; gap:8px; }
    .g2048-score { color:#ccc; font-size:13px; font-family:var(--font-mono); }
    .g2048-restart { padding:4px 12px; border-radius:5px; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:11px; cursor:pointer; font-family:var(--font-body); }
    .g2048-restart:hover { background:rgba(0,229,255,0.15); }
    .g2048-icon-btn {
      width:28px; height:28px; border-radius:50%; border:1px solid rgba(0,229,255,0.2);
      background:rgba(0,229,255,0.08); color:#00e5ff; font-size:14px; cursor:pointer;
      display:flex; align-items:center; justify-content:center; padding:0;
      font-family:var(--font-mono); font-weight:700; line-height:1;
      transition: background 0.15s;
    }
    .g2048-icon-btn:hover { background:rgba(0,229,255,0.2); }
    .g2048-icon-btn svg { width:14px; height:14px; }
    .g2048-board { display:grid; gap:6px; padding:12px; width:min(100%,340px); aspect-ratio:1; }
    .g2048-tile { display:flex; align-items:center; justify-content:center; border-radius:8px; font-weight:700; font-family:var(--font-mono); transition:background 0.1s; }
    .g2048-over { color:#ff5252; font-size:14px; font-weight:600; padding:10px; }
    .g2048-hint { color:#555; font-size:10px; padding:6px; font-family:var(--font-mono); }

    /* Overlay */
    .g2048-overlay {
      position:absolute; inset:0; z-index:10;
      display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);
    }
    .g2048-panel {
      background:rgba(10,10,18,0.95); border:1px solid rgba(0,229,255,0.15);
      border-radius:12px; width:min(90%,300px); box-shadow:0 8px 32px rgba(0,0,0,0.5);
      overflow:hidden;
    }
    .g2048-panel-header {
      display:flex; justify-content:space-between; align-items:center;
      padding:14px 16px 10px; border-bottom:1px solid rgba(0,229,255,0.08);
    }
    .g2048-panel-title { color:#00e5ff; font-size:14px; font-weight:600; font-family:var(--font-mono); }
    .g2048-close-btn {
      width:24px; height:24px; border:none; background:none; color:#888;
      font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center;
      border-radius:4px; transition:color 0.15s, background 0.15s; padding:0; line-height:1;
    }
    .g2048-close-btn:hover { color:#fff; background:rgba(255,255,255,0.08); }
    .g2048-panel-body { padding:16px; }

    /* Settings */
    .g2048-setting-label { color:#ccc; font-size:12px; font-family:var(--font-mono); margin-bottom:10px; }
    .g2048-grid-options { display:flex; gap:8px; }
    .g2048-grid-option {
      flex:1; display:flex; flex-direction:column; align-items:center; gap:2px;
      padding:10px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);
      background:rgba(255,255,255,0.03); cursor:pointer; transition:all 0.15s;
    }
    .g2048-grid-option:hover { border-color:rgba(0,229,255,0.2); background:rgba(0,229,255,0.05); }
    .g2048-grid-option--active {
      border-color:rgba(0,229,255,0.5) !important;
      background:rgba(0,229,255,0.1) !important;
      box-shadow:0 0 12px rgba(0,229,255,0.1);
    }
    .g2048-grid-option--active .g2048-grid-option-label { color:#00e5ff; }
    .g2048-grid-option input { display:none; }
    .g2048-grid-option-label { color:#ccc; font-size:14px; font-weight:700; font-family:var(--font-mono); transition:color 0.15s; }
    .g2048-grid-option-desc { color:#555; font-size:10px; font-family:var(--font-mono); }
    .g2048-setting-note { color:#555; font-size:10px; font-family:var(--font-mono); margin-top:12px; text-align:center; }

    /* Help */
    .g2048-help-item {
      display:flex; align-items:flex-start; gap:10px; padding:8px 0;
      border-bottom:1px solid rgba(255,255,255,0.04);
    }
    .g2048-help-item:last-child { border-bottom:none; }
    .g2048-help-icon {
      color:#00e5ff; font-size:14px; font-family:var(--font-mono);
      min-width:32px; text-align:center; padding-top:1px;
    }
    .g2048-help-text { color:#888; font-size:12px; font-family:var(--font-mono); line-height:1.5; }
    .g2048-help-text strong { color:#ccc; }
  `;
  document.head.appendChild(s);
}
