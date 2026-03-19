// Snake — Classic snake game for TapasOS

let container, canvas, ctx, gameLoop;
let snake, food, dir, nextDir, score, gameOver, cellSize, cols, rows;

export function init(el) {
  container = el;
  container.innerHTML = `
    <div class="snake-app">
      <div class="snake-header">
        <span class="snake-score">Score: <strong id="snake-score">0</strong></span>
        <button class="snake-restart" id="snake-restart">New Game</button>
      </div>
      <canvas id="snake-canvas"></canvas>
      <div class="snake-hint">Arrow keys or WASD to move</div>
    </div>
  `;
  injectStyles();
  canvas = container.querySelector('#snake-canvas');
  ctx = canvas.getContext('2d');
  container.querySelector('#snake-restart').addEventListener('click', startGame);
  window.addEventListener('keydown', handleKey);
  resize();
  startGame();
}

function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight - 70;
  cellSize = 18;
  cols = Math.floor(w / cellSize);
  rows = Math.floor(h / cellSize);
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
}

function startGame() {
  clearInterval(gameLoop);
  const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
  snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  gameOver = false;
  placeFood();
  updateScore();
  gameLoop = setInterval(tick, 120);
}

function placeFood() {
  do {
    food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
  } while (snake.some(s => s.x === food.x && s.y === food.y));
}

function tick() {
  if (gameOver) return;
  dir = { ...nextDir };
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows || snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver = true;
    clearInterval(gameLoop);
    draw();
    return;
  }

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    updateScore();
    placeFood();
  } else {
    snake.pop();
  }
  draw();
}

function draw() {
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  for (let x = 0; x <= cols; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, canvas.height); ctx.stroke(); }
  for (let y = 0; y <= rows; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(canvas.width, y * cellSize); ctx.stroke(); }

  // Snake
  snake.forEach((s, i) => {
    const alpha = 1 - (i / snake.length) * 0.5;
    ctx.fillStyle = i === 0 ? '#00e5ff' : `rgba(0,229,255,${alpha * 0.7})`;
    ctx.beginPath();
    ctx.roundRect(s.x * cellSize + 1, s.y * cellSize + 1, cellSize - 2, cellSize - 2, 3);
    ctx.fill();
  });

  // Food
  ctx.fillStyle = '#ff5252';
  ctx.beginPath();
  ctx.arc(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, cellSize / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillStyle = '#888';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 15);
  }
}

function handleKey(e) {
  if (!container?.isConnected) return;
  const map = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0], w: [0,-1], s: [0,1], a: [-1,0], d: [1,0] };
  const m = map[e.key];
  if (!m) return;
  if (m[0] !== -dir.x || m[1] !== -dir.y) {
    nextDir = { x: m[0], y: m[1] };
  }
  e.preventDefault();
}

function updateScore() {
  const el = container.querySelector('#snake-score');
  if (el) el.textContent = score;
}

function injectStyles() {
  if (document.getElementById('snake-styles')) return;
  const s = document.createElement('style');
  s.id = 'snake-styles';
  s.textContent = `
    .snake-app { display:flex; flex-direction:column; height:100%; background:#0a0a12; align-items:center; }
    .snake-header { display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 16px; }
    .snake-score { color:#ccc; font-size:13px; font-family:var(--font-mono); }
    .snake-restart { padding:4px 12px; border-radius:5px; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:11px; cursor:pointer; font-family:var(--font-body); }
    .snake-restart:hover { background:rgba(0,229,255,0.15); }
    #snake-canvas { border:1px solid rgba(255,255,255,0.06); border-radius:4px; }
    .snake-hint { color:#555; font-size:10px; padding:6px; font-family:var(--font-mono); }
  `;
  document.head.appendChild(s);
}
