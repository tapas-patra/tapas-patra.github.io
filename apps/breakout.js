// Breakout — Break bricks with a bouncing ball

let container, canvas, ctx, animId;
let paddle, ball, bricks, score, lives, gameOver;

// Settings with defaults
let settings = {
  ballSpeed: 3,
  paddleSize: 80,
  lives: 3
};

export function init(el) {
  container = el;
  container.innerHTML = `
    <div class="brk-app">
      <div class="brk-header">
        <span class="brk-info">Score: <strong id="brk-score">0</strong> &middot; Lives: <span id="brk-lives">3</span></span>
        <div class="brk-header-btns">
          <button class="brk-icon-btn" id="brk-help-btn" title="How to Play">?</button>
          <button class="brk-icon-btn" id="brk-settings-btn" title="Settings">&#9881;</button>
          <button class="brk-restart" id="brk-restart">New Game</button>
        </div>
      </div>
      <div class="brk-canvas-wrap">
        <canvas id="brk-canvas"></canvas>
        <div class="brk-overlay" id="brk-settings-overlay">
          <div class="brk-overlay-panel">
            <div class="brk-overlay-title">Settings</div>
            <button class="brk-overlay-close" id="brk-settings-close">&times;</button>
            <div class="brk-setting-group">
              <div class="brk-setting-label">Ball Speed</div>
              <div class="brk-setting-options" data-setting="ballSpeed">
                <button class="brk-opt" data-value="2">Slow</button>
                <button class="brk-opt" data-value="3">Normal</button>
                <button class="brk-opt" data-value="4.5">Fast</button>
              </div>
            </div>
            <div class="brk-setting-group">
              <div class="brk-setting-label">Paddle Size</div>
              <div class="brk-setting-options" data-setting="paddleSize">
                <button class="brk-opt" data-value="60">Small</button>
                <button class="brk-opt" data-value="80">Normal</button>
                <button class="brk-opt" data-value="110">Large</button>
              </div>
            </div>
            <div class="brk-setting-group">
              <div class="brk-setting-label">Lives</div>
              <div class="brk-setting-options" data-setting="lives">
                <button class="brk-opt" data-value="1">1</button>
                <button class="brk-opt" data-value="3">3</button>
                <button class="brk-opt" data-value="5">5</button>
              </div>
            </div>
          </div>
        </div>
        <div class="brk-overlay" id="brk-help-overlay">
          <div class="brk-overlay-panel">
            <div class="brk-overlay-title">How to Play</div>
            <button class="brk-overlay-close" id="brk-help-close">&times;</button>
            <ul class="brk-help-list">
              <li>Move mouse or use arrow keys to control the paddle</li>
              <li>Bounce the ball to break all bricks</li>
              <li>Don't let the ball fall below the paddle</li>
              <li>Each brick = 10 points</li>
              <li>Break all bricks to win!</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="brk-hint">Move mouse or arrow keys to control paddle</div>
    </div>
  `;
  injectStyles();
  canvas = container.querySelector('#brk-canvas');
  ctx = canvas.getContext('2d');
  container.querySelector('#brk-restart').addEventListener('click', startGame);

  // Settings button
  container.querySelector('#brk-settings-btn').addEventListener('click', () => {
    const overlay = container.querySelector('#brk-settings-overlay');
    overlay.classList.toggle('brk-overlay-visible');
    container.querySelector('#brk-help-overlay').classList.remove('brk-overlay-visible');
  });
  container.querySelector('#brk-settings-close').addEventListener('click', () => {
    container.querySelector('#brk-settings-overlay').classList.remove('brk-overlay-visible');
  });

  // Help button
  container.querySelector('#brk-help-btn').addEventListener('click', () => {
    const overlay = container.querySelector('#brk-help-overlay');
    overlay.classList.toggle('brk-overlay-visible');
    container.querySelector('#brk-settings-overlay').classList.remove('brk-overlay-visible');
  });
  container.querySelector('#brk-help-close').addEventListener('click', () => {
    container.querySelector('#brk-help-overlay').classList.remove('brk-overlay-visible');
  });

  // Settings option clicks
  container.querySelectorAll('.brk-setting-options').forEach(group => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.brk-opt');
      if (!btn) return;
      const key = group.dataset.setting;
      const val = parseFloat(btn.dataset.value);
      settings[key] = val;
      highlightActiveSettings();
      startGame();
    });
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    paddle.x = e.clientX - rect.left - paddle.w / 2;
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, paddle.x));
  });
  window.addEventListener('keydown', (e) => {
    if (!container?.isConnected) return;
    if (e.key === 'ArrowLeft') paddle.x = Math.max(0, paddle.x - 30);
    if (e.key === 'ArrowRight') paddle.x = Math.min(canvas.width - paddle.w, paddle.x + 30);
  });
  resize();
  highlightActiveSettings();
  startGame();
}

