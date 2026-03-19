// TapasCode — AI terminal for controlling TapasOS via MCP
// Connect your API key, choose a provider and model, and control the OS with natural language

import { isOnline, onConnectivityChange } from '../os/control-center.js';

const MCP_URL_REMOTE = 'https://tapasos-mcp.onrender.com';
const MCP_URL_LOCAL = 'http://localhost:8000';
const LS_PROVIDER = 'tapascode-provider';
const LS_MODEL = 'tapascode-model';
const SS_KEY = 'tapascode-api-key';

let container = null;
let chatHistory = [];
let mpcUrl = MCP_URL_REMOTE;
let isProcessing = false;
let providerModels = {};

export function init(el) {
  container = el;
  render();
  detectServer();
}

async function detectServer() {
  // Try remote first, fallback to local
  try {
    const r = await fetch(`${MCP_URL_REMOTE}/health`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) { mpcUrl = MCP_URL_REMOTE; updateStatus(true); fetchModels(); return; }
  } catch { /* ignore */ }
  try {
    const r = await fetch(`${MCP_URL_LOCAL}/health`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) { mpcUrl = MCP_URL_LOCAL; updateStatus(true); fetchModels(); return; }
  } catch { /* ignore */ }
  updateStatus(false);
}

async function fetchModels() {
  try {
    const r = await fetch(`${mpcUrl}/models`);
    if (r.ok) {
      providerModels = await r.json();
      updateModelDropdown();
    }
  } catch { /* ignore — use empty */ }
}

function updateStatus(connected) {
  if (!container) return;
  const dot = container.querySelector('.tc-status-dot');
  const label = container.querySelector('.tc-status-label');
  if (dot) dot.className = `tc-status-dot ${connected ? 'on' : 'off'}`;
  if (label) label.textContent = connected ? 'MCP Connected' : 'MCP Disconnected';
}

function updateModelDropdown() {
  const providerSelect = container?.querySelector('.tc-provider');
  const modelSelect = container?.querySelector('.tc-model');
  if (!providerSelect || !modelSelect) return;

  const provider = providerSelect.value;
  const models = providerModels[provider] || [];
  const savedModel = localStorage.getItem(LS_MODEL) || '';

  modelSelect.innerHTML = models.map(m =>
    `<option value="${escHtml(m.id)}" ${m.id === savedModel ? 'selected' : ''}>${escHtml(m.label)}</option>`
  ).join('');

  // If saved model isn't in this provider's list, select first
  if (models.length && !models.find(m => m.id === savedModel)) {
    modelSelect.value = models[0].id;
  }
}

function getSavedProvider() {
  return localStorage.getItem(LS_PROVIDER) || 'anthropic';
}

function getSavedKey() {
  return sessionStorage.getItem(SS_KEY) || '';
}

function render() {
  const provider = getSavedProvider();
  const apiKey = getSavedKey();

  container.innerHTML = `
    <div class="tc-app">
      <div class="tc-toolbar">
        <div class="tc-toolbar-left">
          <span class="tc-logo">&gt;_ TapasCode</span>
          <span class="tc-status-dot off"></span>
          <span class="tc-status-label">Checking...</span>
        </div>
        <div class="tc-toolbar-right">
          <select class="tc-provider" title="AI Provider">
            <option value="anthropic" ${provider === 'anthropic' ? 'selected' : ''}>Claude</option>
            <option value="openai" ${provider === 'openai' ? 'selected' : ''}>GPT</option>
            <option value="gemini" ${provider === 'gemini' ? 'selected' : ''}>Gemini</option>
            <option value="mistral" ${provider === 'mistral' ? 'selected' : ''}>Mistral</option>
          </select>
          <select class="tc-model" title="Model"></select>
          <input type="password" class="tc-api-key" placeholder="API Key" value="${escHtml(apiKey)}" spellcheck="false">
          <button class="tc-clear-btn" title="Clear chat">Clear</button>
        </div>
      </div>
      <div class="tc-output" id="tc-output">
        <div class="tc-welcome">
          <div class="tc-welcome-logo">&gt;_</div>
          <div class="tc-welcome-title">TapasCode</div>
          <div class="tc-welcome-sub">AI-powered terminal for TapasOS</div>
          <div class="tc-welcome-hint">Tell me what to do — "open terminal", "set brightness to 70", "what apps are open?"</div>
        </div>
      </div>
      <div class="tc-input-wrap">
        <span class="tc-prompt">&gt;</span>
        <input type="text" class="tc-input" placeholder="Ask me anything..." spellcheck="false" autofocus>
        <button class="tc-send-btn" title="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
        </button>
      </div>
    </div>
  `;

  // Styles
  injectStyles();

  // Populate model dropdown
  updateModelDropdown();

  // Events
  const input = container.querySelector('.tc-input');
  const sendBtn = container.querySelector('.tc-send-btn');
  const clearBtn = container.querySelector('.tc-clear-btn');
  const providerSelect = container.querySelector('.tc-provider');
  const modelSelect = container.querySelector('.tc-model');
  const apiKeyInput = container.querySelector('.tc-api-key');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
  clearBtn.addEventListener('click', () => {
    chatHistory = [];
    const output = container.querySelector('#tc-output');
    output.innerHTML = container.querySelector('.tc-welcome')?.outerHTML || '';
    render();
  });

  providerSelect.addEventListener('change', () => {
    localStorage.setItem(LS_PROVIDER, providerSelect.value);
    updateModelDropdown();
  });

  modelSelect.addEventListener('change', () => {
    localStorage.setItem(LS_MODEL, modelSelect.value);
  });

  apiKeyInput.addEventListener('change', () => {
    sessionStorage.setItem(SS_KEY, apiKeyInput.value);
  });
}

