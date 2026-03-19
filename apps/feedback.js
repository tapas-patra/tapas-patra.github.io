// Feedback — Report bugs or request features for TapasOS

import { isOnline } from '../os/control-center.js';

const API_BASE = window.location.hostname === 'localhost' && window.location.port === '8000'
  ? 'http://localhost:8000'
  : 'https://portfolio-bot-5pwk.onrender.com';

let container;
let currentType = 'bug';
let submissions = [];

export function init(el) {
  container = el;
  injectStyles();
  renderForm();
}

function renderForm() {
  container.innerHTML = `
    <div class="fb-app">
      <div class="fb-sidebar">
        <div class="fb-sidebar-header">Feedback</div>
        <button class="fb-nav-item active" data-view="submit">
          <span class="fb-nav-icon">+</span> New
        </button>
        <button class="fb-nav-item" data-view="history">
          <span class="fb-nav-icon">#</span> My Submissions
        </button>
        <div class="fb-sidebar-footer">
          Help us improve TapasOS
        </div>
      </div>
      <div class="fb-content" id="fb-content">
        ${renderSubmitView()}
      </div>
    </div>
  `;
  bindEvents();
}

function renderSubmitView() {
  return `
    <div class="fb-submit-view">
      <div class="fb-form-title">Report a Bug or Request a Feature</div>
      <div class="fb-type-toggle">
        <button class="fb-type-btn ${currentType === 'bug' ? 'active' : ''}" data-type="bug">
          <span class="fb-type-icon">!</span> Bug Report
        </button>
        <button class="fb-type-btn ${currentType === 'feature' ? 'active' : ''}" data-type="feature">
          <span class="fb-type-icon">*</span> Feature Request
        </button>
      </div>
      <div class="fb-form">
        <label class="fb-label">
          Title <span class="fb-required">*</span>
          <input type="text" class="fb-input" id="fb-title"
            placeholder="${currentType === 'bug' ? 'Brief description of the bug...' : 'What feature would you like?'}"
            maxlength="200" autofocus>
        </label>
        <label class="fb-label">
          Description
          <textarea class="fb-textarea" id="fb-desc" rows="5"
            placeholder="${currentType === 'bug'
              ? 'Steps to reproduce:\n1. Open...\n2. Click...\n3. See error...\n\nExpected behavior:\nActual behavior:'
              : 'Describe the feature in detail. Why would it be useful?'}"
            maxlength="2000"></textarea>
        </label>
        <label class="fb-label">
          Email <span class="fb-optional">(optional — to get notified)</span>
          <input type="email" class="fb-input" id="fb-email" placeholder="your@email.com" maxlength="200">
        </label>
        <button class="fb-submit-btn" id="fb-submit" disabled>Submit</button>
        <div class="fb-status" id="fb-status"></div>
      </div>
    </div>
  `;
}

