// Mobile Bottom Navigation

import { initVoice } from './voice.js';
import { initChat } from './chat.js';

const TABS = [
  { id: 'voice',    label: 'Home',     icon: '\uD83C\uDF99\uFE0F' },
  { id: 'chat',     label: 'Chat',     icon: '\uD83D\uDCAC' },
  { id: 'about',    label: 'About',    icon: '\uD83D\uDC64' },
  { id: 'projects', label: 'Projects', icon: '\uD83D\uDCC2' },
  { id: 'contact',  label: 'Contact',  icon: '\uD83D\uDCEC' },
];

let currentTab = 'voice';

export function initMobileApp(root) {
  injectStyles();

  root.innerHTML = `
    <div class="mobile-app">
      <div class="mobile-content" id="mobile-content"></div>
      <nav class="mobile-nav" id="mobile-nav">
        ${TABS.map(t => `
          <button class="mobile-nav-item ${t.id === 'voice' ? 'active' : ''}" data-tab="${t.id}">
            <span class="mobile-nav-icon">${t.icon}</span>
            <span class="mobile-nav-label">${t.label}</span>
          </button>
        `).join('')}
      </nav>
    </div>
  `;

  document.getElementById('mobile-nav').addEventListener('click', (e) => {
    const item = e.target.closest('.mobile-nav-item');
    if (item) switchTab(item.dataset.tab);
  });

  switchTab('voice');
}

