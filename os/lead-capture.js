// TapasOS Lead Capture — engagement prompt after 5 minutes
// Desktop: slides in as a system notification (bottom-right)
// Mobile: compact bottom sheet

const API = location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://portfolio-bot-5pwk.onrender.com';

const TRIGGER_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_KEY = 'tapasos-lead-shown';

const FALLBACK_MESSAGES = [
  "I noticed you've been exploring for a while — that genuinely means a lot. If you'd like to connect, drop your details and I'll reach out.",
  "Thanks for spending time here — it means more than you'd think. I'd love to chat if something caught your eye. Leave your info below.",
  "Hey, you've been around a while and I appreciate the curiosity. If you'd like to talk about anything you've seen, I'm just a message away.",
  "Really glad you're digging into my work. If anything resonated or you have questions, share your details — I'd love to continue the conversation.",
  "Looks like something here piqued your interest. I'd genuinely love to connect — leave your name and email and I'll follow up personally.",
];

let appsOpened = [];
let pageLoadTime = Date.now();

export function initLeadCapture() {
  if (sessionStorage.getItem(SESSION_KEY)) return;
  setTimeout(showLeadCapture, TRIGGER_MS);
}

export function recordAppForLead(appId) {
  if (!appsOpened.includes(appId)) appsOpened.push(appId);
}

async function showLeadCapture() {
  if (sessionStorage.getItem(SESSION_KEY)) return;
  sessionStorage.setItem(SESSION_KEY, '1');

  injectStyles();

  const durationMin = Math.round((Date.now() - pageLoadTime) / 60000);
  const appsStr = appsOpened.join(',');

  // Fetch LLM-generated message
  let message = '';
  try {
    const resp = await fetch(`${API}/lead/prompt?duration_min=${durationMin}&apps=${encodeURIComponent(appsStr)}`);
    const data = await resp.json();
    message = data.message || '';
  } catch { /* use fallback */ }

  if (!message) {
    message = FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
  }

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    showMobileSheet(message);
  } else {
    showDesktopNotification(message);
  }
}

// ── Desktop: System-style notification card (bottom-right) ──
function showDesktopNotification(message) {
  const card = document.createElement('div');
  card.id = 'lead-card';
  card.innerHTML = `
    <div class="lead-card-header">
      <div class="lead-card-avatar">T</div>
      <div class="lead-card-identity">
        <div class="lead-card-name">Tapas Kumar Patra</div>
        <div class="lead-card-tag">System Prompt</div>
      </div>
      <button class="lead-card-close" id="lead-card-close">&times;</button>
    </div>
    <div class="lead-card-body">${esc(message)}</div>
    <form class="lead-card-form" id="lead-form">
      <div class="lead-card-row">
        <input class="lead-card-input" id="lead-name" type="text" placeholder="Name" autocomplete="name">
        <input class="lead-card-input" id="lead-email" type="email" placeholder="Email" autocomplete="email">
      </div>
      <input class="lead-card-input" id="lead-phone" type="tel" placeholder="Phone (optional)" autocomplete="tel">
      <div class="lead-card-actions">
        <button type="button" class="lead-card-skip" id="lead-skip">Maybe later</button>
        <button type="submit" class="lead-card-submit">Let's Connect</button>
      </div>
    </form>
    <div class="lead-card-privacy">Your info is only used to reach out personally. No spam.</div>
  `;

  document.body.appendChild(card);
  requestAnimationFrame(() => card.classList.add('visible'));

  bindCardEvents(card, message);
}

