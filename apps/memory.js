// Memory Match — Flip cards and find matching pairs

let container;
let cards, flipped, matched, moves, lockBoard;

const EMOJIS = ['\uD83D\uDE80', '\u2B50', '\uD83C\uDF1F', '\uD83C\uDF08', '\uD83D\uDD25', '\uD83C\uDF3A', '\uD83E\uDD8B', '\uD83C\uDF0A'];

export function init(el) {
  container = el;
  injectStyles();
  startGame();
}

function startGame() {
  const pairs = EMOJIS.slice();
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
      }, 800);
      return;
    }
  }
  render();
}

function render() {
  const won = matched.size === EMOJIS.length;
  container.innerHTML = `
    <div class="mem-app">
      <div class="mem-header">
        <span class="mem-info">Moves: <strong>${moves}</strong> &middot; Pairs: <strong>${matched.size}/${EMOJIS.length}</strong></span>
        <button class="mem-restart" id="mem-restart">New Game</button>
      </div>
      <div class="mem-board">
        ${cards.map((c, i) => `
          <div class="mem-card ${c.flipped || c.matched ? 'mem-flipped' : ''} ${c.matched ? 'mem-matched' : ''}" data-idx="${i}">
            <div class="mem-card-inner">
              <div class="mem-card-front">?</div>
              <div class="mem-card-back">${c.emoji}</div>
            </div>
          </div>
        `).join('')}
      </div>
      ${won ? '<div class="mem-status">\uD83C\uDF89 You won in ' + moves + ' moves!</div>' : ''}
      <div class="mem-hint">Click cards to reveal and match pairs</div>
    </div>
  `;

  container.querySelector('#mem-restart').addEventListener('click', startGame);
  container.querySelectorAll('.mem-card').forEach(el => {
    el.addEventListener('click', () => flipCard(+el.dataset.idx));
  });
}

function injectStyles() {
  if (document.getElementById('mem-styles')) return;
  const s = document.createElement('style');
  s.id = 'mem-styles';
  s.textContent = `
    .mem-app { display:flex; flex-direction:column; height:100%; background:#0a0a12; align-items:center; }
    .mem-header { display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 16px; }
    .mem-info { color:#ccc; font-size:13px; font-family:var(--font-mono); }
    .mem-restart { padding:4px 12px; border-radius:5px; border:1px solid rgba(0,229,255,0.2); background:rgba(0,229,255,0.08); color:#00e5ff; font-size:11px; cursor:pointer; font-family:var(--font-body); }
    .mem-board { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; padding:12px; width:min(100%,360px); }
    .mem-card { aspect-ratio:1; perspective:600px; cursor:pointer; }
    .mem-card-inner { position:relative; width:100%; height:100%; transform-style:preserve-3d; transition:transform 0.4s; }
    .mem-flipped .mem-card-inner { transform:rotateY(180deg); }
    .mem-card-front, .mem-card-back { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; border-radius:8px; backface-visibility:hidden; font-size:24px; }
    .mem-card-front { background:rgba(0,229,255,0.08); border:1px solid rgba(0,229,255,0.15); color:#00e5ff; font-weight:700; }
    .mem-card-back { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); transform:rotateY(180deg); }
    .mem-matched .mem-card-back { background:rgba(39,201,63,0.08); border-color:rgba(39,201,63,0.2); }
    .mem-status { color:#00e5ff; font-size:14px; font-weight:600; padding:8px; }
    .mem-hint { color:#555; font-size:10px; padding:6px; font-family:var(--font-mono); }
  `;
  document.head.appendChild(s);
}