function switchTab(tabId) {
  currentTab = tabId;
  const content = document.getElementById('mobile-content');
  const nav = document.getElementById('mobile-nav');

  nav.querySelectorAll('.mobile-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });

  content.innerHTML = '';

  switch (tabId) {
    case 'voice':
      initVoice(content);
      break;
    case 'chat':
      initChat(content);
      break;
    case 'about':
      renderAbout(content);
      break;
    case 'projects':
      renderProjects(content);
      break;
    case 'contact':
      renderContact(content);
      break;
  }
}

async function renderAbout(container) {
  container.innerHTML = `
    <div class="mobile-page">
      <div class="mobile-page-header">
        <div style="font-size:48px;">👤</div>
        <div class="mobile-page-title">Tapas Kumar Patra</div>
        <div class="mobile-page-sub">Senior Software Engineer</div>
        <div class="mobile-page-loc">Bengaluru, India</div>
      </div>
      <div class="mobile-section">
        <p>I build production systems that solve real problems — from RAG-powered chatbots to enterprise testing platforms. I care about clean architecture, measurable impact, and shipping fast.</p>
      </div>
      <div class="mobile-section">
        <div class="mobile-section-title">Highlights</div>
        <div class="mobile-stat-row">
          <div class="mobile-stat"><span class="mobile-stat-num">19</span><span>Awards</span></div>
          <div class="mobile-stat"><span class="mobile-stat-num">4</span><span>Years</span></div>
          <div class="mobile-stat"><span class="mobile-stat-num">2x</span><span>Outstanding</span></div>
        </div>
      </div>
      <div class="mobile-section">
        <div class="mobile-section-title">Status</div>
        <div style="color:var(--cyan);font-size:13px;">Open to new opportunities</div>
      </div>
    </div>
  `;
}

async function renderProjects(container) {
  let repos = [];
  try {
    const resp = await fetch('data.json');
    const data = await resp.json();
    repos = data.github?.all_repos || [];
  } catch { /* empty */ }

  container.innerHTML = `
    <div class="mobile-page">
      <div class="mobile-section-title" style="padding:16px 16px 8px;">Projects (${repos.length})</div>
      <div class="mobile-project-list">
        ${repos.length === 0 ? '<div style="padding:16px;color:var(--text-dim);font-size:13px;">No projects loaded yet.</div>' :
          repos.slice(0, 20).map(r => `
            <a class="mobile-project" href="${r.url}" target="_blank" rel="noopener">
              <div class="mobile-project-name">${r.name}</div>
              <div class="mobile-project-desc">${r.description || 'No description'}</div>
              <div class="mobile-project-meta">
                ${r.language ? `<span>${r.language}</span>` : ''}
                ${r.stars > 0 ? `<span>⭐ ${r.stars}</span>` : ''}
              </div>
            </a>
          `).join('')
        }
      </div>
    </div>
  `;
}

function renderContact(container) {
  container.innerHTML = `
    <div class="mobile-page">
      <div class="mobile-page-header">
        <div style="font-size:36px;">📬</div>
        <div class="mobile-page-title">Get in Touch</div>
      </div>
      <div class="mobile-contact-list">
        <a class="mobile-contact-item" href="mailto:tapas.patra0406@gmail.com?subject=From%20TapasOS">
          <span>✉️</span><span>tapas.patra0406@gmail.com</span>
        </a>
        <a class="mobile-contact-item" href="https://github.com/tapas-patra" target="_blank" rel="noopener">
          <span>🐱</span><span>github.com/tapas-patra</span>
        </a>
        <a class="mobile-contact-item" href="https://www.linkedin.com/in/tapas-kumar-patra/" target="_blank" rel="noopener">
          <span>🔗</span><span>www.linkedin.com/in/tapas-kumar-patra/</span>
        </a>
      </div>
      <div style="text-align:center;color:var(--text-dim);font-size:11px;margin-top:24px;">
        📍 Bengaluru, India · IST (UTC+5:30)
      </div>
    </div>
  `;
}

function injectStyles() {
  if (document.getElementById('mobile-nav-styles')) return;
  const s = document.createElement('style');
  s.id = 'mobile-nav-styles';
  s.textContent = `
    .mobile-app { display:flex; flex-direction:column; height:100vh; background:var(--bg-deep); color:var(--text-primary); }
    .mobile-content { flex:1; overflow-y:auto; position:relative; }

    .mobile-nav {
      display:flex; border-top:1px solid var(--glass-border);
      background:var(--bg-surface); padding:6px 0 env(safe-area-inset-bottom, 8px);
      flex-shrink:0;
    }
    .mobile-nav-item {
      flex:1; display:flex; flex-direction:column; align-items:center; gap:2px;
      background:none; border:none; color:var(--text-dim); cursor:pointer;
      padding:6px 0; font-family:var(--font-body);
      -webkit-tap-highlight-color:transparent;
    }
    .mobile-nav-item.active { color:var(--cyan); }
    .mobile-nav-icon { font-size:18px; }
    .mobile-nav-label { font-size:10px; }

    /* Pages */
    .mobile-page { padding:16px; }
    .mobile-page-header { text-align:center; padding:20px 0; }
    .mobile-page-title { font-family:var(--font-display); font-size:20px; font-weight:700; margin-top:8px; }
    .mobile-page-sub { color:var(--text-muted); font-size:13px; margin-top:2px; }
    .mobile-page-loc { color:var(--text-dim); font-size:11px; margin-top:4px; font-family:var(--font-mono); }

    .mobile-section { padding:12px 0; }
    .mobile-section p { font-size:14px; line-height:1.6; color:var(--text-muted); }
    .mobile-section-title { font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px; }

    .mobile-stat-row { display:flex; gap:12px; }
    .mobile-stat {
      flex:1; background:var(--glass); border:1px solid var(--glass-border);
      border-radius:10px; padding:12px; text-align:center;
      display:flex; flex-direction:column; gap:4px; font-size:11px; color:var(--text-muted);
    }
    .mobile-stat-num { font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--cyan); }

    /* Projects */
    .mobile-project-list { display:flex; flex-direction:column; gap:8px; padding:0 16px; }
    .mobile-project {
      background:var(--glass); border:1px solid var(--glass-border); border-radius:10px;
      padding:12px; text-decoration:none; color:inherit; display:block;
    }
    .mobile-project-name { font-size:14px; font-weight:600; color:var(--text-primary); }
    .mobile-project-desc { font-size:12px; color:var(--text-muted); margin-top:4px; line-height:1.4; }
    .mobile-project-meta { display:flex; gap:10px; font-size:11px; color:var(--text-dim); margin-top:6px; }

    /* Contact */
    .mobile-contact-list { display:flex; flex-direction:column; gap:8px; }
    .mobile-contact-item {
      display:flex; align-items:center; gap:12px;
      background:var(--glass); border:1px solid var(--glass-border); border-radius:10px;
      padding:14px; text-decoration:none; color:var(--text-primary); font-size:13px;
    }
  `;
  document.head.appendChild(s);
}
