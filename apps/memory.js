// Memory Match — Flip cards and find matching pairs

let container;
let cards, flipped, matched, moves, lockBoard;

const EMOJI_POOL = [
  '\uD83D\uDE80', '\u2B50', '\uD83C\uDF1F', '\uD83C\uDF08', '\uD83D\uDD25', '\uD83C\uDF3A', '\uD83E\uDD8B', '\uD83C\uDF0A',
  '\uD83C\uDF19', '\u2600\uFE0F', '\u2764\uFE0F', '\uD83D\uDC8E', '\uD83D\uDC51', '\uD83C\uDFB5', '\u26A1', '\u2744\uFE0F',
  '\uD83D\uDC31', '\uD83D\uDC36', '\uD83D\uDC1F', '\uD83D\uDC26'
];

// Settings state
let gridSize = { cols: 4, rows: 4, pairs: 8 };
let flipSpeed = 800;
let showSettings = false;
let showHelp = false;

const GRID_OPTIONS = [
  { label: '4\u00D74', cols: 4, rows: 4, pairs: 8 },
  { label: '4\u00D75', cols: 4, rows: 5, pairs: 10 },
  { label: '6\u00D74', cols: 6, rows: 4, pairs: 12 }
];

const SPEED_OPTIONS = [
  { label: 'Slow', ms: 1200 },
  { label: 'Normal', ms: 800 },
  { label: 'Fast', ms: 500 }
];

export function init(el) {
  container = el;
  injectStyles();
  startGame();
}

function startGame() {
  showSettings = false;
  showHelp = false;
  const pairs = EMOJI_POOL.slice(0, gridSize.pairs);
  cards = [...pairs, ...pairs].sort(() => Math.random() - 0.5).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
  flipped = [];
  matched = new Set();
  moves = 0;
  lockBoard = false;
  render();
}

