// Breakout — Break bricks with a bouncing ball

let container, canvas, ctx, animId;
let paddle, ball, bricks, score, lives, gameOver;

export function init(el) {
  container = el;
  container.innerHTML = `
    <div class="brk-app">
      <div class="brk-header">
        <span class="brk-info">Score: <strong id="brk-score">0</strong> &middot; Lives: <span id="brk-lives">3</span></span>
        <button class="brk-restart" id="brk-restart">New Game</button>
      </div>
      <canvas id="brk-canvas"></canvas>
      <div class="brk-hint">Move mouse or arrow keys to control paddle</div>
    </div>
  `;
  injectStyles();
  canvas = container.querySelector('#brk-canvas');
  ctx = canvas.getContext('2d');
  container.querySelector('#brk-restart').addEventListener('click', startGame);
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
  startGame();
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
  paddle = { x: cw / 2 - 40, y: ch - 20, w: 80, h: 10 };
  ball = { x: cw / 2, y: ch - 35, dx: 3, dy: -3, r: 6 };
  score = 0; lives = 3; gameOver = false;

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
  b.x += b.dx; b.y += b.dy;

  // Wall bounces
  if (b.x - b.r <= 0 || b.x + b.r >= cw) b.dx = -b.dx;
  if (b.y - b.r <= 0) b.dy = -b.dy;

  // Bottom — lose life
  if (b.y + b.r >= ch) {
    lives--;
    updateUI();
    if (lives <= 0) { gameOver = true; return; }
    b.x = cw / 2; b.y = ch - 35; b.dx = 3; b.dy = -3;
  }

  // Paddle bounce
  if (b.dy > 0 && b.y + b.r >= p.y && b.x >= p.x && b.x <= p.x + p.w && b.y + b.r <= p.y + p.h + 5) {
    b.dy = -b.dy;
    const hit = (b.x - (p.x + p.w / 2)) / (p.w / 2);
    b.dx = hit * 4;
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
    .brk-info { color:#ccc; font-size:13px; font-family:var(--font-mono); }
    .brk-restart { padding:4px 12px; border-radius:5px; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:11px; cursor:pointer; font-family:var(--font-body); }
    #brk-canvas { border:1px solid rgba(255,255,255,0.06); border-radius:4px; }
    .brk-hint { color:#555; font-size:10px; padding:6px; font-family:var(--font-mono); }
  `;
  document.head.appendChild(s);
}
