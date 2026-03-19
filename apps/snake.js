// Snake — Classic snake game for TapasOS

let container, canvas, ctx, gameLoop;
let snake, food, dir, nextDir, score, gameOver, cellSize, cols, rows;
let currentSpeed = 120; // default Normal speed

const SPEED_OPTIONS = [
  { label: 'Slow', value: 180 },
  { label: 'Normal', value: 120 },
  { label: 'Fast', value: 70 },
  { label: 'Insane', value: 40 },
];

export function init(el) {
  container = el;
  currentSpeed = 120;
  container.innerHTML = `
    <div class="snake-app">
      <div class="snake-header">
        <span class="snake-score">Score: <strong id="snake-score">0</strong></span>
        <div class="snake-header-btns">
          <button class="snake-btn" id="snake-help-btn" title="How to Play">?</button>
          <button class="snake-btn" id="snake-settings-btn" title="Settings">&#9881;</button>
          <button class="snake-restart" id="snake-restart">New Game</button>
        </div>
      </div>
      <div class="snake-canvas-wrap">
        <canvas id="snake-canvas"></canvas>
        <div class="snake-overlay" id="snake-settings-overlay">
          <div class="snake-overlay-panel">
            <div class="snake-overlay-title">Settings</div>
            <div class="snake-overlay-section">
              <div class="snake-overlay-label">Speed</div>
              <div class="snake-speed-options" id="snake-speed-options"></div>
            </div>
            <button class="snake-overlay-close" id="snake-settings-close">Close</button>
          </div>
        </div>
        <div class="snake-overlay" id="snake-help-overlay">
          <div class="snake-overlay-panel">
            <div class="snake-overlay-title">How to Play</div>
            <ul class="snake-help-list">
              <li>Arrow keys or <strong>WASD</strong> to move</li>
              <li>Eat the <span style="color:#ff5252">red food</span> to grow and score points</li>
              <li>Don't hit the walls or yourself</li>
              <li>Score: <strong>+10</strong> per food</li>
            </ul>
            <button class="snake-overlay-close" id="snake-help-close">Close</button>
          </div>
        </div>
      </div>
      <div class="snake-hint">Arrow keys or WASD to move</div>
    </div>
  `;
  injectStyles();
  canvas = container.querySelector('#snake-canvas');
  ctx = canvas.getContext('2d');

  // Button listeners
  container.querySelector('#snake-restart').addEventListener('click', startGame);
  container.querySelector('#snake-settings-btn').addEventListener('click', toggleSettings);
  container.querySelector('#snake-settings-close').addEventListener('click', toggleSettings);
  container.querySelector('#snake-help-btn').addEventListener('click', toggleHelp);
  container.querySelector('#snake-help-close').addEventListener('click', toggleHelp);

  // Close overlays when clicking backdrop
  container.querySelector('#snake-settings-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) toggleSettings();
  });
  container.querySelector('#snake-help-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) toggleHelp();
  });

  buildSpeedOptions();
  window.addEventListener('keydown', handleKey);
  resize();
  startGame();
}

function buildSpeedOptions() {
  const wrap = container.querySelector('#snake-speed-options');
  wrap.innerHTML = '';
  SPEED_OPTIONS.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'snake-speed-btn' + (opt.value === currentSpeed ? ' active' : '');
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      currentSpeed = opt.value;
      // Update active state
      wrap.querySelectorAll('.snake-speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Restart game with new speed
      toggleSettings();
      startGame();
    });
    wrap.appendChild(btn);
  });
}

function toggleSettings() {
  const overlay = container.querySelector('#snake-settings-overlay');
  const helpOverlay = container.querySelector('#snake-help-overlay');
  // Close help if open
  helpOverlay.classList.remove('visible');
  overlay.classList.toggle('visible');
}

