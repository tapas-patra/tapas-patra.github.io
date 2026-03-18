// Terminal.app — Full CLI emulator, fetches dynamic data from tapas-data

const DATA_BASE = 'https://tapas-patra.github.io/tapas-data';

const NEOFETCH = `
\x1b[36m        \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\x1b[0m
\x1b[36m        \u255a\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255d\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d\x1b[0m     \x1b[1mtapas\x1b[0m@\x1b[1mtapasos\x1b[0m
\x1b[36m           \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\x1b[0m     \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
\x1b[36m           \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551\u255a\u2550\u2550\u2550\u2550\u2588\u2588\u2551\x1b[0m     \x1b[36mOS:\x1b[0m      TapasOS v2.0
\x1b[36m           \u2588\u2588\u2551   \u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\x1b[0m     \x1b[36mHost:\x1b[0m    tapas-patra.github.io
\x1b[36m           \u255a\u2550\u255d    \u255a\u2550\u2550\u2550\u2550\u2550\u255d \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d\x1b[0m     \x1b[36mKernel:\x1b[0m  Vanilla JS (no framework)
                                       \x1b[36mShell:\x1b[0m   TapasOS Terminal v1.0
  \x1b[35mPortfolio Operating System\x1b[0m           \x1b[36mDE:\x1b[0m      Glassmorphism Desktop
                                       \x1b[36mTheme:\x1b[0m   Deep Space Dark
                                       \x1b[36mCPU:\x1b[0m     Tapas Neural Core @ 3.8 GHz
                                       \x1b[36mGPU:\x1b[0m     Ambient Particle Accelerator v4
                                       \x1b[36mMemory:\x1b[0m  128 projects indexed
`.trim();

let cmdHistory = [];
let historyIndex = -1;
let termData = null;
let yamlCache = {};

async function fetchYaml(name) {
  if (yamlCache[name]) return yamlCache[name];
  try {
    const text = await fetch(`${DATA_BASE}/${name}.yaml?t=${Date.now()}`).then(r => r.text());
    yamlCache[name] = text;
    return text;
  } catch { return ''; }
}

