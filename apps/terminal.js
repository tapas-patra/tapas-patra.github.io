// Terminal.app — Full CLI emulator

const NEOFETCH = `
\x1b[36m        ████████╗ ██████╗ ███████╗\x1b[0m
\x1b[36m        ╚══██╔══╝██╔═══██╗██╔════╝\x1b[0m     \x1b[1mtapas\x1b[0m@\x1b[1mtapasos\x1b[0m
\x1b[36m           ██║   ██║   ██║███████╗\x1b[0m     ──────────────
\x1b[36m           ██║   ██║   ██║╚════██║\x1b[0m     \x1b[36mOS:\x1b[0m      TapasOS v2.0
\x1b[36m           ██║   ╚██████╔╝███████║\x1b[0m     \x1b[36mHost:\x1b[0m    tapas-patra.github.io
\x1b[36m           ╚═╝    ╚═════╝ ╚══════╝\x1b[0m     \x1b[36mKernel:\x1b[0m  Vanilla JS (no framework)
                                       \x1b[36mShell:\x1b[0m   TapasOS Terminal v1.0
  \x1b[35mPortfolio Operating System\x1b[0m           \x1b[36mDE:\x1b[0m      Glassmorphism Desktop
                                       \x1b[36mTheme:\x1b[0m   Deep Space Dark
                                       \x1b[36mCPU:\x1b[0m     Tapas Neural Core @ 3.8 GHz
                                       \x1b[36mGPU:\x1b[0m     Ambient Particle Accelerator v4
                                       \x1b[36mMemory:\x1b[0m  128 projects indexed
`.trim();

let history = [];
let historyIndex = -1;
let termData = null;