function highlightActiveSettings() {
  container.querySelectorAll('.brk-setting-options').forEach(group => {
    const key = group.dataset.setting;
    group.querySelectorAll('.brk-opt').forEach(btn => {
      const val = parseFloat(btn.dataset.value);
      btn.classList.toggle('brk-opt-active', val === settings[key]);
    });
  });
}

function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight - 70;
  canvas.width = Math.min(w - 20, 460);
  canvas.height = Math.min(h, 400);
}

function startGame() {
  cancelAnimationFrame(animId);
  const cw = canvas.width, ch = canvas.height;
  const pw = settings.paddleSize;
  const spd = settings.ballSpeed;
  paddle = { x: cw / 2 - pw / 2, y: ch - 20, w: pw, h: 10 };
  ball = { x: cw / 2, y: ch - 35, dx: spd, dy: -spd, r: 6 };
  score = 0; lives = settings.lives; gameOver = false;

  // Create bricks
  const brickRows = 5, brickCols = Math.floor((cw - 20) / 52);
  const colors = ['#ff5252', '#ffa726', '#ffeb3b', '#66bb6a', '#42a5f5'];
  bricks = [];
  for (let r = 0; r < brickRows; r++) {
    for (let c = 0; c < brickCols; c++) {
      bricks.push({ x: 10 + c * 52, y: 30 + r * 22, w: 48, h: 18, color: colors[r], alive: true });
    }
  }
  updateUI();
  loop();
}

function loop() {
  if (gameOver) return;
  update();
  draw();
  animId = requestAnimationFrame(loop);
}

function update() {
  const b = ball, p = paddle, cw = canvas.width, ch = canvas.height;
  const spd = settings.ballSpeed;
  b.x += b.dx; b.y += b.dy;

  // Wall bounces
  if (b.x - b.r <= 0 || b.x + b.r >= cw) b.dx = -b.dx;
  if (b.y - b.r <= 0) b.dy = -b.dy;

  // Bottom — lose life
  if (b.y + b.r >= ch) {
    lives--;
    updateUI();
    if (lives <= 0) { gameOver = true; return; }
    b.x = cw / 2; b.y = ch - 35; b.dx = spd; b.dy = -spd;
  }

  // Paddle bounce
  if (b.dy > 0 && b.y + b.r >= p.y && b.x >= p.x && b.x <= p.x + p.w && b.y + b.r <= p.y + p.h + 5) {
    b.dy = -b.dy;
    const hit = (b.x - (p.x + p.w / 2)) / (p.w / 2);
    b.dx = hit * (spd * 4 / 3);
  }

  // Brick collision
  for (const brick of bricks) {
    if (!brick.alive) continue;
    if (b.x + b.r > brick.x && b.x - b.r < brick.x + brick.w && b.y + b.r > brick.y && b.y - b.r < brick.y + brick.h) {
      brick.alive = false;
      b.dy = -b.dy;
      score += 10;
      updateUI();
      if (bricks.every(br => !br.alive)) { gameOver = true; }
      break;
    }
  }
}

