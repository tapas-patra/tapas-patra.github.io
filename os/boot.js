// TapasOS Boot Sequence — real system detection + BIOS-style POST

import { playBoot, ensureAudioUnlocked } from './sounds.js';

// ── Detect real system info ──

function detectBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return 'Mozilla Firefox ' + ua.split('Firefox/')[1].split(' ')[0];
  if (ua.includes('Edg/')) return 'Microsoft Edge ' + ua.split('Edg/')[1].split(' ')[0];
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera ' + (ua.split('OPR/')[1] || ua.split('Opera/')[1]).split(' ')[0];
  if (ua.includes('Chrome/')) return 'Google Chrome ' + ua.split('Chrome/')[1].split(' ')[0];
  if (ua.includes('Safari/') && ua.includes('Version/')) return 'Apple Safari ' + ua.split('Version/')[1].split(' ')[0];
  return 'Unknown Browser';
}

function detectOS() {
  const ua = navigator.userAgent;
  if (ua.includes('Mac OS X')) {
    const ver = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    return 'macOS ' + (ver ? ver[1].replace(/_/g, '.') : '');
  }
  if (ua.includes('Windows NT')) {
    const map = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
    const ver = ua.match(/Windows NT (\d+\.\d+)/);
    return 'Windows ' + (ver ? (map[ver[1]] || ver[1]) : '');
  }
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return navigator.platform || 'Unknown OS';
}

function detectMemory() {
  if (navigator.deviceMemory) return navigator.deviceMemory * 1024 + ' MB';
  return 'N/A';
}

function detectNetwork() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return null;
  const type = conn.effectiveType || conn.type;
  const downlink = conn.downlink ? ` @ ${conn.downlink} Mbps` : '';
  return (type || 'unknown').toUpperCase() + downlink;
}

function buildPostLines() {
  const cpuCores = navigator.hardwareConcurrency || 'N/A';
  const memory = detectMemory();
  const screenRes = `${screen.width} x ${screen.height}`;
  const dpr = window.devicePixelRatio || 1;
  const colorDepth = screen.colorDepth + '-bit';
  const browser = detectBrowser();
  const os = detectOS();
  const lang = navigator.language || 'en-US';
  const network = detectNetwork();
  const swSupport = 'serviceWorker' in navigator;
  const lsAvail = (() => { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return true; } catch { return false; } })();
  const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const online = navigator.onLine;

  const lines = [
    { text: 'TapasOS BIOS v3.0.26', type: 'header' },
    { text: 'Copyright (c) 2026 Tapas Kumar Patra. All rights reserved.' },
    { text: '' },
    { text: `Host Platform: ${os}` },
    { text: `Renderer: ${browser}` },
    { text: `CPU Threads: ${cpuCores}` },
    { text: `System Memory: ${memory}` },
    { text: `Display: ${screenRes} @ ${dpr}x (${colorDepth})` },
    { text: `Locale: ${lang}` },
    { text: `Color Scheme: ${darkMode ? 'Dark' : 'Light'}` },
    { text: `Input: ${touchSupport ? 'Touch + Pointer' : 'Pointer'}` },
  ];

  if (network) lines.push({ text: `Network: ${network}` });
  lines.push({ text: `Status: ${online ? 'Online' : 'Offline'}` });

  lines.push({ text: '' });
  lines.push({ text: 'Running system checks...' });
  lines.push({ text: `  [${lsAvail ? 'OK' : 'FAIL'}] localStorage — User Preferences`, type: lsAvail ? 'ok' : 'fail' });
  lines.push({ text: `  [${swSupport ? 'OK' : '--'}] Service Worker — Offline Cache`, type: swSupport ? 'ok' : 'dim' });
  lines.push({ text: '  [OK] theme.css — UI Theme Engine', type: 'ok' });
  lines.push({ text: '  [OK] desktop.js — Window Manager', type: 'ok' });
  lines.push({ text: '  [OK] menubar.js — System Menubar', type: 'ok' });
  lines.push({ text: '  [OK] sounds.js — Audio Engine', type: 'ok' });
  lines.push({ text: '  [OK] ai-assistant.js — Tapas.ai (RAG)', type: 'ok' });

  lines.push({ text: '' });
  lines.push({ text: 'All systems nominal.' });

  return lines;
}

