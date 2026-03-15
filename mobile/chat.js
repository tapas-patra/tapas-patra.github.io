// Mobile Chat — fallback layout when voice is unavailable

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://portfolio-bot-5pwk.onrender.com';

const STARTERS = [
  "What's your strongest skill?",
  "Tell me about your AI projects",
  "Are you open to new roles?",
];

let sessionHistory = [];
let isStreaming = false;

export function initChat(container) {
  injectStyles();

  container.innerHTML = `
    <div class="mchat-container">
      <div class="mchat-messages" id="mchat-messages">
        <div class="mchat-welcome">
          <div style="font-size:32px;">🤖</div>
          <div class="mchat-welcome-title">Tapas.ai</div>
          <div class="mchat-welcome-sub">Ask me anything about Tapas</div>
          <div class="mchat-starters" id="mchat-starters">
            ${STARTERS.map(s => `<button class="mchat-starter">${s}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="mchat-input-area">
        <div class="mchat-input-wrap">
          <input class="mchat-input" id="mchat-input" type="text" placeholder="Type a message..." autocomplete="off">
          <button class="mchat-send" id="mchat-send" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  const input = container.querySelector('#mchat-input');
  const send = container.querySelector('#mchat-send');
  const starters = container.querySelector('#mchat-starters');

  input.addEventListener('input', () => { send.disabled = !input.value.trim() || isStreaming; });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim() && !isStreaming) sendMessage(input.value.trim());
  });

  send.addEventListener('click', () => {
    if (input.value.trim() && !isStreaming) sendMessage(input.value.trim());
  });

  starters.addEventListener('click', (e) => {
    const chip = e.target.closest('.mchat-starter');
    if (chip) sendMessage(chip.textContent);
  });
}

async function sendMessage(text) {
  const messages = document.getElementById('mchat-messages');
  const input = document.getElementById('mchat-input');
  const send = document.getElementById('mchat-send');
  const starters = document.getElementById('mchat-starters');

  if (starters) starters.style.display = 'none';
  const welcome = messages.querySelector('.mchat-welcome');
  if (welcome && sessionHistory.length === 0) welcome.style.display = 'none';

  addMsg(messages, 'user', text);
  sessionHistory.push({ role: 'user', content: text });

  input.value = '';
  send.disabled = true;
  isStreaming = true;

  const typing = addMsg(messages, 'typing', '');

  try {
    const resp = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: sessionHistory, session_id: getSessionId() }),
    });

    typing.remove();
    if (!resp.ok) throw new Error('Error');

    let fullText = '';
    const ct = resp.headers.get('content-type') || '';

    if (ct.includes('text/event-stream')) {
      const aiEl = addMsg(messages, 'ai', '');
      const textEl = aiEl.querySelector('.mchat-text');
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6);
            if (d === '[DONE]') continue;
            try { fullText += JSON.parse(d).token || ''; } catch { fullText += d; }
            textEl.textContent = stripMarkdown(fullText);
            messages.scrollTop = messages.scrollHeight;
          }
        }
      }
    } else {
      const data = await resp.json();
      fullText = data.response || data.content || '';
      addMsg(messages, 'ai', stripMarkdown(fullText));
    }

    sessionHistory.push({ role: 'assistant', content: fullText });
  } catch {
    typing?.remove();
    addMsg(messages, 'system', 'Could not connect. Try again later.');
  }

  isStreaming = false;
  send.disabled = !input.value.trim();
}

function addMsg(container, type, text) {
  const el = document.createElement('div');
  el.className = `mchat-msg mchat-${type}`;

  if (type === 'user') el.innerHTML = `<div class="mchat-bubble mchat-user-bubble"><span class="mchat-text">${esc(text)}</span></div>`;
  else if (type === 'ai') el.innerHTML = `<div class="mchat-bubble mchat-ai-bubble"><span class="mchat-text">${text}</span></div>`;
  else if (type === 'typing') el.innerHTML = `<div class="mchat-bubble mchat-ai-bubble"><span class="mchat-dots"><span></span><span></span><span></span></span></div>`;
  else el.innerHTML = `<div class="mchat-system">${text}</div>`;

  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
}

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/[-*_]{3,}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function getSessionId() {
  let id = sessionStorage.getItem('tapasos-session');
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('tapasos-session', id); }
  return id;
}

function injectStyles() {
  if (document.getElementById('mchat-styles')) return;
  const s = document.createElement('style');
  s.id = 'mchat-styles';
  s.textContent = `
    .mchat-container { display:flex; flex-direction:column; height:100%; background:var(--bg-deep); }
    .mchat-messages { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; }
    .mchat-welcome { display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; gap:8px; text-align:center; }
    .mchat-welcome-title { font-family:var(--font-display); font-size:20px; font-weight:800; background:linear-gradient(135deg,var(--cyan),var(--violet-light)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .mchat-welcome-sub { color:var(--text-muted); font-size:13px; }
    .mchat-starters { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-top:12px; }
    .mchat-starter { background:var(--glass); border:1px solid var(--glass-border); color:var(--text-primary); padding:8px 14px; border-radius:18px; font-size:12px; font-family:var(--font-body); cursor:pointer; }

    .mchat-msg { display:flex; }
    .mchat-user { justify-content:flex-end; }
    .mchat-bubble { max-width:85%; padding:10px 14px; border-radius:14px; font-size:14px; line-height:1.5; }
    .mchat-user-bubble { background:var(--violet); color:#fff; border-bottom-right-radius:4px; }
    .mchat-ai-bubble { background:var(--glass); border:1px solid var(--glass-border); color:var(--text-primary); border-bottom-left-radius:4px; }
    .mchat-system { text-align:center; font-size:12px; color:var(--text-dim); }

    .mchat-dots { display:flex; gap:4px; padding:4px 0; }
    .mchat-dots span { width:6px; height:6px; border-radius:50%; background:var(--text-muted); animation:mdot 1.2s ease-in-out infinite; }
    .mchat-dots span:nth-child(2) { animation-delay:0.2s; }
    .mchat-dots span:nth-child(3) { animation-delay:0.4s; }
    @keyframes mdot { 0%,60%,100% { opacity:0.3; } 30% { opacity:1; } }

    .mchat-input-area { padding:10px 12px; border-top:1px solid var(--glass-border); background:var(--bg-surface); }
    .mchat-input-wrap { display:flex; gap:8px; background:var(--glass); border:1px solid var(--glass-border); border-radius:24px; padding:6px 12px; }
    .mchat-input-wrap:focus-within { border-color:var(--cyan); }
    .mchat-input { flex:1; background:none; border:none; color:var(--text-primary); font-size:14px; font-family:var(--font-body); outline:none; }
    .mchat-input::placeholder { color:var(--text-dim); }
    .mchat-send { width:36px; height:36px; border-radius:50%; background:var(--violet); border:none; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .mchat-send:disabled { opacity:0.3; }
  `;
  document.head.appendChild(s);
}
