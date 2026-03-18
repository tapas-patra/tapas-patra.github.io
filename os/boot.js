// TapasOS Boot Sequence

// ── Boot Chime — synthesized signature sound ──

function playBootChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain
    const master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);

    // Reverb — convolver with synthetic impulse
    const convolver = ctx.createConvolver();
    const reverbLen = ctx.sampleRate * 1.8;
    const impulse = ctx.createBuffer(2, reverbLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < reverbLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLen, 2.5);
      }
    }
    convolver.buffer = impulse;

    // Dry/wet mix
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    dryGain.gain.value = 0.7;
    wetGain.gain.value = 0.3;
    dryGain.connect(master);
    convolver.connect(wetGain);
    wetGain.connect(master);

    const now = ctx.currentTime;

    // The TapasOS chime — 4 notes: E5 → G#5 → B5 → E6
    // Ascending major triad + octave = bright, confident, memorable
    const notes = [
      { freq: 659.25, start: 0,    dur: 0.6  },  // E5
      { freq: 830.61, start: 0.15, dur: 0.55 },  // G#5
      { freq: 987.77, start: 0.30, dur: 0.5  },  // B5
      { freq: 1318.5, start: 0.50, dur: 0.8  },  // E6 — lingers
    ];

    notes.forEach(({ freq, start, dur }) => {
      // Primary sine tone
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = freq;

      // Soft triangle harmonic (one octave up, very quiet)
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 2;

      // Envelope
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now + start);
      env.gain.linearRampToValueAtTime(0.6, now + start + 0.04);    // attack
      env.gain.exponentialRampToValueAtTime(0.3, now + start + 0.15); // decay
      env.gain.exponentialRampToValueAtTime(0.001, now + start + dur); // release

      // Harmonic envelope (quieter)
      const env2 = ctx.createGain();
      env2.gain.setValueAtTime(0, now + start);
      env2.gain.linearRampToValueAtTime(0.12, now + start + 0.04);
      env2.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc1.connect(env);
      osc2.connect(env2);
      env.connect(dryGain);
      env.connect(convolver);
      env2.connect(dryGain);

      osc1.start(now + start);
      osc1.stop(now + start + dur + 0.1);
      osc2.start(now + start);
      osc2.stop(now + start + dur + 0.1);
    });

    // Sub bass pad — warm foundation under the chime
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 164.81; // E3
    const subEnv = ctx.createGain();
    subEnv.gain.setValueAtTime(0, now);
    subEnv.gain.linearRampToValueAtTime(0.15, now + 0.2);
    subEnv.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    sub.connect(subEnv);
    subEnv.connect(dryGain);
    sub.start(now);
    sub.stop(now + 1.5);

    // Cleanup
    setTimeout(() => ctx.close(), 3000);
  } catch {
    // Audio not supported — silent boot
  }
}

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

export { playBootChime };

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
      playBootChime();
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
