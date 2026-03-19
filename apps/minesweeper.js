// Minesweeper — Classic mine-clearing puzzle

let container;
let board, revealed, flagged, mines, rows, cols, mineCount, gameOver, won, firstClick;

export function init(el) {
  container = el;
  injectStyles();
  startGame();
}

function startGame() {
  rows = 10; cols = 10; mineCount = 15;
  board = Array(rows).fill(null).map(() => Array(cols).fill(0));
  revealed = Array(rows).fill(null).map(() => Array(cols).fill(false));
  flagged = Array(rows).fill(null).map(() => Array(cols).fill(false));
  mines = new Set();
  gameOver = false; won = false; firstClick = true;
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

const NUM_COLORS = ['','#5599ff','#44bb44','#ff5555','#9944cc','#cc6622','#22bbbb','#333','#888'];

function render() {
  const flagCount = flagged.flat().filter(Boolean).length;
  container.innerHTML = `
    <div class="ms-app">
      <div class="ms-header">
        <span class="ms-info">\uD83D\uDCA3 ${mineCount - flagCount}</span>
        <button class="ms-restart" id="ms-restart">${gameOver ? (won ? '\uD83C\uDF89' : '\uD83D\uDE35') : '\uD83D\uDE42'} New Game</button>
      </div>
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
      ${gameOver ? `<div class="ms-status">${won ? 'You Win! \uD83C\uDF89' : 'Game Over \uD83D\uDCA3'}</div>` : ''}
      <div class="ms-hint">Click to reveal \u00b7 Right-click to flag</div>
    </div>
  `;

  container.querySelector('#ms-restart').addEventListener('click', startGame);
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
    .ms-info { color:#ccc; font-size:13px; font-family:var(--font-mono); }
    .ms-restart { padding:4px 12px; border-radius:5px; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:11px; cursor:pointer; font-family:var(--font-body); }
    .ms-board { display:grid; gap:2px; padding:8px; width:min(100%,380px); }
    .ms-cell { aspect-ratio:1; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.06); border-radius:3px; font-size:13px; font-weight:700; cursor:pointer; font-family:var(--font-mono); user-select:none; transition:background 0.1s; }
    .ms-cell:hover:not(.ms-revealed) { background:rgba(255,255,255,0.1); }
    .ms-revealed { background:rgba(255,255,255,0.02); cursor:default; }
    .ms-mine { background:rgba(255,50,50,0.15); }
    .ms-status { color:#00e5ff; font-size:14px; font-weight:600; padding:8px; }
    .ms-hint { color:#555; font-size:10px; padding:6px; font-family:var(--font-mono); }
  `;
  document.head.appendChild(s);
}
