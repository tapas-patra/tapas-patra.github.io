// Tapas.ai — AI Assistant Chat App

const API_BASE = window.location.hostname === 'localhost' && window.location.port === '8000'
  ? 'http://localhost:8000'
  : 'https://portfolio-bot-5pwk.onrender.com';

const MAX_HISTORY = 10; // Keep last N messages to avoid 422 payload too large

const STARTER_PROMPTS = [
  "What's your strongest skill?",
  "Tell me about your AI projects",
  "Are you open to new roles?",
  "Generate a resume for a Backend Engineer role",
];

let sessionHistory = [];
let isStreaming = false;

export function init(container) {
  container.innerHTML = `
    <div class="ai-chat-container">
      <div class="ai-messages" id="ai-messages">
        <div class="ai-welcome">
          <div class="ai-welcome-icon">\uD83E\uDD16</div>
          <div class="ai-welcome-title">Tapas.ai</div>
          <div class="ai-welcome-subtitle">Instead of reading about me, just ask me anything.</div>
          <div class="ai-starters" id="ai-starters">
            ${STARTER_PROMPTS.map(p => `<button class="ai-starter-chip">${p}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="ai-input-area">
        <div class="ai-input-wrapper">
          <textarea class="ai-input" id="ai-input" placeholder="Ask me anything..." rows="1"></textarea>
          <button class="ai-send-btn" id="ai-send" title="Send" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <div class="ai-input-hint">Tapas.ai speaks on behalf of Tapas Kumar Patra</div>
      </div>
    </div>
  `;

  injectStyles();
  bindEvents(container);
  prewarmBackend();
}

function bindEvents(container) {
  const input = container.querySelector('#ai-input');
  const sendBtn = container.querySelector('#ai-send');
  const starters = container.querySelector('#ai-starters');

  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim() || isStreaming;
    autoResize(input);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.value.trim() && !isStreaming) sendMessage(input.value.trim());
    }
  });

  sendBtn.addEventListener('click', () => {
    if (input.value.trim() && !isStreaming) sendMessage(input.value.trim());
  });

  starters.addEventListener('click', (e) => {
    const chip = e.target.closest('.ai-starter-chip');
    if (chip) sendMessage(chip.textContent);
  });
}

function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

async function sendMessage(text) {
  const messages = document.getElementById('ai-messages');
  const input = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send');

  // Hide starters
  const starters = document.getElementById('ai-starters');
  if (starters) starters.style.display = 'none';

  // Hide welcome on first message
  const welcome = messages.querySelector('.ai-welcome');
  if (welcome && sessionHistory.length === 0) {
    welcome.style.display = 'none';
  }

  // Add user message
  appendMessage('user', text);
  sessionHistory.push({ role: 'user', content: text });

  // Clear input
  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;
  isStreaming = true;

  // Add typing indicator
  const typingEl = appendTypingIndicator();

  // Stream AI response
  try {
    // Send only recent history, truncate long messages to avoid 422
    const recentHistory = sessionHistory.slice(-MAX_HISTORY).map(m => ({
      role: m.role,
      content: m.content.length > 7500 ? m.content.slice(0, 7500) + '...' : m.content,
    }));
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: recentHistory,
        session_id: getSessionId(),
      }),
    });

    typingEl.remove();

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream')) {
      // SSE streaming
      const aiMsgEl = appendMessage('assistant', '');
      const textEl = aiMsgEl.querySelector('.ai-msg-text');
      let fullText = '';

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const token = parsed.token || parsed.content || '';
              fullText += token;
              textEl.innerHTML = formatMarkdown(fullText);
              scrollToBottom();
            } catch {
              // Plain text token
              fullText += data;
              textEl.innerHTML = formatMarkdown(fullText);
              scrollToBottom();
            }
          }
        }
      }

      sessionHistory.push({ role: 'assistant', content: fullText });
      addActionButtons(aiMsgEl, fullText);
    } else {
      // JSON response (non-streaming fallback)
      const data = await response.json();
      const reply = data.response || data.content || 'Sorry, I could not generate a response.';
      const aiMsgEl = appendMessage('assistant', reply);
      sessionHistory.push({ role: 'assistant', content: reply });
      addActionButtons(aiMsgEl, reply);
    }
  } catch (err) {
    typingEl?.remove();
    appendMessage('system', `Tapas's AI is taking a break. You can reach him directly at <a href="mailto:tapas.patra0406@gmail.com" style="color:var(--cyan)">tapas.patra0406@gmail.com</a>`);
    console.error('Chat error:', err);
  }

  isStreaming = false;
  sendBtn.disabled = !input.value.trim();
}

function appendMessage(role, content) {
  const messages = document.getElementById('ai-messages');
  const msg = document.createElement('div');
  msg.className = `ai-msg ai-msg-${role}`;

  if (role === 'user') {
    msg.innerHTML = `<div class="ai-msg-bubble ai-msg-user-bubble"><div class="ai-msg-text">${escapeHtml(content)}</div></div>`;
  } else if (role === 'assistant') {
    msg.innerHTML = `
      <div class="ai-msg-avatar">\uD83E\uDD16</div>
      <div class="ai-msg-bubble ai-msg-ai-bubble">
        <div class="ai-msg-text">${content ? formatMarkdown(content) : ''}</div>
        <div class="ai-msg-actions"></div>
      </div>
    `;
  } else {
    msg.innerHTML = `<div class="ai-msg-bubble ai-msg-system-bubble"><div class="ai-msg-text">${content}</div></div>`;
  }

  messages.appendChild(msg);
  scrollToBottom();
  return msg;
}

