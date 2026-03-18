// TapasOS Boot Sequence

import { playBoot } from './sounds.js';

const POST_LINES = [
  'TapasOS BIOS v2.0.26',
  'Copyright (c) 2026 Tapas Kumar Patra',
  '',
  'Initializing system memory... 16384 MB OK',
  'Detecting CPU... Tapas Neural Core @ 3.8 GHz',
  'PCI Express: 4 devices found',
  'GPU: Ambient Particle Accelerator v4',
  'Storage: Portfolio Data Store — 128 projects indexed',
  '',
  'Loading kernel modules...',
  '  [OK] desktop.js — Window Manager',
  '  [OK] menubar.js — System Menubar',
  '  [OK] ai-assistant.js — Tapas.ai Engine',
  '  [OK] rag-pipeline — Context Retrieval',
  '',
  'Mounting filesystems...',
  '  /portfolio    — GitHub Pages (static)',
  '  /data         — data.json (auto-synced)',
  '  /ai           — FastAPI Backend',
  '',
  'All systems nominal. Starting TapasOS...',
];

const PROGRESS_MESSAGES = [
  'Initializing kernel...',
  'Loading window manager...',
  'Starting AI engine...',
  'Connecting to backend...',
  'Mounting data store...',
  'Rendering desktop...',
  'Ready.',
];

export function runBoot() {
  return new Promise((resolve) => {
    // Session check — skip boot if already booted
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

    let skipped = false;

    // Failsafe — never let boot hang longer than 6 seconds
    setTimeout(() => { if (!skipped) finish(); }, 6000);

    function finish() {
      if (skipped) return;
      skipped = true;
      sessionStorage.setItem('tapasos-booted', '1');
      progressFill.style.width = '100%';
      progressLabel.textContent = 'Ready.';
      playBoot();
      bootScreen.classList.add('fade-out');
      setTimeout(() => {
        bootScreen.remove();
        resolve();
      }, 600);
    }

    // Show skip button after 1 second
    setTimeout(() => {
      if (!skipped) skipBtn.classList.add('visible');
    }, 1000);

    skipBtn.addEventListener('click', finish);

    // POST lines
    let lineIndex = 0;
    const lineInterval = 80;
    const totalPostTime = POST_LINES.length * lineInterval;

    function addLine() {
      if (lineIndex >= POST_LINES.length || skipped) return;
      const text = POST_LINES[lineIndex] || '\u00A0';
      const line = document.createElement('div');
      line.className = 'line';
      if (text.startsWith('  [OK]')) line.classList.add('line-ok');
      else if (lineIndex === 0) line.classList.add('line-header');
      line.textContent = text;
      line.style.animationDelay = '0ms';
      postEl.appendChild(line);
      postEl.scrollTop = postEl.scrollHeight;
      lineIndex++;
      if (lineIndex < POST_LINES.length) {
        setTimeout(addLine, lineInterval);
      }
    }

    addLine();

    // Progress bar
    let progress = 0;
    const progressSteps = PROGRESS_MESSAGES.length;
    const progressInterval = totalPostTime / progressSteps;

    function updateProgress(step) {
      if (skipped || step >= progressSteps) return;
      progress = ((step + 1) / progressSteps) * 100;
      progressFill.style.width = progress + '%';
      progressLabel.textContent = PROGRESS_MESSAGES[step];

      if (step + 1 < progressSteps) {
        setTimeout(() => updateProgress(step + 1), progressInterval);
      } else {
        // Boot complete
        setTimeout(finish, 400);
      }
    }

    setTimeout(() => updateProgress(0), 200);
  });
}