function renderHistoryView() {
  if (submissions.length === 0) {
    return `
      <div class="fb-history-view">
        <div class="fb-form-title">My Submissions</div>
        <div class="fb-empty">
          <div class="fb-empty-icon">~</div>
          <div class="fb-empty-text">No submissions yet</div>
          <div class="fb-empty-hint">Bug reports and feature requests you submit will appear here.</div>
        </div>
      </div>
    `;
  }
  return `
    <div class="fb-history-view">
      <div class="fb-form-title">My Submissions <span class="fb-count">${submissions.length}</span></div>
      <div class="fb-history-list">
        ${submissions.map(s => `
          <div class="fb-history-item">
            <div class="fb-history-header">
              <span class="fb-tag fb-tag-${s.type}">${s.type === 'bug' ? '! Bug' : '* Feature'}</span>
              <span class="fb-history-time">${formatTime(s.time)}</span>
            </div>
            <div class="fb-history-title">${escHtml(s.title)}</div>
            ${s.description ? `<div class="fb-history-desc">${escHtml(s.description)}</div>` : ''}
            ${s.issueUrl ? `<a href="${escHtml(s.issueUrl)}" target="_blank" rel="noopener" class="fb-issue-link">View on GitHub →</a>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function bindEvents() {
  // Sidebar navigation
  container.querySelectorAll('.fb-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.fb-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const content = container.querySelector('#fb-content');
      if (btn.dataset.view === 'submit') {
        content.innerHTML = renderSubmitView();
        bindFormEvents();
      } else {
        content.innerHTML = renderHistoryView();
      }
    });
  });

  bindFormEvents();
}

function bindFormEvents() {
  // Type toggle
  container.querySelectorAll('.fb-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentType = btn.dataset.type;
      const content = container.querySelector('#fb-content');
      content.innerHTML = renderSubmitView();
      bindFormEvents();
    });
  });

  // Enable submit when title has content
  const titleInput = container.querySelector('#fb-title');
  const submitBtn = container.querySelector('#fb-submit');
  if (titleInput && submitBtn) {
    titleInput.addEventListener('input', () => {
      submitBtn.disabled = titleInput.value.trim().length < 3;
    });
    submitBtn.addEventListener('click', handleSubmit);
  }
}

async function handleSubmit() {
  const title = container.querySelector('#fb-title')?.value?.trim();
  const desc = container.querySelector('#fb-desc')?.value?.trim();
  const email = container.querySelector('#fb-email')?.value?.trim();
  const status = container.querySelector('#fb-status');
  const submitBtn = container.querySelector('#fb-submit');

  if (!title || title.length < 3) return;

  if (!isOnline()) {
    status.textContent = 'Wi-Fi is disabled. Enable it to submit feedback.';
    status.className = 'fb-status error';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  status.textContent = '';
  status.className = 'fb-status';

  try {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: currentType,
        title,
        description: desc || '',
        email: email || '',
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.status === 'saved') {
      submissions.unshift({ type: currentType, title, description: desc, time: Date.now(), issueUrl: data.issue_url });
      status.className = 'fb-status success';
      if (data.issue_url) {
        status.innerHTML = `Thanks! Your feedback has been submitted. <a href="${escHtml(data.issue_url)}" target="_blank" rel="noopener" class="fb-issue-link">Track it on GitHub →</a>`;
      } else {
        status.textContent = 'Thanks! Your feedback has been submitted.';
      }

      // Clear form
      const titleEl = container.querySelector('#fb-title');
      const descEl = container.querySelector('#fb-desc');
      const emailEl = container.querySelector('#fb-email');
      if (titleEl) titleEl.value = '';
      if (descEl) descEl.value = '';
      if (emailEl) emailEl.value = '';

      // Show notification
      window.__tapasos_notify?.('Feedback Submitted', `Your ${currentType} report has been saved.`, { duration: 4000 });
    } else {
      throw new Error(data.detail || 'Unknown error');
    }
  } catch (err) {
    status.textContent = `Failed to submit: ${err.message}`;
    status.className = 'fb-status error';
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit';
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function injectStyles() {
  if (document.getElementById('fb-styles')) return;
  const s = document.createElement('style');
  s.id = 'fb-styles';
  s.textContent = `
    .fb-app {
      display: flex; height: 100%; background: #0a0a12;
      font-family: var(--font-body); color: #e0e0e0;
    }

    /* Sidebar */
    .fb-sidebar {
      width: 180px; flex-shrink: 0;
      background: rgba(255,255,255,0.02);
      border-right: 1px solid rgba(255,255,255,0.06);
      display: flex; flex-direction: column;
      padding: 12px 0;
    }
    .fb-sidebar-header {
      padding: 0 14px 12px;
      font-size: 13px; font-weight: 700; color: #ccc;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      margin-bottom: 8px;
    }
    .fb-nav-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; border: none; background: none;
      color: #888; font-size: 12px; cursor: pointer;
      text-align: left; font-family: inherit; width: 100%;
      transition: background 0.15s, color 0.15s;
    }
    .fb-nav-item:hover { background: rgba(255,255,255,0.04); color: #ccc; }
    .fb-nav-item.active { background: rgba(0,229,255,0.06); color: #00e5ff; }
    .fb-nav-icon {
      width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;
      border-radius: 4px; background: rgba(255,255,255,0.05);
      font-size: 12px; font-weight: 700; font-family: var(--font-mono);
    }
    .fb-nav-item.active .fb-nav-icon { background: rgba(0,229,255,0.1); }
    .fb-sidebar-footer {
      margin-top: auto; padding: 12px 14px;
      font-size: 10px; color: #444; line-height: 1.5;
    }

    /* Content */
    .fb-content {
      flex: 1; overflow-y: auto; padding: 20px 24px;
    }
    .fb-form-title {
      font-size: 16px; font-weight: 700; color: #e0e0e0;
      margin-bottom: 16px;
    }
    .fb-count {
      font-size: 11px; background: rgba(0,229,255,0.1);
      color: #00e5ff; padding: 2px 8px; border-radius: 10px;
      font-weight: 600; vertical-align: middle;
    }

    /* Type toggle */
    .fb-type-toggle {
      display: flex; gap: 8px; margin-bottom: 20px;
    }
    .fb-type-btn {
      flex: 1; padding: 10px 16px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px; background: rgba(255,255,255,0.03);
      color: #888; font-size: 12px; font-weight: 600;
      cursor: pointer; font-family: inherit;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: all 0.2s;
    }
    .fb-type-btn:hover { background: rgba(255,255,255,0.06); color: #ccc; }
    .fb-type-btn.active[data-type="bug"] {
      border-color: rgba(255,82,82,0.3); background: rgba(255,82,82,0.08); color: #ff5252;
    }
    .fb-type-btn.active[data-type="feature"] {
      border-color: rgba(0,229,255,0.3); background: rgba(0,229,255,0.08); color: #00e5ff;
    }
    .fb-type-icon {
      width: 20px; height: 20px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; font-family: var(--font-mono);
      background: rgba(255,255,255,0.06);
    }
    .fb-type-btn.active[data-type="bug"] .fb-type-icon { background: rgba(255,82,82,0.15); }
    .fb-type-btn.active[data-type="feature"] .fb-type-icon { background: rgba(0,229,255,0.15); }

    /* Form */
    .fb-form { display: flex; flex-direction: column; gap: 14px; max-width: 500px; }
    .fb-label {
      display: flex; flex-direction: column; gap: 5px;
      font-size: 11px; color: #888; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .fb-required { color: #ff5252; }
    .fb-optional { color: #555; font-weight: 400; text-transform: none; letter-spacing: 0; }
    .fb-input, .fb-textarea {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px; padding: 10px 12px;
      color: #e0e0e0; font-size: 13px;
      font-family: var(--font-body); outline: none;
      transition: border-color 0.2s;
    }
    .fb-input:focus, .fb-textarea:focus { border-color: rgba(0,229,255,0.4); }
    .fb-input::placeholder, .fb-textarea::placeholder { color: #444; }
    .fb-textarea { resize: vertical; min-height: 80px; line-height: 1.5; }

    .fb-submit-btn {
      padding: 10px 20px; border: none; border-radius: 8px;
      background: #00e5ff; color: #0a0a12;
      font-size: 13px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: opacity 0.2s;
      align-self: flex-start;
    }
    .fb-submit-btn:disabled { opacity: 0.3; cursor: default; }
    .fb-submit-btn:not(:disabled):hover { opacity: 0.9; }

    .fb-status { font-size: 12px; font-family: var(--font-mono); min-height: 18px; }
    .fb-status.success { color: #4caf50; }
    .fb-status.error { color: #ff5252; }
    .fb-issue-link {
      color: #00e5ff; text-decoration: none; font-weight: 600;
      margin-left: 4px; font-family: var(--font-mono); font-size: 11px;
    }
    .fb-issue-link:hover { text-decoration: underline; }
    .fb-history-item .fb-issue-link { display: inline-block; margin-top: 6px; margin-left: 0; }

    /* History */
    .fb-history-list { display: flex; flex-direction: column; gap: 10px; }
    .fb-history-item {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px; padding: 12px 14px;
    }
    .fb-history-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 6px;
    }
    .fb-tag {
      font-size: 10px; font-weight: 700; padding: 2px 8px;
      border-radius: 4px; font-family: var(--font-mono);
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .fb-tag-bug { background: rgba(255,82,82,0.1); color: #ff5252; }
    .fb-tag-feature { background: rgba(0,229,255,0.1); color: #00e5ff; }
    .fb-history-time { font-size: 10px; color: #555; font-family: var(--font-mono); }
    .fb-history-title { font-size: 13px; font-weight: 600; color: #e0e0e0; }
    .fb-history-desc {
      font-size: 11px; color: #888; margin-top: 4px;
      line-height: 1.5; white-space: pre-wrap;
      max-height: 60px; overflow: hidden;
    }

    /* Empty state */
    .fb-empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 300px; gap: 8px;
    }
    .fb-empty-icon {
      font-size: 36px; font-weight: 800; color: #333;
      font-family: var(--font-mono);
    }
    .fb-empty-text { font-size: 14px; color: #555; font-weight: 600; }
    .fb-empty-hint { font-size: 11px; color: #444; text-align: center; max-width: 280px; }
  `;
  document.head.appendChild(s);
}