function flipCard(idx) {
  if (lockBoard || cards[idx].flipped || cards[idx].matched) return;
  cards[idx].flipped = true;
  flipped.push(idx);

  if (flipped.length === 2) {
    moves++;
    lockBoard = true;
    const [a, b] = flipped;
    if (cards[a].emoji === cards[b].emoji) {
      cards[a].matched = true;
      cards[b].matched = true;
      matched.add(cards[a].emoji);
      flipped = [];
      lockBoard = false;
      render();
    } else {
      render();
      setTimeout(() => {
        cards[a].flipped = false;
        cards[b].flipped = false;
        flipped = [];
        lockBoard = false;
        render();
      }, flipSpeed);
      return;
    }
  }
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

function applyGridSize(option) {
  gridSize = { cols: option.cols, rows: option.rows, pairs: option.pairs };
  startGame();
}

function applyFlipSpeed(ms) {
  flipSpeed = ms;
  render();
}

function render() {
  const totalPairs = gridSize.pairs;
  const won = matched.size === totalPairs;
  container.innerHTML = `
    <div class="mem-app">
      <div class="mem-header">
        <span class="mem-info">Moves: <strong>${moves}</strong> &middot; Pairs: <strong>${matched.size}/${totalPairs}</strong></span>
        <div class="mem-header-actions">
          <button class="mem-icon-btn" id="mem-help-btn" title="How to Play">?</button>
          <button class="mem-icon-btn" id="mem-settings-btn" title="Settings">\u2699</button>
          <button class="mem-restart" id="mem-restart">New Game</button>
        </div>
      </div>
      <div class="mem-board-wrap">
        <div class="mem-board" style="grid-template-columns:repeat(${gridSize.cols},1fr);">
          ${cards.map((c, i) => `
            <div class="mem-card ${c.flipped || c.matched ? 'mem-flipped' : ''} ${c.matched ? 'mem-matched' : ''}" data-idx="${i}">
              <div class="mem-card-inner">
                <div class="mem-card-front">?</div>
                <div class="mem-card-back">${c.emoji}</div>
              </div>
            </div>
          `).join('')}
        </div>
        ${showSettings ? renderSettingsOverlay() : ''}
        ${showHelp ? renderHelpOverlay() : ''}
      </div>
      ${won ? '<div class="mem-status">\uD83C\uDF89 You won in ' + moves + ' moves!</div>' : ''}
      <div class="mem-hint">Click cards to reveal and match pairs</div>
    </div>
  `;

  container.querySelector('#mem-restart').addEventListener('click', startGame);
  container.querySelector('#mem-settings-btn').addEventListener('click', toggleSettings);
  container.querySelector('#mem-help-btn').addEventListener('click', toggleHelp);

  if (showSettings) {
    container.querySelectorAll('.mem-grid-opt').forEach(el => {
      el.addEventListener('click', () => {
        const idx = +el.dataset.idx;
        applyGridSize(GRID_OPTIONS[idx]);
      });
    });
    container.querySelectorAll('.mem-speed-opt').forEach(el => {
      el.addEventListener('click', () => {
        applyFlipSpeed(+el.dataset.ms);
      });
    });
    const closeBtn = container.querySelector('#mem-settings-close');
    if (closeBtn) closeBtn.addEventListener('click', toggleSettings);
  }

  if (showHelp) {
    const closeBtn = container.querySelector('#mem-help-close');
    if (closeBtn) closeBtn.addEventListener('click', toggleHelp);
  }

  container.querySelectorAll('.mem-card').forEach(el => {
    el.addEventListener('click', () => flipCard(+el.dataset.idx));
  });
}

function renderSettingsOverlay() {
  return `
    <div class="mem-overlay">
      <div class="mem-overlay-header">
        <span class="mem-overlay-title">Settings</span>
        <button class="mem-overlay-close" id="mem-settings-close">\u2715</button>
      </div>
      <div class="mem-overlay-body">
        <div class="mem-setting-group">
          <label class="mem-setting-label">Grid Size</label>
          <div class="mem-setting-options">
            ${GRID_OPTIONS.map((opt, i) => `
              <button class="mem-grid-opt mem-opt-btn ${gridSize.pairs === opt.pairs ? 'mem-opt-active' : ''}" data-idx="${i}">
                ${opt.label}<span class="mem-opt-sub">${opt.pairs} pairs</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="mem-setting-group">
          <label class="mem-setting-label">Flip Speed</label>
          <div class="mem-setting-options">
            ${SPEED_OPTIONS.map(opt => `
              <button class="mem-speed-opt mem-opt-btn ${flipSpeed === opt.ms ? 'mem-opt-active' : ''}" data-ms="${opt.ms}">
                ${opt.label}<span class="mem-opt-sub">${opt.ms}ms</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderHelpOverlay() {
  return `
    <div class="mem-overlay">
      <div class="mem-overlay-header">
        <span class="mem-overlay-title">How to Play</span>
        <button class="mem-overlay-close" id="mem-help-close">\u2715</button>
      </div>
      <div class="mem-overlay-body">
        <ul class="mem-help-list">
          <li>Click cards to flip them and reveal the emoji underneath.</li>
          <li>Find all matching pairs to win the game.</li>
          <li>Only two cards can be flipped at once.</li>
          <li>Matched pairs stay face up.</li>
          <li>Try to finish in the fewest moves possible!</li>
        </ul>
      </div>
    </div>
  `;
}

function injectStyles() {
  if (document.getElementById('mem-styles')) return;
  const s = document.createElement('style');
  s.id = 'mem-styles';
  s.textContent = `
    .mem-app { display:flex; flex-direction:column; height:100%; background:#0a0a12; align-items:center; }
    .mem-header { display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 16px; }
    .mem-header-actions { display:flex; align-items:center; gap:6px; }
    .mem-info { color:#ccc; font-size:13px; font-family:var(--font-mono); }
    .mem-icon-btn {
      width:28px; height:28px; border-radius:6px; border:1px solid rgba(0,229,255,0.2);
      background:rgba(0,229,255,0.08); color:#00e5ff; font-size:14px; cursor:pointer;
      display:flex; align-items:center; justify-content:center; font-family:var(--font-body);
      transition: background 0.2s;
    }
    .mem-icon-btn:hover { background:rgba(0,229,255,0.18); }
    .mem-restart { padding:4px 12px; border-radius:5px; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:11px; cursor:pointer; font-family:var(--font-body); }
    .mem-board-wrap { position:relative; width:min(100%,420px); }
    .mem-board { display:grid; gap:8px; padding:12px; }
    .mem-card { aspect-ratio:1; perspective:600px; cursor:pointer; }
    .mem-card-inner { position:relative; width:100%; height:100%; transform-style:preserve-3d; transition:transform 0.4s; }
    .mem-flipped .mem-card-inner { transform:rotateY(180deg); }
    .mem-card-front, .mem-card-back { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; border-radius:8px; backface-visibility:hidden; font-size:24px; }
    .mem-card-front { background:rgba(0,229,255,0.08); border:1px solid rgba(0,229,255,0.15); color:#00e5ff; font-weight:700; }
    .mem-card-back { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); transform:rotateY(180deg); }
    .mem-matched .mem-card-back { background:rgba(39,201,63,0.08); border-color:rgba(39,201,63,0.2); }
    .mem-status { color:#00e5ff; font-size:14px; font-weight:600; padding:8px; }
    .mem-hint { color:#555; font-size:10px; padding:6px; font-family:var(--font-mono); }

    /* Overlay shared */
    .mem-overlay {
      position:absolute; inset:0; z-index:10;
      background:rgba(10,10,18,0.95);
      border-radius:10px;
      display:flex; flex-direction:column;
      border:1px solid rgba(0,229,255,0.12);
    }
    .mem-overlay-header {
      display:flex; justify-content:space-between; align-items:center;
      padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.06);
    }
    .mem-overlay-title { color:#00e5ff; font-size:14px; font-weight:600; font-family:var(--font-mono); }
    .mem-overlay-close {
      width:24px; height:24px; border:none; background:rgba(255,255,255,0.06);
      color:#888; border-radius:5px; cursor:pointer; font-size:12px;
      display:flex; align-items:center; justify-content:center; transition:color 0.2s;
    }
    .mem-overlay-close:hover { color:#ccc; }
    .mem-overlay-body { padding:16px; overflow-y:auto; flex:1; }

    /* Settings */
    .mem-setting-group { margin-bottom:18px; }
    .mem-setting-label { display:block; color:#888; font-size:11px; font-family:var(--font-mono); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px; }
    .mem-setting-options { display:flex; gap:6px; }
    .mem-opt-btn {
      flex:1; padding:8px 6px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);
      background:rgba(255,255,255,0.03); color:#888; font-size:12px; cursor:pointer;
      display:flex; flex-direction:column; align-items:center; gap:2px;
      font-family:var(--font-body); transition: all 0.2s;
    }
    .mem-opt-btn:hover { border-color:rgba(0,229,255,0.25); color:#ccc; }
    .mem-opt-btn.mem-opt-active {
      border-color:rgba(0,229,255,0.5); background:rgba(0,229,255,0.1); color:#00e5ff;
    }
    .mem-opt-sub { font-size:9px; color:#555; font-family:var(--font-mono); }
    .mem-opt-active .mem-opt-sub { color:rgba(0,229,255,0.6); }

    /* Help */
    .mem-help-list {
      list-style:none; padding:0; margin:0;
    }
    .mem-help-list li {
      color:#ccc; font-size:12px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04);
      font-family:var(--font-body); line-height:1.5;
    }
    .mem-help-list li:last-child { border-bottom:none; }
    .mem-help-list li::before {
      content:'\u2022'; color:#00e5ff; margin-right:8px; font-weight:700;
    }
  `;
  document.head.appendChild(s);
}
