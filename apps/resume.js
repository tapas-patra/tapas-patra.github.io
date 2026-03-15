// Resume.app — PDF preview + AI resume tailoring

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://tapasos-api.onrender.com';

export function init(container) {
  injectStyles();

  container.innerHTML = `
    <div class="resume-container">
      <div class="resume-toolbar">
        <div class="resume-toolbar-left">
          <span class="resume-toolbar-title">Resume — Tapas Kumar Patra</span>
        </div>
        <div class="resume-toolbar-right">
          <a class="resume-btn resume-btn-download" href="myresume.pdf" download title="Download PDF">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </a>
          <button class="resume-btn resume-btn-generate" id="resume-gen-btn">
            Generate Custom Resume
          </button>
        </div>
      </div>
      <div class="resume-body">
        <iframe class="resume-iframe" src="myresume.pdf" title="Resume PDF"></iframe>
      </div>
      <div class="resume-drawer" id="resume-drawer">
        <div class="resume-drawer-header">
          <span>Generate Tailored Resume</span>
          <button class="resume-drawer-close" id="resume-drawer-close">\u2715</button>
        </div>
        <div class="resume-drawer-body">
          <p class="resume-drawer-desc">
            Paste a job description below. The AI will rewrite Tapas's resume tailored to this role.
            Estimated time: ~15 seconds.
          </p>
          <textarea class="resume-jd-input" id="resume-jd" placeholder="Paste job description here..." rows="8"></textarea>
          <button class="resume-btn resume-btn-submit" id="resume-submit" disabled>Generate Resume</button>
          <div class="resume-status" id="resume-status"></div>
        </div>
      </div>
    </div>
  `;

  bindResumeEvents(container);
}

function bindResumeEvents(container) {
  const genBtn = container.querySelector('#resume-gen-btn');
  const drawer = container.querySelector('#resume-drawer');
  const closeBtn = container.querySelector('#resume-drawer-close');
  const jdInput = container.querySelector('#resume-jd');
  const submitBtn = container.querySelector('#resume-submit');
  const status = container.querySelector('#resume-status');

  genBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
  });

  closeBtn.addEventListener('click', () => {
    drawer.classList.remove('open');
  });

  jdInput.addEventListener('input', () => {
    submitBtn.disabled = jdInput.value.trim().length < 20;
  });

  submitBtn.addEventListener('click', async () => {
    const jd = jdInput.value.trim();
    if (jd.length < 20) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating...';
    status.textContent = 'AI is tailoring the resume. This takes ~15 seconds...';
    status.className = 'resume-status loading';

    try {
      const resp = await fetch(`${API_BASE}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jd }),
      });

      if (!resp.ok) throw new Error(`Server error: ${resp.status}`);

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);

      // Auto-download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Tapas_Kumar_Patra_Resume_Tailored.pdf';
      a.click();
      URL.revokeObjectURL(url);

      status.textContent = 'Resume generated and downloaded!';
      status.className = 'resume-status success';
    } catch (err) {
      status.textContent = `Failed to generate resume. ${err.message}`;
      status.className = 'resume-status error';
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Generate Resume';
  });
}

function injectStyles() {
  if (document.getElementById('resume-styles')) return;
  const s = document.createElement('style');
  s.id = 'resume-styles';
  s.textContent = `
    .resume-container { height:100%; display:flex; flex-direction:column; position:relative; }

    .resume-toolbar {
      display:flex; align-items:center; justify-content:space-between;
      padding:8px 12px; border-bottom:1px solid var(--glass-border);
      background:var(--glass); flex-shrink:0;
    }
    .resume-toolbar-title { font-size:12px; color:var(--text-muted); font-weight:500; }
    .resume-toolbar-right { display:flex; gap:8px; }

    .resume-btn {
      display:inline-flex; align-items:center; gap:5px;
      padding:5px 12px; border-radius:6px; font-size:11px;
      font-family:var(--font-body); cursor:pointer; border:none;
      transition:background 0.2s, color 0.2s; text-decoration:none;
    }
    .resume-btn-download {
      background:var(--glass); border:1px solid var(--glass-border);
      color:var(--text-primary);
    }
    .resume-btn-download:hover { background:var(--glass-hover); }

    .resume-btn-generate {
      background:var(--violet); color:#fff;
    }
    .resume-btn-generate:hover { background:var(--violet-light); }

    .resume-btn-submit {
      background:var(--cyan); color:#000; font-weight:600; width:100%;
      padding:8px; border-radius:8px; margin-top:10px;
    }
    .resume-btn-submit:disabled { opacity:0.3; cursor:default; }
    .resume-btn-submit:not(:disabled):hover { filter:brightness(1.1); }

    .resume-body { flex:1; overflow:hidden; }
    .resume-iframe { width:100%; height:100%; border:none; background:#1a1a2e; }

    /* Drawer */
    .resume-drawer {
      position:absolute; bottom:0; left:0; right:0;
      background:var(--bg-surface); border-top:1px solid var(--glass-border);
      transform:translateY(100%); transition:transform 0.3s ease;
      z-index:10; border-radius:12px 12px 0 0;
      box-shadow:0 -8px 32px rgba(0,0,0,0.5);
    }
    .resume-drawer.open { transform:translateY(0); }

    .resume-drawer-header {
      display:flex; justify-content:space-between; align-items:center;
      padding:12px 16px; border-bottom:1px solid var(--glass-border);
      font-size:13px; font-weight:600;
    }
    .resume-drawer-close {
      background:none; border:none; color:var(--text-muted); cursor:pointer;
      font-size:16px; padding:4px;
    }
    .resume-drawer-body { padding:16px; }
    .resume-drawer-desc { font-size:12px; color:var(--text-muted); line-height:1.5; margin-bottom:12px; }

    .resume-jd-input {
      width:100%; background:var(--glass); border:1px solid var(--glass-border);
      border-radius:8px; padding:10px; color:var(--text-primary);
      font-family:var(--font-body); font-size:12px; resize:vertical; outline:none;
    }
    .resume-jd-input:focus { border-color:var(--cyan); }
    .resume-jd-input::placeholder { color:var(--text-dim); }

    .resume-status { font-size:11px; margin-top:8px; font-family:var(--font-mono); }
    .resume-status.loading { color:var(--text-muted); }
    .resume-status.success { color:var(--cyan); }
    .resume-status.error { color:var(--traffic-close); }
  `;
  document.head.appendChild(s);
}