// ── Mobile: Bottom sheet ──
function showMobileSheet(message) {
  const overlay = document.createElement('div');
  overlay.id = 'lead-overlay';
  overlay.innerHTML = `
    <div class="lead-sheet">
      <div class="lead-sheet-handle"></div>
      <div class="lead-card-header">
        <div class="lead-card-avatar">T</div>
        <div class="lead-card-identity">
          <div class="lead-card-name">Tapas Kumar Patra</div>
          <div class="lead-card-tag">wants to connect</div>
        </div>
      </div>
      <div class="lead-card-body">${esc(message)}</div>
      <form class="lead-card-form" id="lead-form">
        <input class="lead-card-input" id="lead-name" type="text" placeholder="Your name" autocomplete="name">
        <input class="lead-card-input" id="lead-email" type="email" placeholder="Email address" autocomplete="email">
        <input class="lead-card-input" id="lead-phone" type="tel" placeholder="Phone (optional)" autocomplete="tel">
        <button type="submit" class="lead-card-submit" style="width:100%;">Let's Connect</button>
      </form>
      <button type="button" class="lead-card-skip" id="lead-skip" style="margin:8px auto;display:block;">Maybe later</button>
      <div class="lead-card-privacy">Your info is only used to reach out personally.</div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  const close = () => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 300);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  bindCardEvents(overlay, message, close);
}

function bindCardEvents(root, message, closeFn) {
  const close = closeFn || (() => {
    root.classList.remove('visible');
    setTimeout(() => root.remove(), 300);
  });

  root.querySelector('#lead-card-close')?.addEventListener('click', close);
  root.querySelector('#lead-skip')?.addEventListener('click', close);

  root.querySelector('#lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = root.querySelector('#lead-name').value.trim();
    const email = root.querySelector('#lead-email').value.trim();
    const phone = root.querySelector('#lead-phone').value.trim();

    if (!name && !email) {
      root.querySelector('#lead-email').focus();
      return;
    }

    const submitBtn = root.querySelector('.lead-card-submit');
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
      const sessionId = window.__tapasos_session_id || '';
      await fetch(`${API}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone,
          message,
          session_id: sessionId,
          page_duration_s: Math.round((Date.now() - pageLoadTime) / 1000),
          apps_used: appsOpened,
        }),
      });

      // Success state
      const body = root.querySelector('.lead-card-body');
      const form = root.querySelector('.lead-card-form');
      const skip = root.querySelector('#lead-skip');
      const privacy = root.querySelector('.lead-card-privacy');

      if (body) body.textContent = `Thank you${name ? ', ' + name : ''}! I'll reach out soon.`;
      if (form) form.remove();
      if (skip) skip.remove();
      if (privacy) privacy.remove();

      setTimeout(close, 3000);
    } catch {
      submitBtn.textContent = "Let's Connect";
      submitBtn.disabled = false;
    }
  });
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function injectStyles() {
  if (document.getElementById('lead-styles')) return;
  const s = document.createElement('style');
  s.id = 'lead-styles';
  s.textContent = `
    /* ── Desktop: Notification Card (bottom-right) ── */
    #lead-card {
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 15000;
      width: 380px;
      background: linear-gradient(145deg, rgba(22,22,40,0.97), rgba(17,17,32,0.97));
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 18px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,229,255,0.05);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transform: translateX(420px);
      opacity: 0;
      transition: transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease;
    }

    #lead-card.visible {
      transform: translateX(0);
      opacity: 1;
    }

    /* ── Card inner elements ── */
    .lead-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .lead-card-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #00e5ff);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }

    .lead-card-identity { flex: 1; min-width: 0; }

    .lead-card-name {
      font-family: var(--font-display);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .lead-card-tag {
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--cyan, #00e5ff);
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .lead-card-close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.3);
      font-size: 18px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
      line-height: 1;
    }

    .lead-card-close:hover {
      color: rgba(255,255,255,0.7);
      background: rgba(255,255,255,0.05);
    }

    .lead-card-body {
      font-size: 12.5px;
      color: rgba(255,255,255,0.65);
      line-height: 1.6;
      margin-bottom: 14px;
      font-family: var(--font-body);
    }

    .lead-card-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .lead-card-row {
      display: flex;
      gap: 8px;
    }

    .lead-card-row .lead-card-input {
      flex: 1;
      min-width: 0;
    }

    .lead-card-input {
      width: 100%;
      padding: 9px 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      color: #e8e8f0;
      font-family: var(--font-body);
      font-size: 12px;
      outline: none;
      transition: border-color 0.2s;
    }

    .lead-card-input:focus {
      border-color: rgba(0,229,255,0.4);
    }

    .lead-card-input::placeholder {
      color: rgba(255,255,255,0.2);
    }

    .lead-card-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 4px;
    }

    .lead-card-skip {
      background: none;
      border: none;
      color: rgba(255,255,255,0.3);
      font-size: 11px;
      cursor: pointer;
      padding: 6px 8px;
      font-family: var(--font-body);
      transition: color 0.15s;
    }

    .lead-card-skip:hover {
      color: rgba(255,255,255,0.6);
    }

    .lead-card-submit {
      padding: 9px 20px;
      background: linear-gradient(135deg, #7c3aed, #00e5ff);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
    }

    .lead-card-submit:hover { opacity: 0.9; }
    .lead-card-submit:active { transform: scale(0.97); }
    .lead-card-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .lead-card-privacy {
      margin-top: 10px;
      font-size: 9px;
      color: rgba(255,255,255,0.15);
      font-family: var(--font-mono);
      text-align: center;
    }

    /* ── Mobile: Bottom Sheet Overlay ── */
    #lead-overlay {
      position: fixed;
      inset: 0;
      z-index: 20000;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    #lead-overlay.visible { opacity: 1; }

    .lead-sheet {
      width: 100%;
      max-width: 500px;
      background: linear-gradient(145deg, #161628, #111120);
      border-top-left-radius: 20px;
      border-top-right-radius: 20px;
      padding: 12px 20px 24px;
      transform: translateY(100%);
      transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
    }

    #lead-overlay.visible .lead-sheet {
      transform: translateY(0);
    }

    .lead-sheet-handle {
      width: 36px;
      height: 4px;
      border-radius: 2px;
      background: rgba(255,255,255,0.15);
      margin: 0 auto 14px;
    }

    /* Mobile tweaks */
    .lead-sheet .lead-card-input {
      padding: 12px 14px;
      font-size: 14px;
    }

    .lead-sheet .lead-card-submit {
      padding: 13px;
      font-size: 15px;
    }
  `;
  document.head.appendChild(s);
}