function appendTypingIndicator() {
  const messages = document.getElementById('ai-messages');
  const el = document.createElement('div');
  el.className = 'ai-msg ai-msg-assistant ai-typing';
  el.innerHTML = `
    <div class="ai-msg-avatar">\uD83E\uDD16</div>
    <div class="ai-msg-bubble ai-msg-ai-bubble">
      <div class="ai-typing-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  messages.appendChild(el);
  scrollToBottom();
  return el;
}

function addActionButtons(msgEl, text) {
  const actions = msgEl.querySelector('.ai-msg-actions');
  if (!actions) return;

  const lower = text.toLowerCase();
  const buttons = [];

  if (lower.includes('project') || lower.includes('built') || lower.includes('developed')) {
    buttons.push({ label: 'Open Projects', action: () => openOSApp('projects') });
  }
  if (lower.includes('resume') || lower.includes('cv') || lower.includes('download')) {
    buttons.push({ label: 'Download Resume', action: () => window.open('myresume.pdf', '_blank') });
  }
  if (lower.includes('contact') || lower.includes('reach') || lower.includes('email') || lower.includes('hire')) {
    buttons.push({ label: 'Contact Tapas', action: () => openOSApp('contact') });
  }

  if (buttons.length === 0) return;

  buttons.forEach(btn => {
    const el = document.createElement('button');
    el.className = 'ai-action-btn';
    el.textContent = btn.label;
    el.addEventListener('click', btn.action);
    actions.appendChild(el);
  });
}

function openOSApp(appId) {
  // Import dynamically to avoid circular dependency
  import('../os/desktop.js').then(mod => mod.openApp(appId));
}

function scrollToBottom() {
  const messages = document.getElementById('ai-messages');
  messages.scrollTop = messages.scrollHeight;
}

function getSessionId() {
  let id = sessionStorage.getItem('tapasos-session');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('tapasos-session', id);
  }
  return id;
}

function prewarmBackend() {
  fetch(`${API_BASE}/health`).catch(() => {});
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function injectStyles() {
  if (document.getElementById('ai-assistant-styles')) return;
  const style = document.createElement('style');
  style.id = 'ai-assistant-styles';
  style.textContent = `
    .ai-chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-surface);
    }

    .ai-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ai-welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 10px;
      padding: 32px 16px;
    }

    .ai-welcome-icon { font-size: 40px; }
    .ai-welcome-title {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--cyan), var(--violet-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .ai-welcome-subtitle {
      color: var(--text-muted);
      font-size: 13px;
      text-align: center;
      max-width: 360px;
    }

    .ai-starters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-top: 12px;
      max-width: 480px;
    }

    .ai-starter-chip {
      background: var(--glass);
      border: 1px solid var(--glass-border);
      color: var(--text-primary);
      padding: 7px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-family: var(--font-body);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
    }
    .ai-starter-chip:hover {
      background: var(--glass-hover);
      border-color: var(--cyan);
      color: var(--cyan);
    }

    /* Messages */
    .ai-msg { display: flex; gap: 8px; align-items: flex-start; }
    .ai-msg-user { justify-content: flex-end; }
    .ai-msg-system { justify-content: center; }

    .ai-msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--glass);
      border: 1px solid var(--glass-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }

    .ai-msg-bubble {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.55;
    }

    .ai-msg-user-bubble {
      background: var(--violet);
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .ai-msg-ai-bubble {
      background: var(--glass);
      border: 1px solid var(--glass-border);
      color: var(--text-primary);
      border-bottom-left-radius: 4px;
    }

    .ai-msg-system-bubble {
      background: transparent;
      color: var(--text-muted);
      font-size: 12px;
      text-align: center;
      padding: 8px 16px;
    }

    .ai-msg-text code {
      background: rgba(0, 229, 255, 0.1);
      padding: 1px 5px;
      border-radius: 3px;
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .ai-msg-text pre {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      padding: 10px;
      margin: 8px 0;
      overflow-x: auto;
    }
    .ai-msg-text pre code {
      background: none;
      padding: 0;
    }

    .ai-msg-text strong { color: var(--cyan); }

    /* Action buttons */
    .ai-msg-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .ai-msg-actions:empty { display: none; }

    .ai-action-btn {
      background: transparent;
      border: 1px solid var(--violet);
      color: var(--violet-light);
      padding: 4px 12px;
      border-radius: 14px;
      font-size: 11px;
      font-family: var(--font-body);
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .ai-action-btn:hover {
      background: var(--violet);
      color: #fff;
    }

    /* Typing indicator */
    .ai-typing-dots {
      display: flex;
      gap: 4px;
      padding: 4px 0;
    }
    .ai-typing-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-muted);
      animation: typingDot 1.2s ease-in-out infinite;
    }
    .ai-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .ai-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typingDot {
      0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
      30% { opacity: 1; transform: translateY(-4px); }
    }

    /* Input area */
    .ai-input-area {
      padding: 12px 16px;
      border-top: 1px solid var(--glass-border);
      background: var(--bg-surface);
    }

    .ai-input-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      background: var(--glass);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 8px 12px;
      transition: border-color 0.2s;
    }
    .ai-input-wrapper:focus-within {
      border-color: var(--cyan);
    }

    .ai-input {
      flex: 1;
      background: none;
      border: none;
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 13px;
      line-height: 1.5;
      resize: none;
      outline: none;
      max-height: 120px;
    }
    .ai-input::placeholder { color: var(--text-dim); }

    .ai-send-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--violet);
      border: none;
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: opacity 0.2s, background 0.2s;
    }
    .ai-send-btn:disabled {
      opacity: 0.3;
      cursor: default;
    }
    .ai-send-btn:not(:disabled):hover {
      background: var(--violet-light);
    }

    .ai-input-hint {
      font-size: 10px;
      color: var(--text-dim);
      text-align: center;
      margin-top: 6px;
    }
  `;
  document.head.appendChild(style);
}