const COMMANDS = {
  help: () => `Available commands:
  \x1b[36mhelp\x1b[0m          Show this help message
  \x1b[36mls\x1b[0m            List available sections
  \x1b[36mcat <section>\x1b[0m Read a section (about, skills, projects, awards)
  \x1b[36mopen <app>\x1b[0m    Open a TapasOS app
  \x1b[36mneofetch\x1b[0m      Display system info
  \x1b[36mwhoami\x1b[0m        Who am I?
  \x1b[36mclear\x1b[0m         Clear the terminal
  \x1b[36mecho <text>\x1b[0m   Print text
  \x1b[36mdate\x1b[0m          Show current date/time
  \x1b[36mpwd\x1b[0m           Print working directory
  \x1b[36muname -a\x1b[0m      System information`,

  ls: () => `\x1b[36mabout\x1b[0m    \x1b[36mskills\x1b[0m    \x1b[36mprojects\x1b[0m    \x1b[36mawards\x1b[0m    \x1b[36mcontact\x1b[0m`,

  neofetch: () => NEOFETCH,

  whoami: () => `\x1b[1mTapas Kumar Patra\x1b[0m
SDET II at Setu by Pine Labs | Bengaluru, India
Building things that matter, one commit at a time.`,

  date: () => new Date().toString(),

  pwd: () => '/home/tapas/portfolio',

  'uname -a': () => 'TapasOS 2.0.0 tapas-patra.github.io vanilla-js aarch64 Portfolio/Operating-System',

  cat: (args) => {
    const section = (args[0] || '').toLowerCase();
    const sections = {
      about: () => `\x1b[1mTapas Kumar Patra\x1b[0m
SDET II at Setu by Pine Labs | Bengaluru, India

I build production systems that solve real problems — from RAG-powered
chatbots to enterprise testing platforms. I care about clean architecture,
measurable impact, and shipping fast.

\x1b[36mRole:\x1b[0m   SDET II @ Setu by Pine Labs (Jan 2026)
\x1b[36mPrev:\x1b[0m   Software Engineer @ Wipro (2021-2025)
\x1b[36mEmail:\x1b[0m  tapas.patra0406@gmail.com
\x1b[36mGitHub:\x1b[0m github.com/tapas-patra`,

      skills: () => {
        const langs = termData?.github?.languages || {};
        const top = Object.entries(langs).sort((a, b) => b[1].percentage - a[1].percentage).slice(0, 8);
        let out = '\x1b[1mLanguages (from GitHub)\x1b[0m\n';
        top.forEach(([lang, d]) => {
          const bar = '\u2588'.repeat(Math.round(d.percentage / 5)) + '\u2591'.repeat(20 - Math.round(d.percentage / 5));
          out += `  ${lang.padEnd(14)} ${bar} ${d.percentage}%\n`;
        });
        out += `\n\x1b[1mBackend:\x1b[0m  FastAPI, Node.js, Express, REST APIs, GraphQL`;
        out += `\n\x1b[1mAI/ML:\x1b[0m    RAG, LLM Integration, Prompt Engineering, Embeddings`;
        out += `\n\x1b[1mCloud:\x1b[0m    AWS, GitHub Actions, Docker, Vercel, Render`;
        out += `\n\x1b[1mTesting:\x1b[0m  Selenium, Playwright, TestRail`;
        return out;
      },

      projects: () => {
        const repos = termData?.github?.all_repos || [];
        if (repos.length === 0) return 'No project data. Run sync-github workflow.';
        let out = `\x1b[1m${repos.length} repositories\x1b[0m\n\n`;
        repos.slice(0, 12).forEach(r => {
          out += `  \x1b[36m${(r.name || '').padEnd(28)}\x1b[0m ${(r.language || '').padEnd(12)} ${r.description || ''}\n`;
        });
        if (repos.length > 12) out += `\n  ... and ${repos.length - 12} more. Use \x1b[36mopen projects\x1b[0m for the full explorer.`;
        return out;
      },

      awards: () => `\x1b[1m19 Performance Awards\x1b[0m (4 years)

  \x1b[33m★\x1b[0m Outstanding Performance  ×2   (2022–2024)
  \x1b[33m★\x1b[0m Excellence Award         ×3   (2021–2024)
  \x1b[33m★\x1b[0m Innovation Champion      ×2   (2022–2023)
  \x1b[33m★\x1b[0m Quality Champion         ×3   (2021–2024)
  \x1b[33m★\x1b[0m Team Player              ×2   (2022–2023)
  \x1b[33m★\x1b[0m Automation Hero          ×2   (2022–2024)
  \x1b[33m★\x1b[0m On-Time Delivery         ×3   (2021–2024)
  \x1b[33m★\x1b[0m Customer Impact          ×2   (2023–2024)`,

      contact: () => `\x1b[1mContact\x1b[0m
  \x1b[36mEmail:\x1b[0m     tapas.patra0406@gmail.com
  \x1b[36mGitHub:\x1b[0m    github.com/tapas-patra
  \x1b[36mLinkedIn:\x1b[0m  www.linkedin.com/in/tapas-kumar-patra/
  \x1b[36mLocation:\x1b[0m  Bengaluru, India (IST, UTC+5:30)`,
    };

    if (!section) return 'Usage: cat <section>\nSections: about, skills, projects, awards, contact';
    if (sections[section]) return sections[section]();
    return `cat: ${section}: No such file or directory`;
  },

  open: (args) => {
    const appName = (args[0] || '').toLowerCase();
    const appMap = {
      'ai': 'ai-assistant', 'tapas.ai': 'ai-assistant', 'chat': 'ai-assistant',
      'projects': 'projects', 'finder': 'projects',
      'skills': 'skills',
      'activity': 'activity', 'monitor': 'activity',
      'awards': 'awards',
      'resume': 'resume',
      'terminal': 'terminal',
      'contact': 'contact',
    };
    const appId = appMap[appName];
    if (!appId) return `open: unknown app "${appName}"\nAvailable: ai, projects, skills, activity, awards, resume, terminal, contact`;
    import('../os/desktop.js').then(mod => mod.openApp(appId));
    return `Opening ${appName}...`;
  },

  echo: (args) => args.join(' '),

  clear: () => '__CLEAR__',

  sudo: (args) => {
    if (args.join(' ').toLowerCase() === 'hire tapas') {
      return `\x1b[32m
  ╔══════════════════════════════════════════╗
  ║                                          ║
  ║   Permission granted! 🎉                  ║
  ║                                          ║
  ║   Tapas has been added to your team.     ║
  ║   Expect great things.                   ║
  ║                                          ║
  ║   Contact: tapas.patra0406@gmail.com     ║
  ║                                          ║
  ╚══════════════════════════════════════════╝
\x1b[0m`;
    }
    return 'sudo: nice try ;)';
  },
};