const COMMANDS = {
  help: () => `Available commands:
  \x1b[36mhelp\x1b[0m          Show this help message
  \x1b[36mls\x1b[0m            List available sections
  \x1b[36mcat <section>\x1b[0m Read a section (about, experience, education, skills, projects, awards, contact)
  \x1b[36mopen <app>\x1b[0m    Open a TapasOS app
  \x1b[36mneofetch\x1b[0m      Display system info
  \x1b[36mwhoami\x1b[0m        Who am I?
  \x1b[36mclear\x1b[0m         Clear the terminal
  \x1b[36mecho <text>\x1b[0m   Print text
  \x1b[36mdate\x1b[0m          Show current date/time
  \x1b[36mpwd\x1b[0m           Print working directory
  \x1b[36muname -a\x1b[0m      System information`,

  ls: () => `\x1b[36mabout\x1b[0m    \x1b[36mexperience\x1b[0m    \x1b[36meducation\x1b[0m    \x1b[36mskills\x1b[0m    \x1b[36mprojects\x1b[0m    \x1b[36mawards\x1b[0m    \x1b[36mcontact\x1b[0m`,

  neofetch: () => NEOFETCH,

  whoami: async () => {
    const text = await fetchYaml('profile');
    const nameMatch = text.match(/I'm ([^,]+),\s*an?\s+([^,]+)/);
    if (nameMatch) {
      return `\x1b[1m${nameMatch[1].trim()}\x1b[0m\n${nameMatch[2].trim()} | Bengaluru, India\nBuilding things that matter, one commit at a time.`;
    }
    return `\x1b[1mTapas Kumar Patra\x1b[0m\nSDET II at Setu by Pine Labs | Bengaluru, India\nBuilding things that matter, one commit at a time.`;
  },

  date: () => new Date().toString(),
  pwd: () => '/home/tapas/portfolio',
  'uname -a': () => 'TapasOS 2.0.0 tapas-patra.github.io vanilla-js aarch64 Portfolio/Operating-System',

  cat: async (args) => {
    const section = (args[0] || '').toLowerCase();
    if (!section) return 'Usage: cat <section>\nSections: about, experience, education, skills, projects, awards, contact';

    const sections = {
      about: async () => {
        const text = await fetchYaml('profile');
        const nameMatch = text.match(/I'm ([^,]+),\s*an?\s+([^,]+)/);
        const name = nameMatch ? nameMatch[1].trim() : 'Tapas Kumar Patra';

        // Parse intro and current-role text
        const introBlock = text.split(/- id:\s*intro/)[1];
        const introText = introBlock ? extractFoldedText(introBlock) : '';
        const roleBlock = text.split(/- id:\s*current-role/)[1];
        const roleText = roleBlock ? extractFoldedText(roleBlock) : '';

        // Parse contact fields
        const email = text.match(/email:\s*(.+)/m)?.[1]?.trim() || '';
        const github = text.match(/github_label:\s*(.+)/m)?.[1]?.trim() || '';

        let out = `\x1b[1m${name}\x1b[0m\n`;
        if (introText) out += `${introText}\n\n`;
        if (roleText) out += `${roleText}\n\n`;
        if (email) out += `\x1b[36mEmail:\x1b[0m  ${email}\n`;
        if (github) out += `\x1b[36mGitHub:\x1b[0m ${github}`;
        return out;
      },

      experience: async () => {
        const text = await fetchYaml('experience');
        const blocks = text.split(/\n  - id:\s*/);
        blocks.shift();

        let out = '\x1b[1mWork Experience\x1b[0m\n';
        for (const block of blocks) {
          const company = block.match(/company:\s*(.+)/m)?.[1]?.trim() || '';
          const role = block.match(/role:\s*(.+)/m)?.[1]?.trim() || '';
          const period = block.match(/period:\s*"?(.+?)"?\s*$/m)?.[1]?.trim() || '';
          const current = block.match(/current:\s*true/m);

          out += `\n  ${current ? '\x1b[32m\u25CF\x1b[0m' : '\x1b[33m\u25CB\x1b[0m'} \x1b[1m${role}\x1b[0m\n`;
          out += `    \x1b[36m${company}\x1b[0m \u00B7 ${period}\n`;

          // Parse highlight sections
          const sections = block.split(/- section:\s*/);
          sections.shift();
          for (const s of sections) {
            const sLines = s.split('\n');
            const sName = sLines[0].trim().replace(/^["']|["']$/g, '');
            out += `\n    \x1b[33m${sName}\x1b[0m\n`;
            for (const sl of sLines) {
              const itemMatch = sl.match(/^\s+- "(.+)"$/);
              if (itemMatch) out += `      \u2022 ${itemMatch[1]}\n`;
            }
          }
        }
        return out;
      },

      education: async () => {
        const text = await fetchYaml('education');
        const blocks = text.split(/\n  - id:\s*/);
        blocks.shift();

        let out = '\x1b[1mEducation\x1b[0m\n';
        for (const block of blocks) {
          const degree = block.match(/degree:\s*(.+)/m)?.[1]?.trim() || '';
          const inst = block.match(/institution:\s*(.+)/m)?.[1]?.trim() || '';
          const period = block.match(/period:\s*"?(.+?)"?\s*$/m)?.[1]?.trim() || '';
          const desc = extractFoldedText(block);

          out += `\n  \x1b[1m${degree}\x1b[0m\n`;
          if (inst) out += `    \x1b[36m${inst}\x1b[0m \u00B7 ${period}\n`;
          else out += `    ${period}\n`;
          if (desc) out += `    ${desc}\n`;
        }
        return out;
      },

      skills: () => {
        const langs = termData?.github?.languages || {};
        const top = Object.entries(langs).sort((a, b) => b[1].percentage - a[1].percentage).slice(0, 8);
        let out = '\x1b[1mLanguages (from GitHub)\x1b[0m\n';
        top.forEach(([lang, d]) => {
          const bar = '\u2588'.repeat(Math.round(d.percentage / 5)) + '\u2591'.repeat(20 - Math.round(d.percentage / 5));
          out += `  ${lang.padEnd(14)} ${bar} ${d.percentage}%\n`;
        });
        out += `\nType \x1b[36mopen skills\x1b[0m for the full skills breakdown.`;
        return out;
      },

      projects: () => {
        const repos = termData?.github?.all_repos || [];
        if (repos.length === 0) return 'No project data. Run sync-github workflow.';
        let out = `\x1b[1m${repos.length} repositories\x1b[0m\n\n`;
        repos.slice(0, 12).forEach(r => {
          out += `  \x1b[36m${(r.name || '').padEnd(28)}\x1b[0m ${(r.language || '').padEnd(12)} ${r.description || ''}\n`;
        });
        if (repos.length > 12) out += `\n  ... and ${repos.length - 12} more. Use \x1b[36mopen projects\x1b[0m for full explorer.`;
        return out;
      },

      awards: async () => {
        const text = await fetchYaml('awards');
        const totalMatch = text.match(/total:\s*(\d+)/);
        const total = totalMatch ? totalMatch[1] : '19';

        let out = `\x1b[1m${total} Performance Awards\x1b[0m\n`;

        // Parse org sections
        const orgBlocks = text.split(/\n  - name:\s*/);
        orgBlocks.shift();

        for (const ob of orgBlocks) {
          const orgName = ob.split('\n')[0].trim();
          if (orgName.startsWith('#')) continue;

          out += `\n  \x1b[36m${orgName}\x1b[0m\n`;

          const awardBlocks = ob.split(/- id:\s*/);
          awardBlocks.shift();

          for (const ab of awardBlocks) {
            const name = ab.match(/name:\s*(.+)/m)?.[1]?.trim() || '';
            const times = ab.match(/times:\s*(\d+)/m)?.[1] || '1';
            if (name) out += `  \x1b[33m\u2605\x1b[0m ${name.padEnd(30)} \u00D7${times}\n`;
          }
        }
        return out;
      },

      contact: async () => {
        const text = await fetchYaml('profile');
        const contactBlock = text.split(/- id:\s*contact/)[1];
        if (!contactBlock) return 'Contact data not available.';

        const email = contactBlock.match(/email:\s*(.+)/m)?.[1]?.trim() || '';
        const ghLabel = contactBlock.match(/github_label:\s*(.+)/m)?.[1]?.trim() || '';
        const liLabel = contactBlock.match(/linkedin_label:\s*(.+)/m)?.[1]?.trim() || '';
        const location = contactBlock.match(/location:\s*(.+)/m)?.[1]?.trim() || '';
        const tz = contactBlock.match(/timezone:\s*"?(.+?)"?\s*$/m)?.[1]?.trim() || '';

        let out = '\x1b[1mContact\x1b[0m\n';
        if (email) out += `  \x1b[36mEmail:\x1b[0m     ${email}\n`;
        if (ghLabel) out += `  \x1b[36mGitHub:\x1b[0m    ${ghLabel}\n`;
        if (liLabel) out += `  \x1b[36mLinkedIn:\x1b[0m  ${liLabel}\n`;
        if (location) out += `  \x1b[36mLocation:\x1b[0m  ${location}${tz ? ' (' + tz + ')' : ''}`;
        return out;
      },
    };

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
      'experience': 'experience',
      'education': 'education',
    };
    const appId = appMap[appName];
    if (!appId) return `open: unknown app "${appName}"\nAvailable: ai, projects, skills, activity, awards, resume, terminal, contact, experience, education`;
    import('../os/desktop.js').then(mod => mod.openApp(appId));
    return `Opening ${appName}...`;
  },

  echo: (args) => args.join(' '),
  clear: () => '__CLEAR__',

  sudo: (args) => {
    if (args.join(' ').toLowerCase() === 'hire tapas') {
      return `\x1b[32m
  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  \u2551                                          \u2551
  \u2551   Permission granted!                     \u2551
  \u2551                                          \u2551
  \u2551   Tapas has been added to your team.     \u2551
  \u2551   Expect great things.                   \u2551
  \u2551                                          \u2551
  \u2551   Contact: tapas.patra0406@gmail.com     \u2551
  \u2551                                          \u2551
  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d
\x1b[0m`;
    }
    return 'sudo: nice try ;)';
  },
};

function extractFoldedText(block) {
  const textIdx = block.indexOf('text: >');
  if (textIdx === -1) return '';
  const lines = [];
  const afterText = block.substring(textIdx).split('\n').slice(1);
  for (const tl of afterText) {
    if (tl.trim() === '') break;
    if (!tl.match(/^\s{6,}/)) break;
    lines.push(tl.trim());
  }
  return lines.join(' ');
}

export async function init(container) {
  injectStyles();

  try {
    const resp = await fetch('data.json?t=' + Date.now());
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
        cmdHistory.push(cmd);
        historyIndex = cmdHistory.length;
        executeCommand(cmd, output);
      }
      input.value = '';
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) { historyIndex--; input.value = cmdHistory[historyIndex]; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < cmdHistory.length - 1) { historyIndex++; input.value = cmdHistory[historyIndex]; }
      else { historyIndex = cmdHistory.length; input.value = ''; }
    }
  });

  container.addEventListener('click', () => input.focus());
}

async function executeCommand(cmd, output) {
  appendLine(output, `\x1b[32mtapas\x1b[0m@\x1b[36mtapasos\x1b[0m:~$ ${escapeHtml(cmd)}`);

  const parts = cmd.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  const fullCmd = parts.slice(0, 2).join(' ').toLowerCase();

  let result;
  if (COMMANDS[fullCmd]) {
    result = COMMANDS[fullCmd](parts.slice(2));
  } else if (COMMANDS[command]) {
    result = typeof COMMANDS[command] === 'function' ? COMMANDS[command](args) : COMMANDS[command];
  } else {
    result = `${command}: command not found. Type \x1b[36mhelp\x1b[0m for available commands.`;
  }

  // Await if async
  if (result && typeof result.then === 'function') {
    appendLine(output, '\x1b[33mloading...\x1b[0m');
    try {
      result = await result;
      // Remove the loading line
      output.lastChild.remove();
    } catch {
      output.lastChild.remove();
      result = '\x1b[33mFailed to fetch data.\x1b[0m';
    }
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
