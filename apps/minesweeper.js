// Minesweeper — Classic mine-clearing puzzle

let container;
let board, revealed, flagged, mines, rows, cols, mineCount, gameOver, won, firstClick;
let currentDifficulty = 'medium';
let showSettings = false;
let showHelp = false;

const DIFFICULTIES = {
  easy:   { label: 'Easy',   rows: 8,  cols: 8,  mines: 10 },
  medium: { label: 'Medium', rows: 10, cols: 10, mines: 15 },
  hard:   { label: 'Hard',   rows: 12, cols: 12, mines: 25 }
};

export function init(el) {
  container = el;
  injectStyles();
  startGame();
}

function startGame() {
  const diff = DIFFICULTIES[currentDifficulty];
  rows = diff.rows; cols = diff.cols; mineCount = diff.mines;
  board = Array(rows).fill(null).map(() => Array(cols).fill(0));
  revealed = Array(rows).fill(null).map(() => Array(cols).fill(false));
  flagged = Array(rows).fill(null).map(() => Array(cols).fill(false));
  mines = new Set();
  gameOver = false; won = false; firstClick = true;
  showSettings = false;
  showHelp = false;
  render();
}

function placeMines(safeR, safeC) {
  while (mines.size < mineCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    const key = r * cols + c;
    if (!mines.has(key)) {
      mines.add(key);
      board[r][c] = -1;
    }
  }
  // Count neighbors
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (board[r][c] === -1) continue;
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] === -1) count++;
    }
    board[r][c] = count;
  }
}

function reveal(r, c) {
  if (r < 0 || r >= rows || c < 0 || c >= cols || revealed[r][c] || flagged[r][c]) return;
  revealed[r][c] = true;
  if (board[r][c] === 0) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) reveal(r + dr, c + dc);
  }
}

function checkWin() {
  let unrevealed = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!revealed[r][c]) unrevealed++;
  }
  return unrevealed === mineCount;
}

function handleClick(r, c) {
  if (gameOver) return;
  if (flagged[r][c]) return;
  if (firstClick) { placeMines(r, c); firstClick = false; }
  if (board[r][c] === -1) {
    gameOver = true;
    // Reveal all mines
    for (const key of mines) {
      const mr = Math.floor(key / cols), mc = key % cols;
      revealed[mr][mc] = true;
    }
    render();
    return;
  }
  reveal(r, c);
  if (checkWin()) { won = true; gameOver = true; }
  render();
}

function handleRightClick(r, c, e) {
  e.preventDefault();
  if (gameOver || revealed[r][c]) return;
  flagged[r][c] = !flagged[r][c];
  render();
}

function toggleSettings() {
  showSettings = !showSettings;
  showHelp = false;
  render();
}

function toggleHelp() {
  showHelp = !showHelp;
  showSettings = false;
  render();
}

function setDifficulty(diff) {
  if (currentDifficulty === diff) return;
  currentDifficulty = diff;
  startGame();
}

const NUM_COLORS = ['','#5599ff','#44bb44','#ff5555','#9944cc','#cc6622','#22bbbb','#333','#888'];