function draw() {
  const cw = canvas.width, ch = canvas.height;
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, cw, ch);

  // Bricks
  for (const br of bricks) {
    if (!br.alive) continue;
    ctx.fillStyle = br.color;
    ctx.beginPath();
    ctx.roundRect(br.x, br.y, br.w, br.h, 3);
    ctx.fill();
  }

  // Paddle
  ctx.fillStyle = '#00e5ff';
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 4);
  ctx.fill();

  // Ball
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.textAlign = 'center';
    const won = bricks.every(br => !br.alive);
    ctx.fillStyle = won ? '#00e5ff' : '#ff5252';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(won ? 'You Win!' : 'Game Over', cw / 2, ch / 2 - 10);
    ctx.fillStyle = '#888';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Score: ${score}`, cw / 2, ch / 2 + 15);
  }
}

function updateUI() {
  const s = container.querySelector('#brk-score');
  const l = container.querySelector('#brk-lives');
  if (s) s.textContent = score;
  if (l) l.textContent = lives;
}

function injectStyles() {
  if (document.getElementById('brk-styles')) return;
  const s = document.createElement('style');
  s.id = 'brk-styles';
  s.textContent = `
    .brk-app { display:flex; flex-direction:column; height:100%; background:#0a0a12; align-items:center; }
    .brk-header { display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 16px; }
    .brk-header-btns { display:flex; align-items:center; gap:6px; }
    .brk-info { color:#ccc; font-size:13px; font-family:var(--font-mono); }
    .brk-restart { padding:4px 12px; border-radius:5px; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:11px; cursor:pointer; font-family:var(--font-body); }
    .brk-icon-btn { width:26px; height:26px; border-radius:50%; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; padding:0; font-family:var(--font-body); transition:background 0.15s; }
    .brk-icon-btn:hover { background:rgba(0,229,255,0.18); }
    #brk-canvas { border:1px solid rgba(255,255,255,0.06); border-radius:4px; }
    .brk-hint { color:#555; font-size:10px; padding:6px; font-family:var(--font-mono); }
    .brk-canvas-wrap { position:relative; display:flex; align-items:center; justify-content:center; }

    /* Overlays */
    .brk-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; z-index:10; opacity:0; pointer-events:none; transition:opacity 0.2s; }
    .brk-overlay-visible { opacity:1; pointer-events:auto; }
    .brk-overlay-panel { background:rgba(10,10,18,0.95); border:1px solid rgba(0,229,255,0.15); border-radius:10px; padding:22px 24px 18px; min-width:240px; max-width:320px; position:relative; box-shadow:0 8px 32px rgba(0,0,0,0.5); }
    .brk-overlay-title { color:#00e5ff; font-size:15px; font-weight:700; margin-bottom:14px; font-family:var(--font-body); }
    .brk-overlay-close { position:absolute; top:10px; right:12px; background:none; border:none; color:#555; font-size:20px; cursor:pointer; line-height:1; padding:0; transition:color 0.15s; }
    .brk-overlay-close:hover { color:#ccc; }

    /* Settings */
    .brk-setting-group { margin-bottom:12px; }
    .brk-setting-label { color:#888; font-size:11px; margin-bottom:6px; font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.5px; }
    .brk-setting-options { display:flex; gap:6px; }
    .brk-opt { padding:4px 12px; border-radius:5px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:#888; font-size:11px; cursor:pointer; font-family:var(--font-mono); transition:all 0.15s; }
    .brk-opt:hover { border-color:rgba(0,229,255,0.3); color:#ccc; }
    .brk-opt-active { border-color:rgba(0,229,255,0.5); background:rgba(0,229,255,0.12); color:#00e5ff; }

    /* Help */
    .brk-help-list { list-style:none; padding:0; margin:0; }
    .brk-help-list li { color:#ccc; font-size:12px; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-family:var(--font-mono); line-height:1.5; }
    .brk-help-list li:last-child { border-bottom:none; }
    .brk-help-list li::before { content:''; display:inline-block; width:5px; height:5px; background:#00e5ff; border-radius:50%; margin-right:8px; vertical-align:middle; }
  `;
  document.head.appendChild(s);
}
