// TapasOS Lead Capture — engagement popup after 5 minutes

const API = location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://portfolio-bot-5pwk.onrender.com';

const TRIGGER_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_KEY = 'tapasos-lead-shown';

let appsOpened = [];
let pageLoadTime = Date.now();

export function initLeadCapture() {
  // Only show once per session
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
    message = "I noticed you've been exploring my work for a while — that genuinely "
      + "means a lot. If you'd like to connect, I'd love to hear from you. "
      + "Drop your details below and I'll reach out.";
  }

  const overlay = document.createElement('div');
  overlay.id = 'lead-overlay';
  overlay.innerHTML = `
    <div class="lead-modal">
      <button class="lead-close" id="lead-close">&times;</button>
      <div class="lead-avatar">T</div>
      <div class="lead-message">${esc(message)}</div>
      <form class="lead-form" id="lead-form">
        <input class="lead-input" id="lead-name" type="text" placeholder="Your name" autocomplete="name">
        <input class="lead-input" id="lead-email" type="email" placeholder="Email address" autocomplete="email">
        <input class="lead-input" id="lead-phone" type="tel" placeholder="Phone (optional)" autocomplete="tel">
        <button class="lead-submit" type="submit">Let's Connect</button>
      </form>
      <div class="lead-skip">
        <button class="lead-skip-btn" id="lead-skip">Maybe later</button>
      </div>
      <div class="lead-privacy">Your info is only used to reach out personally. No spam, ever.</div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  // Close handlers
  const close = () => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 300);
  };

  document.getElementById('lead-close').addEventListener('click', close);
  document.getElementById('lead-skip').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Submit
  document.getElementById('lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('lead-name').value.trim();
    const email = document.getElementById('lead-email').value.trim();
    const phone = document.getElementById('lead-phone').value.trim();

    if (!name && !email) {
      document.getElementById('lead-email').focus();
      return;
    }

    const submitBtn = overlay.querySelector('.lead-submit');
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
      const sessionId = window.__tapasos_session_id || '';
      await fetch(`${API}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone,
          message: message,
          session_id: sessionId,
          page_duration_s: Math.round((Date.now() - pageLoadTime) / 1000),
          apps_used: appsOpened,
        }),
      });

      // Success state
      overlay.querySelector('.lead-modal').innerHTML = `
        <div class="lead-avatar">T</div>
        <div class="lead-message">Thank you${name ? ', ' + esc(name) : ''}! I'll reach out soon.</div>
        <button class="lead-submit" onclick="this.closest('#lead-overlay').classList.remove('visible');setTimeout(()=>document.getElementById('lead-overlay')?.remove(),300)">Close</button>
      `;
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
    #lead-overlay {
      position:fixed; inset:0; z-index:20000;
      background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);
      display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity 0.3s ease;
    }
    #lead-overlay.visible { opacity:1; }

    .lead-modal {
      background:linear-gradient(145deg, #161628, #111120);
      border:1px solid rgba(255,255,255,0.08);
      border-radius:20px; padding:36px 32px;
      max-width:400px; width:calc(100% - 32px);
      text-align:center; position:relative;
      transform:translateY(20px) scale(0.95);
      transition:transform 0.35s cubic-bezier(0.4,0,0.2,1);
      box-shadow:0 24px 64px rgba(0,0,0,0.5);
    }
    #lead-overlay.visible .lead-modal { transform:translateY(0) scale(1); }

    .lead-close {
      position:absolute; top:12px; right:14px;
      background:none; border:none; color:rgba(255,255,255,0.3);
      font-size:20px; cursor:pointer; padding:4px 8px;
      transition:color 0.15s;
    }
    .lead-close:hover { color:rgba(255,255,255,0.7); }

    .lead-avatar {
      width:48px; height:48px; border-radius:50%; margin:0 auto 16px;
      background:linear-gradient(135deg, #7c3aed, #00e5ff);
      display:flex; align-items:center; justify-content:center;
      font-family:var(--font-display, 'Outfit', sans-serif);
      font-size:20px; font-weight:700; color:#fff;
    }

    .lead-message {
      font-size:14px; color:rgba(255,255,255,0.75); line-height:1.7;
      margin-bottom:24px; font-family:var(--font-display, 'Outfit', sans-serif);
    }

    .lead-form { display:flex; flex-direction:column; gap:10px; }

    .lead-input {
      width:100%; padding:12px 14px;
      background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
      border-radius:10px; color:#e8e8f0;
      font-family:var(--font-display, 'Outfit', sans-serif); font-size:14px;
      outline:none; transition:border-color 0.2s;
    }
    .lead-input:focus { border-color:rgba(0,229,255,0.5); }
    .lead-input::placeholder { color:rgba(255,255,255,0.25); }

    .lead-submit {
      width:100%; padding:13px; margin-top:4px;
      background:linear-gradient(135deg, #7c3aed, #00e5ff);
      border:none; border-radius:10px; color:#fff;
      font-family:var(--font-display, 'Outfit', sans-serif);
      font-size:15px; font-weight:600; cursor:pointer;
      transition:opacity 0.2s, transform 0.15s;
    }
    .lead-submit:hover { opacity:0.9; }
    .lead-submit:active { transform:scale(0.98); }
    .lead-submit:disabled { opacity:0.6; cursor:not-allowed; }

    .lead-skip { margin-top:12px; }
    .lead-skip-btn {
      background:none; border:none; color:rgba(255,255,255,0.3);
      font-size:12px; cursor:pointer; padding:4px 8px;
      font-family:var(--font-display, 'Outfit', sans-serif);
      transition:color 0.15s;
    }
    .lead-skip-btn:hover { color:rgba(255,255,255,0.6); }

    .lead-privacy {
      margin-top:16px; font-size:11px; color:rgba(255,255,255,0.2);
      font-family:var(--font-mono, monospace);
    }
  `;
  document.head.appendChild(s);
}