export async function init(container) {
  injectStyles();

  try {
    const resp = await fetch('data.json');
    termData = await resp.json();
  } catch { /* no data */ }

  container.innerHTML = `
    <div class="term-container">
      <div class="term-output" id="term-output">
        <div class="term-line">Welcome to \x1b[36mTapasOS Terminal\x1b[0m v1.0</div>
        <div class="term-line">Type \x1b[36mhelp\x1b[0m for available commands.</div>
        <div class="term-line">&nbsp;</div>
      </div>
      <div class="term-input-line">
        <span class="term-prompt">\x1b[32mtapas\x1b[0m@\x1b[36mtapasos\x1b[0m:~$ </span>
        <input class="term-input" id="term-input" type="text" autofocus spellcheck="false" autocomplete="off">
      </div>
    </div>
  `;

  renderAnsi(container.querySelector('#term-output'));

  const input = container.querySelector('#term-input');
  const output = container.querySelector('#term-output');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = input.value.trim();
      if (cmd) {
        history.push(cmd);
        historyIndex = history.length;
        executeCommand(cmd, output);
      }
      input.value = '';
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input.value = history[historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        historyIndex++;
        input.value = history[historyIndex];
      } else {
        historyIndex = history.length;
        input.value = '';
      }
    }
  });

  container.addEventListener('click', () => input.focus());
}

function executeCommand(cmd, output) {
  // Echo command
  appendLine(output, `\x1b[32mtapas\x1b[0m@\x1b[36mtapasos\x1b[0m:~$ ${escapeHtml(cmd)}`);

  const parts = cmd.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  // Check for compound commands like "uname -a"
  const fullCmd = parts.slice(0, 2).join(' ').toLowerCase();

  let result;
  if (COMMANDS[fullCmd]) {
    result = COMMANDS[fullCmd](parts.slice(2));
  } else if (COMMANDS[command]) {
    result = typeof COMMANDS[command] === 'function' ? COMMANDS[command](args) : COMMANDS[command];
  } else {
    result = `${command}: command not found. Type \x1b[36mhelp\x1b[0m for available commands.`;
  }

  if (result === '__CLEAR__') {
    output.innerHTML = '';
  } else if (result) {
    result.split('\n').forEach(line => appendLine(output, line));
  }

  appendLine(output, '');
  output.scrollTop = output.scrollHeight;
}

function appendLine(output, text) {
  const line = document.createElement('div');
  line.className = 'term-line';
  line.innerHTML = ansiToHtml(text);
  output.appendChild(line);
}

function ansiToHtml(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\x1b\[0m/g, '</span>')
    .replace(/\x1b\[1m/g, '<span style="font-weight:700">')
    .replace(/\x1b\[32m/g, '<span style="color:#27C93F">')
    .replace(/\x1b\[33m/g, '<span style="color:#FFBD2E">')
    .replace(/\x1b\[35m/g, '<span style="color:#A78BFA">')
    .replace(/\x1b\[36m/g, '<span style="color:#00E5FF">');
}

function renderAnsi(el) {
  el.querySelectorAll('.term-line').forEach(line => {
    line.innerHTML = ansiToHtml(line.textContent);
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function injectStyles() {
  if (document.getElementById('terminal-styles')) return;
  const s = document.createElement('style');
  s.id = 'terminal-styles';
  s.textContent = `
    .term-container {
      height:100%; display:flex; flex-direction:column;
      background:#0a0a0f; font-family:var(--font-mono); font-size:13px;
      color:#8B9A6B; padding:8px 12px;
    }
    .term-output { flex:1; overflow-y:auto; white-space:pre-wrap; word-break:break-word; }
    .term-line { line-height:1.5; min-height:1.5em; }
    .term-input-line { display:flex; align-items:center; gap:0; flex-shrink:0; padding-top:2px; }
    .term-prompt { white-space:nowrap; }
    .term-input {
      flex:1; background:none; border:none; color:#8B9A6B;
      font-family:var(--font-mono); font-size:13px; outline:none;
      caret-color:#00E5FF; padding:0; margin:0;
    }
  `;
  document.head.appendChild(s);
}