function render() {
  const flagCount = flagged.flat().filter(Boolean).length;
  const diff = DIFFICULTIES[currentDifficulty];

  const settingsOverlay = showSettings ? `
    <div class="ms-overlay">
      <div class="ms-overlay-panel">
        <div class="ms-overlay-header">
          <span class="ms-overlay-title">Settings</span>
          <button class="ms-overlay-close" id="ms-close-settings">\u2715</button>
        </div>
        <div class="ms-overlay-body">
          <div class="ms-setting-label">Difficulty</div>
          <div class="ms-difficulty-group">
            ${Object.entries(DIFFICULTIES).map(([key, d]) => `
              <button class="ms-diff-btn ${currentDifficulty === key ? 'ms-diff-active' : ''}" data-diff="${key}">
                <span class="ms-diff-name">${d.label}</span>
                <span class="ms-diff-desc">${d.rows}\u00d7${d.cols} \u00b7 ${d.mines} mines</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  ` : '';

  const helpOverlay = showHelp ? `
    <div class="ms-overlay">
      <div class="ms-overlay-panel">
        <div class="ms-overlay-header">
          <span class="ms-overlay-title">How to Play</span>
          <button class="ms-overlay-close" id="ms-close-help">\u2715</button>
        </div>
        <div class="ms-overlay-body">
          <ul class="ms-help-list">
            <li><span class="ms-help-icon">\uD83D\uDC46</span>Click a cell to reveal it</li>
            <li><span class="ms-help-icon">\uD83D\uDD22</span>Numbers show how many adjacent mines</li>
            <li><span class="ms-help-icon">\uD83D\uDEA9</span>Right-click to place or remove a flag</li>
            <li><span class="ms-help-icon">\uD83C\uDFC6</span>Reveal all non-mine cells to win</li>
            <li><span class="ms-help-icon">\uD83D\uDEE1\uFE0F</span>First click is always safe</li>
          </ul>
        </div>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="ms-app">
      <div class="ms-header">
        <span class="ms-info">\uD83D\uDCA3 ${mineCount - flagCount}</span>
        <div class="ms-header-actions">
          <button class="ms-restart" id="ms-restart">${gameOver ? (won ? '\uD83C\uDF89' : '\uD83D\uDE35') : '\uD83D\uDE42'} New Game</button>
          <button class="ms-icon-btn" id="ms-settings-btn" title="Settings">\u2699</button>
          <button class="ms-icon-btn" id="ms-help-btn" title="How to Play">?</button>
        </div>
      </div>
      <div class="ms-board-wrapper">
        <div class="ms-board" style="grid-template-columns:repeat(${cols},1fr)">
          ${board.map((row, r) => row.map((v, c) => {
            const rev = revealed[r][c];
            const flag = flagged[r][c];
            let cls = 'ms-cell';
            let content = '';
            if (rev) {
              cls += ' ms-revealed';
              if (v === -1) { content = '\uD83D\uDCA5'; cls += ' ms-mine'; }
              else if (v > 0) { content = `<span style="color:${NUM_COLORS[v]}">${v}</span>`; }
            } else if (flag) {
              content = '\uD83D\uDEA9';
            }
            return `<div class="${cls}" data-r="${r}" data-c="${c}">${content}</div>`;
          }).join('')).join('')}
        </div>
        ${settingsOverlay}
        ${helpOverlay}
      </div>
      ${gameOver ? `<div class="ms-status">${won ? 'You Win! \uD83C\uDF89' : 'Game Over \uD83D\uDCA3'}</div>` : ''}
      <div class="ms-hint">Click to reveal \u00b7 Right-click to flag</div>
    </div>
  `;

  container.querySelector('#ms-restart').addEventListener('click', startGame);
  container.querySelector('#ms-settings-btn').addEventListener('click', toggleSettings);
  container.querySelector('#ms-help-btn').addEventListener('click', toggleHelp);

  if (showSettings) {
    container.querySelector('#ms-close-settings').addEventListener('click', toggleSettings);
    container.querySelectorAll('.ms-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => setDifficulty(btn.dataset.diff));
    });
  }

  if (showHelp) {
    container.querySelector('#ms-close-help').addEventListener('click', toggleHelp);
  }

  container.querySelectorAll('.ms-cell').forEach(el => {
    const r = +el.dataset.r, c = +el.dataset.c;
    el.addEventListener('click', () => handleClick(r, c));
    el.addEventListener('contextmenu', (e) => handleRightClick(r, c, e));
  });
}

function injectStyles() {
  if (document.getElementById('ms-styles')) return;
  const s = document.createElement('style');
  s.id = 'ms-styles';
  s.textContent = `
    .ms-app { display:flex; flex-direction:column; height:100%; background:#0a0a12; align-items:center; }
    .ms-header { display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 16px; }
    .ms-header-actions { display:flex; align-items:center; gap:6px; }
    .ms-info { color:#ccc; font-size:13px; font-family:var(--font-mono); }
    .ms-restart { padding:4px 12px; border-radius:5px; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:11px; cursor:pointer; font-family:var(--font-body); }
    .ms-icon-btn { width:28px; height:28px; border-radius:5px; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-family:var(--font-mono); transition:background 0.15s; }
    .ms-icon-btn:hover { background:rgba(0,229,255,0.18); }
    .ms-board-wrapper { position:relative; width:min(100%,380px); }
    .ms-board { display:grid; gap:2px; padding:8px; }
    .ms-cell { aspect-ratio:1; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.06); border-radius:3px; font-size:13px; font-weight:700; cursor:pointer; font-family:var(--font-mono); user-select:none; transition:background 0.1s; }
    .ms-cell:hover:not(.ms-revealed) { background:rgba(255,255,255,0.1); }
    .ms-revealed { background:rgba(255,255,255,0.02); cursor:default; }
    .ms-mine { background:rgba(255,50,50,0.15); }
    .ms-status { color:#00e5ff; font-size:14px; font-weight:600; padding:8px; }
    .ms-hint { color:#555; font-size:10px; padding:6px; font-family:var(--font-mono); }

    .ms-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; z-index:10; background:rgba(0,0,0,0.5); border-radius:4px; }
    .ms-overlay-panel { background:rgba(10,10,18,0.95); border:1px solid rgba(0,229,255,0.15); border-radius:10px; padding:0; width:85%; max-width:300px; box-shadow:0 8px 32px rgba(0,0,0,0.5); backdrop-filter:blur(12px); overflow:hidden; }
    .ms-overlay-header { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(0,229,255,0.1); }
    .ms-overlay-title { color:#00e5ff; font-size:13px; font-weight:600; font-family:var(--font-body); letter-spacing:0.3px; }
    .ms-overlay-close { background:none; border:none; color:#888; font-size:16px; cursor:pointer; padding:0 2px; line-height:1; transition:color 0.15s; }
    .ms-overlay-close:hover { color:#ccc; }
    .ms-overlay-body { padding:14px 16px; }

    .ms-setting-label { color:#888; font-size:10px; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; font-family:var(--font-mono); }
    .ms-difficulty-group { display:flex; flex-direction:column; gap:6px; }
    .ms-diff-btn { display:flex; flex-direction:column; gap:2px; padding:10px 14px; border-radius:7px; border:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.03); cursor:pointer; text-align:left; transition:all 0.15s; }
    .ms-diff-btn:hover { background:rgba(0,229,255,0.06); border-color:rgba(0,229,255,0.15); }
    .ms-diff-active { border-color:rgba(0,229,255,0.4); background:rgba(0,229,255,0.1); }
    .ms-diff-name { color:#ccc; font-size:12px; font-weight:600; font-family:var(--font-body); }
    .ms-diff-active .ms-diff-name { color:#00e5ff; }
    .ms-diff-desc { color:#555; font-size:10px; font-family:var(--font-mono); }
    .ms-diff-active .ms-diff-desc { color:#888; }

    .ms-help-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; }
    .ms-help-list li { display:flex; align-items:center; gap:10px; color:#ccc; font-size:12px; font-family:var(--font-body); line-height:1.4; }
    .ms-help-icon { font-size:16px; flex-shrink:0; width:24px; text-align:center; }
  `;
  document.head.appendChild(s);
}