function toggleHelp() {
  const overlay = container.querySelector('#snake-help-overlay');
  const settingsOverlay = container.querySelector('#snake-settings-overlay');
  // Close settings if open
  settingsOverlay.classList.remove('visible');
  overlay.classList.toggle('visible');
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
  gameLoop = setInterval(tick, currentSpeed);
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
  // Close overlays on Escape
  if (e.key === 'Escape') {
    const settings = container.querySelector('#snake-settings-overlay');
    const help = container.querySelector('#snake-help-overlay');
    if (settings.classList.contains('visible')) { settings.classList.remove('visible'); e.preventDefault(); return; }
    if (help.classList.contains('visible')) { help.classList.remove('visible'); e.preventDefault(); return; }
  }
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
    .snake-header { display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 16px; box-sizing:border-box; }
    .snake-header-btns { display:flex; gap:6px; align-items:center; }
    .snake-score { color:#ccc; font-size:13px; font-family:var(--font-mono); }
    .snake-restart { padding:4px 12px; border-radius:5px; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:11px; cursor:pointer; font-family:var(--font-body); }
    .snake-restart:hover { background:rgba(0,229,255,0.15); }
    .snake-btn { width:26px; height:26px; border-radius:5px; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; line-height:1; font-family:var(--font-mono); }
    .snake-btn:hover { background:rgba(0,229,255,0.15); }
    .snake-canvas-wrap { position:relative; display:flex; align-items:center; justify-content:center; }
    #snake-canvas { border:1px solid rgba(255,255,255,0.06); border-radius:4px; }
    .snake-hint { color:#555; font-size:10px; padding:6px; font-family:var(--font-mono); }

    /* Overlays */
    .snake-overlay {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.5); border-radius:4px; z-index:10;
      opacity:0; pointer-events:none; transition:opacity 0.2s ease;
    }
    .snake-overlay.visible { opacity:1; pointer-events:auto; }
    .snake-overlay-panel {
      background:rgba(10,10,18,0.95); border:1px solid rgba(0,229,255,0.15);
      border-radius:10px; padding:24px 28px; min-width:220px; max-width:280px;
      display:flex; flex-direction:column; align-items:center; gap:16px;
      box-shadow:0 8px 32px rgba(0,0,0,0.5);
    }
    .snake-overlay-title {
      color:#00e5ff; font-size:15px; font-weight:600; font-family:var(--font-body);
      letter-spacing:0.5px;
    }
    .snake-overlay-section { display:flex; flex-direction:column; align-items:center; gap:8px; width:100%; }
    .snake-overlay-label { color:#888; font-size:11px; font-family:var(--font-mono); text-transform:uppercase; letter-spacing:1px; }
    .snake-speed-options { display:flex; gap:6px; }
    .snake-speed-btn {
      padding:5px 10px; border-radius:5px; border:1px solid rgba(255,255,255,0.1);
      background:rgba(255,255,255,0.04); color:#888; font-size:11px; cursor:pointer;
      font-family:var(--font-mono); transition:all 0.15s ease;
    }
    .snake-speed-btn:hover { border-color:rgba(0,229,255,0.3); color:#ccc; }
    .snake-speed-btn.active {
      border-color:rgba(0,229,255,0.5); background:rgba(0,229,255,0.12); color:#00e5ff;
    }
    .snake-overlay-close {
      padding:5px 18px; border-radius:5px; border:1px solid rgba(255,255,255,0.1);
      background:rgba(255,255,255,0.04); color:#888; font-size:11px; cursor:pointer;
      font-family:var(--font-body); transition:all 0.15s ease; margin-top:4px;
    }
    .snake-overlay-close:hover { border-color:rgba(0,229,255,0.3); color:#ccc; }

    /* Help list */
    .snake-help-list {
      list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; width:100%;
    }
    .snake-help-list li {
      color:#ccc; font-size:12px; font-family:var(--font-body); line-height:1.5;
      padding-left:14px; position:relative;
    }
    .snake-help-list li::before {
      content:''; position:absolute; left:0; top:7px; width:5px; height:5px;
      border-radius:50%; background:#00e5ff; opacity:0.6;
    }
    .snake-help-list li strong { color:#00e5ff; }
  `;
  document.head.appendChild(s);
}
