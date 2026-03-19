// 2048 — Slide and merge tiles

let container, score, board, gameOver;

export function init(el) {
  container = el;
  injectStyles();
  startGame();
  window.addEventListener('keydown', handleKey);
}

function startGame() {
  board = Array(4).fill(null).map(() => Array(4).fill(0));
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
  while (arr.length < 4) arr.push(0);
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
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (!board[r][c]) return true;
    if (c < 3 && board[r][c] === board[r][c + 1]) return true;
    if (r < 3 && board[r][c] === board[r + 1][c]) return true;
  }
  return false;
}

const COLORS = {
  0:'rgba(255,255,255,0.03)',2:'#1a3a4a',4:'#1a4a3a',8:'#4a3a1a',16:'#5a2a1a',
  32:'#6a1a1a',64:'#7a1a2a',128:'#2a3a6a',256:'#2a4a7a',512:'#3a2a6a',
  1024:'#5a2a6a',2048:'#00e5ff'
};
const TEXT_COLORS = { 0:'transparent',2:'#aaddee',4:'#aaeedd' };

function render() {
  container.innerHTML = `
    <div class="g2048-app">
      <div class="g2048-header">
        <span class="g2048-score">Score: <strong>${score}</strong></span>
        <button class="g2048-restart" id="g2048-restart">New Game</button>
      </div>
      <div class="g2048-board">
        ${board.map(row => row.map(v => `
          <div class="g2048-tile" style="background:${COLORS[v] || '#00e5ff'};color:${TEXT_COLORS[v] || '#fff'}">
            ${v || ''}
          </div>
        `).join('')).join('')}
      </div>
      ${gameOver ? '<div class="g2048-over">Game Over! Score: ' + score + '</div>' : ''}
      <div class="g2048-hint">Arrow keys to slide tiles</div>
    </div>
  `;
  container.querySelector('#g2048-restart')?.addEventListener('click', startGame);
}

function handleKey(e) {
  if (!container?.isConnected) return;
  const map = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' };
  if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
}

function injectStyles() {
  if (document.getElementById('g2048-styles')) return;
  const s = document.createElement('style');
  s.id = 'g2048-styles';
  s.textContent = `
    .g2048-app { display:flex; flex-direction:column; height:100%; background:#0a0a12; align-items:center; }
    .g2048-header { display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 16px; }
    .g2048-score { color:#ccc; font-size:13px; font-family:var(--font-mono); }
    .g2048-restart { padding:4px 12px; border-radius:5px; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:11px; cursor:pointer; font-family:var(--font-body); }
    .g2048-board { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; padding:12px; width:min(100%,340px); aspect-ratio:1; }
    .g2048-tile { display:flex; align-items:center; justify-content:center; border-radius:8px; font-size:20px; font-weight:700; font-family:var(--font-mono); transition:background 0.1s; }
    .g2048-over { color:#ff5252; font-size:14px; font-weight:600; padding:10px; }
    .g2048-hint { color:#555; font-size:10px; padding:6px; font-family:var(--font-mono); }
  `;
  document.head.appendChild(s);
}
