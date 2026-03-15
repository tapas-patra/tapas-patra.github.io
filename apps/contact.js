// Contact.app — Mail-style contact interface

const CONTACT_METHODS = [
  { type: 'email',    icon: '\u2709\uFE0F', label: 'Email',    value: 'tapas.patra0406@gmail.com', href: 'mailto:tapas.patra0406@gmail.com?subject=Reaching%20out%20from%20TapasOS' },
  { type: 'github',   icon: '\uD83D\uDC31', label: 'GitHub',   value: 'github.com/tapas-patra',    href: 'https://github.com/tapas-patra' },
  { type: 'linkedin', icon: '\uD83D\uDD17', label: 'LinkedIn', value: 'www.linkedin.com/in/tapas-kumar-patra/', href: 'https://www.linkedin.com/in/tapas-kumar-patra/' },
];

export function init(container) {
  injectStyles();

  container.innerHTML = `
    <div class="contact-container">
      <div class="contact-sidebar">
        <div class="contact-sidebar-header">
          <div class="contact-avatar">\uD83D\uDC64</div>
          <div class="contact-name">Tapas Kumar Patra</div>
          <div class="contact-title">Senior Software Engineer</div>
        </div>
        <div class="contact-methods">
          ${CONTACT_METHODS.map(m => `
            <div class="contact-method" data-type="${m.type}">
              <span class="contact-method-icon">${m.icon}</span>
              <div class="contact-method-info">
                <div class="contact-method-label">${m.label}</div>
                <div class="contact-method-value">${m.value}</div>
              </div>
              <button class="contact-copy-btn" data-copy="${m.value}" title="Copy to clipboard">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
        <div class="contact-location">
          <span>\uD83D\uDCCD</span>
          <span>Bengaluru, India \u00B7 IST (UTC+5:30)</span>
        </div>
      </div>
      <div class="contact-main">
        <div class="contact-compose">
          <div class="contact-compose-header">
            <div class="contact-compose-title">Quick Reach Out</div>
          </div>
          <div class="contact-compose-body">
            <div class="contact-compose-row">
              <span class="contact-compose-label">To:</span>
              <span class="contact-compose-to">tapas.patra0406@gmail.com</span>
            </div>
            <div class="contact-compose-row">
              <span class="contact-compose-label">Subject:</span>
              <span class="contact-compose-subj">Reaching out from TapasOS</span>
            </div>
            <div class="contact-compose-message">
              <p>Choose how to connect:</p>
              <div class="contact-action-grid">
                <a class="contact-action-card" href="mailto:tapas.patra0406@gmail.com?subject=Reaching%20out%20from%20TapasOS" target="_blank">
                  <span class="contact-action-icon">\u2709\uFE0F</span>
                  <span class="contact-action-label">Send Email</span>
                  <span class="contact-action-desc">Opens your email client</span>
                </a>
                <a class="contact-action-card" href="https://www.linkedin.com/in/tapas-kumar-patra/" target="_blank" rel="noopener">
                  <span class="contact-action-icon">\uD83D\uDD17</span>
                  <span class="contact-action-label">Connect on LinkedIn</span>
                  <span class="contact-action-desc">Professional profile</span>
                </a>
                <a class="contact-action-card" href="https://github.com/tapas-patra" target="_blank" rel="noopener">
                  <span class="contact-action-icon">\uD83D\uDC31</span>
                  <span class="contact-action-label">View GitHub</span>
                  <span class="contact-action-desc">Code and contributions</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Copy to clipboard
  container.querySelectorAll('.contact-copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = '\u2713';
        btn.style.color = 'var(--cyan)';
        setTimeout(() => {
          btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
          btn.style.color = '';
        }, 1500);
      } catch { /* clipboard not available */ }
    });
  });

  // Click method to open link
  container.querySelectorAll('.contact-method').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.contact-copy-btn')) return;
      const type = el.dataset.type;
      const method = CONTACT_METHODS.find(m => m.type === type);
      if (method) window.open(method.href, '_blank');
    });
  });
}

function injectStyles() {
  if (document.getElementById('contact-styles')) return;
  const s = document.createElement('style');
  s.id = 'contact-styles';
  s.textContent = `
    .contact-container { display:flex; height:100%; }

    .contact-sidebar {
      width:220px; flex-shrink:0; border-right:1px solid var(--glass-border);
      padding:20px 14px; display:flex; flex-direction:column; gap:16px;
      background:rgba(0,0,0,0.15); overflow-y:auto;
    }
    .contact-sidebar-header { text-align:center; }
    .contact-avatar { font-size:40px; margin-bottom:8px; }
    .contact-name { font-size:14px; font-weight:600; color:var(--text-primary); }
    .contact-title { font-size:11px; color:var(--text-muted); margin-top:2px; }

    .contact-methods { display:flex; flex-direction:column; gap:6px; }
    .contact-method {
      display:flex; align-items:center; gap:8px; padding:8px 10px;
      border-radius:8px; cursor:pointer; transition:background 0.15s;
    }
    .contact-method:hover { background:var(--glass); }
    .contact-method-icon { font-size:16px; flex-shrink:0; }
    .contact-method-info { flex:1; min-width:0; }
    .contact-method-label { font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.5px; }
    .contact-method-value { font-size:11px; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .contact-copy-btn {
      background:none; border:none; color:var(--text-dim); cursor:pointer;
      padding:4px; border-radius:4px; transition:color 0.2s;
    }
    .contact-copy-btn:hover { color:var(--text-primary); }

    .contact-location {
      display:flex; align-items:center; gap:6px; font-size:11px;
      color:var(--text-dim); padding:8px 10px;
    }

    .contact-main { flex:1; overflow-y:auto; }
    .contact-compose { height:100%; display:flex; flex-direction:column; }
    .contact-compose-header {
      padding:12px 16px; border-bottom:1px solid var(--glass-border);
    }
    .contact-compose-title { font-size:13px; font-weight:600; }

    .contact-compose-body { padding:16px; flex:1; }
    .contact-compose-row {
      display:flex; gap:8px; align-items:center; padding:6px 0;
      border-bottom:1px solid var(--glass-border); font-size:12px;
    }
    .contact-compose-label { color:var(--text-dim); font-weight:500; width:60px; flex-shrink:0; }
    .contact-compose-to { color:var(--cyan); }
    .contact-compose-subj { color:var(--text-muted); }

    .contact-compose-message { margin-top:20px; }
    .contact-compose-message p { font-size:13px; color:var(--text-muted); margin-bottom:14px; }

    .contact-action-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; }
    .contact-action-card {
      background:var(--glass); border:1px solid var(--glass-border); border-radius:10px;
      padding:16px 12px; text-align:center; text-decoration:none; color:inherit;
      transition:border-color 0.2s, background 0.2s, transform 0.15s; cursor:pointer;
      display:flex; flex-direction:column; align-items:center; gap:6px;
    }
    .contact-action-card:hover { border-color:var(--cyan); background:var(--glass-hover); transform:translateY(-2px); }
    .contact-action-icon { font-size:24px; }
    .contact-action-label { font-size:12px; font-weight:600; color:var(--text-primary); }
    .contact-action-desc { font-size:10px; color:var(--text-dim); }
  `;
  document.head.appendChild(s);
}
