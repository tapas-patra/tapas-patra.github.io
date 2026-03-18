// Contact.app — Mail-style contact interface, fetches from tapas-data/profile.yaml

const PROFILE_YAML_URL = 'https://tapas-patra.github.io/tapas-data/profile.yaml';

const COPY_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

export async function init(container) {
  injectStyles();

  container.innerHTML = `<div class="contact-container"><div class="contact-loading">Loading contact...</div></div>`;

  let contact = null;
  try {
    const text = await fetch(PROFILE_YAML_URL + '?t=' + Date.now()).then(r => r.text());
    contact = parseContactFromProfile(text);
  } catch { /* */ }

  // Fallback if YAML fails
  if (!contact) {
    contact = {
      name: 'Tapas Kumar Patra', title: 'SDET II at Setu by Pine Labs',
      email: 'tapas.patra0406@gmail.com',
      github: 'https://github.com/tapas-patra', github_label: 'github.com/tapas-patra',
      linkedin: 'https://www.linkedin.com/in/tapas-kumar-patra/', linkedin_label: 'linkedin.com/in/tapas-kumar-patra',
      location: 'Bengaluru, India', timezone: 'IST (UTC+5:30)'
    };
  }

  const methods = [
    { type: 'email', icon: '\u2709\uFE0F', label: 'Email', value: contact.email, href: `mailto:${contact.email}?subject=Reaching%20out%20from%20TapasOS` },
    { type: 'github', icon: '\uD83D\uDC31', label: 'GitHub', value: contact.github_label, href: contact.github },
    { type: 'linkedin', icon: '\uD83D\uDD17', label: 'LinkedIn', value: contact.linkedin_label, href: contact.linkedin },
  ];

  container.innerHTML = `
    <div class="contact-container">
      <div class="contact-sidebar">
        <div class="contact-sidebar-header">
          <div class="contact-avatar">\uD83D\uDC64</div>
          <div class="contact-name">${esc(contact.name)}</div>
          <div class="contact-title">${esc(contact.title)}</div>
        </div>
        <div class="contact-methods">
          ${methods.map(m => `
            <div class="contact-method" data-href="${m.href}">
              <span class="contact-method-icon">${m.icon}</span>
              <div class="contact-method-info">
                <div class="contact-method-label">${m.label}</div>
                <div class="contact-method-value">${esc(m.value)}</div>
              </div>
              <button class="contact-copy-btn" data-copy="${esc(m.value)}" title="Copy to clipboard">
                ${COPY_ICON}
              </button>
            </div>
          `).join('')}
        </div>
        <div class="contact-location">
          <span>\uD83D\uDCCD</span>
          <span>${esc(contact.location)} \u00B7 ${esc(contact.timezone)}</span>
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
              <span class="contact-compose-to">${esc(contact.email)}</span>
            </div>
            <div class="contact-compose-row">
              <span class="contact-compose-label">Subject:</span>
              <span class="contact-compose-subj">Reaching out from TapasOS</span>
            </div>
            <div class="contact-compose-message">
              <p>Choose how to connect:</p>
              <div class="contact-action-grid">
                <a class="contact-action-card" href="mailto:${contact.email}?subject=Reaching%20out%20from%20TapasOS" target="_blank">
                  <span class="contact-action-icon">\u2709\uFE0F</span>
                  <span class="contact-action-label">Send Email</span>
                  <span class="contact-action-desc">Opens your email client</span>
                </a>
                <a class="contact-action-card" href="${contact.linkedin}" target="_blank" rel="noopener">
                  <span class="contact-action-icon">\uD83D\uDD17</span>
                  <span class="contact-action-label">Connect on LinkedIn</span>
                  <span class="contact-action-desc">Professional profile</span>
                </a>
                <a class="contact-action-card" href="${contact.github}" target="_blank" rel="noopener">
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
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = '\u2713';
        btn.style.color = 'var(--cyan)';
        setTimeout(() => { btn.innerHTML = COPY_ICON; btn.style.color = ''; }, 1500);
      } catch { /* */ }
    });
  });

  // Click method to open link
  container.querySelectorAll('.contact-method').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.contact-copy-btn')) return;
      window.open(el.dataset.href, '_blank');
    });
  });
}

function parseContactFromProfile(text) {
  // Find the contact entry block
  const contactBlock = text.split(/\n  - id:\s*contact\b/)[1];
  if (!contactBlock) return null;

  // Cut at next entry
  const block = contactBlock.split(/\n  - id:\s*/)[0];
  const lines = block.split('\n');

  const result = {
    name: '', title: '', email: '', github: '', github_label: '',
    linkedin: '', linkedin_label: '', location: '', timezone: ''
  };

  for (const line of lines) {
    const m = line.match(/^\s{4}(\w[\w_]*):\s*(.+)/);
    if (m) {
      const [, key, val] = m;
      const v = val.trim().replace(/^["']|["']$/g, '');
      if (result.hasOwnProperty(key)) result[key] = v;
    }
  }

  // Get name/title from intro entry
  const introBlock = text.split(/\n  - id:\s*intro\b/)[1];
  if (introBlock) {
    const titleMatch = introBlock.match(/^\s{4}title:\s*(.+)/m);
    if (titleMatch) result.name = 'Tapas Kumar Patra'; // from source
  }

  // Parse name from top of YAML or intro text
  const introText = text.match(/I'm ([^,]+),\s*an?\s+([^,]+)/);
  if (introText) {
    result.name = introText[1].trim();
    result.title = introText[2].trim();
  }

  // Fallback name
  if (!result.name) result.name = 'Tapas Kumar Patra';
  if (!result.title) {
    const currentRole = text.match(/I currently work as\s+([^(]+)\s+at\s+([^(,]+)/);
    if (currentRole) result.title = `${currentRole[1].trim()} at ${currentRole[2].trim()}`;
  }

  return result.email ? result : null;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function injectStyles() {
  if (document.getElementById('contact-styles')) return;
  const s = document.createElement('style');
  s.id = 'contact-styles';
  s.textContent = `
    .contact-container { display:flex; height:100%; }
    .contact-loading {
      display:flex; align-items:center; justify-content:center; width:100%;
      color:var(--text-dim); font-size:13px; font-family:var(--font-mono);
    }

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