async function sendMessage() {
  if (isProcessing) return;
  const input = container.querySelector('.tc-input');
  const message = input.value.trim();
  if (!message) return;

  const apiKey = container.querySelector('.tc-api-key')?.value?.trim();
  const provider = container.querySelector('.tc-provider')?.value;
  const model = container.querySelector('.tc-model')?.value || '';

  if (!isOnline()) {
    appendMessage('system', 'Wi-Fi is disabled. Enable it from Control Center to use TapasCode.');
    return;
  }

  if (!apiKey) {
    appendMessage('system', 'Please enter your API key first.');
    return;
  }

  input.value = '';
  appendMessage('user', message);

  // Remove welcome if present
  const welcome = container.querySelector('.tc-welcome');
  if (welcome) welcome.remove();

  isProcessing = true;
  const thinkingId = appendThinking();

  try {
    const res = await fetch(`${mpcUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        provider,
        model,
        api_key: apiKey,
        history: chatHistory.slice(-20),
      }),
    });

    removeThinking(thinkingId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }));
      appendMessage('error', err.error || `HTTP ${res.status}`);
      isProcessing = false;
      return;
    }

    const data = await res.json();

    // Show tool executions
    if (data.actions && data.actions.length > 0) {
      for (const action of data.actions) {
        appendToolExecution(action);
      }
    }

    // Show AI response
    if (data.response) {
      appendMessage('assistant', data.response);
      chatHistory.push({ role: 'user', content: message });
      chatHistory.push({ role: 'assistant', content: data.response });
    }
  } catch (err) {
    removeThinking(thinkingId);
    appendMessage('error', `Connection failed: ${err.message}. Is the MCP server running?`);
  }

  isProcessing = false;
  input.focus();
}

function appendMessage(role, content) {
  const output = container.querySelector('#tc-output');
  const div = document.createElement('div');
  div.className = `tc-msg tc-msg-${role}`;

  if (role === 'user') {
    div.innerHTML = `<span class="tc-msg-prefix">&gt;</span> <span class="tc-msg-text">${escHtml(content)}</span>`;
  } else if (role === 'assistant') {
    div.innerHTML = `<span class="tc-msg-text">${formatResponse(content)}</span>`;
  } else if (role === 'error') {
    div.innerHTML = `<span class="tc-msg-error">${escHtml(content)}</span>`;
  } else {
    div.innerHTML = `<span class="tc-msg-system">${escHtml(content)}</span>`;
  }

  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
}

function appendToolExecution(action) {
  const output = container.querySelector('#tc-output');
  const div = document.createElement('div');
  div.className = 'tc-tool-exec';

  const icon = action.success !== false ? '\u2713' : '\u2717';
  const cls = action.success !== false ? 'success' : 'fail';
  const params = action.params ? Object.entries(action.params).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ') : '';

  div.innerHTML = `
    <span class="tc-tool-icon ${cls}">${icon}</span>
    <span class="tc-tool-name">${escHtml(action.tool || action.name || 'unknown')}</span>
    <span class="tc-tool-params">${escHtml(params)}</span>
    ${action.result ? `<span class="tc-tool-result">${escHtml(typeof action.result === 'string' ? action.result : JSON.stringify(action.result))}</span>` : ''}
  `;

  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
}

let thinkingCounter = 0;
function appendThinking() {
  const id = `tc-thinking-${++thinkingCounter}`;
  const output = container.querySelector('#tc-output');
  const div = document.createElement('div');
  div.className = 'tc-thinking';
  div.id = id;
  div.innerHTML = `<span class="tc-thinking-dots"><span>.</span><span>.</span><span>.</span></span> Thinking`;
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
  return id;
}

function removeThinking(id) {
  const el = container.querySelector(`#${id}`);
  if (el) el.remove();
}

function formatResponse(text) {
  return escHtml(text)
    .replace(/`([^`]+)`/g, '<code class="tc-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function injectStyles() {
  if (document.getElementById('tapascode-styles')) return;
  const style = document.createElement('style');
  style.id = 'tapascode-styles';
  style.textContent = `
    .tc-app {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #0a0a0f;
      font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
      font-size: 13px;
      color: #e0e0e0;
    }

    .tc-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      gap: 8px;
      flex-shrink: 0;
    }

    .tc-toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tc-toolbar-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tc-logo {
      font-weight: 700;
      font-size: 13px;
      color: #00e5ff;
      letter-spacing: 0.5px;
    }

    .tc-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #555;
      flex-shrink: 0;
    }
    .tc-status-dot.on { background: #4caf50; box-shadow: 0 0 6px #4caf50; }
    .tc-status-dot.off { background: #666; }

    .tc-status-label {
      font-size: 11px;
      color: #888;
    }

    .tc-provider, .tc-model {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: #ccc;
      font-size: 11px;
      padding: 4px 6px;
      border-radius: 4px;
      font-family: inherit;
      cursor: pointer;
    }

    .tc-model {
      max-width: 140px;
    }

    .tc-api-key {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      color: #aaa;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      width: 120px;
      font-family: inherit;
    }
    .tc-api-key::placeholder { color: #555; }

    .tc-clear-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      color: #888;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
    }
    .tc-clear-btn:hover { background: rgba(255,255,255,0.1); color: #ccc; }

    .tc-output {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.1) transparent;
    }

    .tc-welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 8px;
      text-align: center;
    }
    .tc-welcome-logo {
      font-size: 36px;
      font-weight: 800;
      color: #00e5ff;
      opacity: 0.3;
    }
    .tc-welcome-title {
      font-size: 18px;
      font-weight: 700;
      color: #ccc;
    }
    .tc-welcome-sub {
      font-size: 12px;
      color: #666;
    }
    .tc-welcome-hint {
      font-size: 11px;
      color: #555;
      max-width: 400px;
      line-height: 1.6;
      margin-top: 8px;
    }

    .tc-msg {
      margin-bottom: 12px;
      line-height: 1.6;
    }

    .tc-msg-user {
      color: #00e5ff;
    }
    .tc-msg-prefix {
      color: #00e5ff;
      font-weight: 700;
    }

    .tc-msg-assistant .tc-msg-text {
      color: #e0e0e0;
    }

    .tc-msg-error .tc-msg-error {
      color: #ff5252;
      font-size: 12px;
    }

    .tc-msg-system .tc-msg-system {
      color: #ffa726;
      font-size: 12px;
    }

    .tc-code {
      background: rgba(0,229,255,0.08);
      padding: 1px 5px;
      border-radius: 3px;
      color: #00e5ff;
      font-size: 12px;
    }

    .tc-tool-exec {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 6px 10px;
      margin: 4px 0;
      background: rgba(255,255,255,0.02);
      border-left: 2px solid rgba(0,229,255,0.2);
      border-radius: 0 4px 4px 0;
      font-size: 12px;
    }

    .tc-tool-icon {
      font-weight: 700;
      flex-shrink: 0;
    }
    .tc-tool-icon.success { color: #4caf50; }
    .tc-tool-icon.fail { color: #ff5252; }

    .tc-tool-name {
      color: #bb86fc;
      font-weight: 600;
    }

    .tc-tool-params {
      color: #666;
      font-size: 11px;
    }

    .tc-tool-result {
      color: #555;
      font-size: 11px;
      margin-left: auto;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tc-thinking {
      color: #666;
      font-size: 12px;
      margin: 8px 0;
    }
    .tc-thinking-dots span {
      animation: tcDot 1.4s infinite;
      opacity: 0;
    }
    .tc-thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
    .tc-thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes tcDot {
      0%, 60%, 100% { opacity: 0; }
      30% { opacity: 1; }
    }

    .tc-input-wrap {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      background: rgba(255,255,255,0.03);
      border-top: 1px solid rgba(255,255,255,0.06);
      gap: 8px;
      flex-shrink: 0;
    }

    .tc-prompt {
      color: #00e5ff;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }

    .tc-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 13px;
      outline: none;
    }
    .tc-input::placeholder { color: #444; }

    .tc-send-btn {
      background: rgba(0,229,255,0.1);
      border: 1px solid rgba(0,229,255,0.2);
      color: #00e5ff;
      padding: 5px 8px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .tc-send-btn:hover { background: rgba(0,229,255,0.2); }
  `;
  document.head.appendChild(style);
}