const PROGRESS_MESSAGES = [
  'Initializing kernel...',
  'Loading window manager...',
  'Mounting data store...',
  'Starting AI engine...',
  'Rendering desktop...',
  'Ready.',
];

export function runBoot() {
  return new Promise((resolve) => {
    // Session check — skip boot if already booted this session
    if (sessionStorage.getItem('tapasos-booted')) {
      const bootScreen = document.getElementById('boot-screen');
      if (bootScreen) bootScreen.remove();
      return resolve();
    }

    const postEl = document.getElementById('boot-post');
    const progressFill = document.getElementById('boot-progress-fill');
    const progressLabel = document.getElementById('boot-progress-label');
    const skipBtn = document.getElementById('boot-skip');
    const bootScreen = document.getElementById('boot-screen');
    const progressContainer = document.getElementById('boot-progress-container');

    // Hide progress bar initially — show only after user triggers boot
    progressContainer.style.opacity = '0';

    let done = false;
    let waitingForKey = false;

    // ── Phase 2: Boot (after keypress) — progress bar + chime ──

    async function startBoot() {
      if (done) return;
      done = true;
      skipBtn.style.display = 'none';

      // Unlock audio from user gesture
      await ensureAudioUnlocked();

      // Show progress bar
      progressContainer.style.transition = 'opacity 0.3s ease';
      progressContainer.style.opacity = '1';

      // Animate progress
      let step = 0;
      const interval = 280;

      function tick() {
        if (step >= PROGRESS_MESSAGES.length) {
          // Boot complete
          sessionStorage.setItem('tapasos-booted', '1');
          playBoot();
          bootScreen.classList.add('fade-out');
          setTimeout(() => {
            bootScreen.remove();
            resolve();
          }, 600);
          return;
        }

        const pct = ((step + 1) / PROGRESS_MESSAGES.length) * 100;
        progressFill.style.width = pct + '%';
        progressLabel.textContent = PROGRESS_MESSAGES[step];
        step++;
        setTimeout(tick, interval);
      }

      tick();
    }

    // ── Phase 1: BIOS POST — real system info ──

    const POST_LINES = buildPostLines();
    let lineIndex = 0;
    const lineInterval = 70;

    function addLine() {
      if (lineIndex >= POST_LINES.length || done) return;

      const entry = POST_LINES[lineIndex];
      const text = entry.text || '\u00A0';
      const line = document.createElement('div');
      line.className = 'line';

      if (entry.type === 'header') line.classList.add('line-header');
      else if (entry.type === 'ok') line.classList.add('line-ok');
      else if (entry.type === 'fail') line.classList.add('line-fail');
      else if (entry.type === 'dim') line.classList.add('line-dim');

      line.textContent = text;
      line.style.animationDelay = '0ms';
      postEl.appendChild(line);
      postEl.scrollTop = postEl.scrollHeight;
      lineIndex++;

      if (lineIndex < POST_LINES.length) {
        setTimeout(addLine, lineInterval);
      } else {
        // POST done — show "Press any key" prompt
        setTimeout(showKeyPrompt, 300);
      }
    }

    function showKeyPrompt() {
      if (done) return;
      waitingForKey = true;

      const prompt = document.createElement('div');
      prompt.className = 'line line-prompt';
      prompt.textContent = 'Press any key to boot TapasOS...';
      postEl.appendChild(prompt);
      postEl.scrollTop = postEl.scrollHeight;

      // Listen for any keypress or click
      const onInteract = () => {
        document.removeEventListener('keydown', onInteract);
        bootScreen.removeEventListener('click', onInteract);
        startBoot();
      };
      document.addEventListener('keydown', onInteract);
      bootScreen.addEventListener('click', onInteract);
    }

    // Show skip button after 1 second (skip bypasses POST, goes straight to boot)
    setTimeout(() => {
      if (!done) skipBtn.classList.add('visible');
    }, 1000);

    skipBtn.addEventListener('click', () => {
      if (!done) startBoot();
    });

    // Failsafe — if nothing happens for 10s, show the prompt
    setTimeout(() => {
      if (!done && !waitingForKey) showKeyPrompt();
    }, 10000);

    // Start POST
    addLine();
  });
}
