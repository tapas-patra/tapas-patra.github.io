// TapasOS Sound System — synthesized audio, autoplay-safe, mute toggle

const LS_KEY = 'tapasos-sound';
let ctx = null;
let unlocked = false;
let pendingQueue = []; // sounds queued before user interaction

// ── Public API ──

export function initSounds() {
  // Listen for first user interaction to unlock AudioContext
  const gestureEvents = ['click', 'keydown', 'touchstart'];
  const onGesture = () => {
    gestureEvents.forEach(e => document.removeEventListener(e, onGesture, true));
    unlockAudio();
  };
  gestureEvents.forEach(e => document.addEventListener(e, onGesture, { once: false, capture: true }));
}

export function isMuted() {
  return localStorage.getItem(LS_KEY) === 'muted';
}

export function setMuted(muted) {
  localStorage.setItem(LS_KEY, muted ? 'muted' : 'on');
}

export function toggleMute() {
  const m = !isMuted();
  setMuted(m);
  return m;
}

export function playBoot()         { enqueue(synthBoot); }
export function playNotification() { enqueue(synthNotification); }
export function playWindowOpen()   { enqueue(synthWindowOpen); }
export function playWindowClose()  { enqueue(synthWindowClose); }
export function playClick()        { enqueue(synthClick); }
export function playUnlock()       { enqueue(synthUnlock); }

// ── Audio Context Management ──

function getCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return null; }
  }
  return ctx;
}

function unlockAudio() {
  if (unlocked) return;
  const c = getCtx();
  if (!c) return;

  if (c.state === 'suspended') {
    c.resume().then(() => {
      unlocked = true;
      flushQueue();
    });
  } else {
    unlocked = true;
    flushQueue();
  }
}

function enqueue(synthFn) {
  if (isMuted()) return;

  if (unlocked && ctx && ctx.state === 'running') {
    synthFn(ctx);
  } else {
    pendingQueue.push(synthFn);
    // Try to unlock
    const c = getCtx();
    if (c && c.state === 'running') {
      unlocked = true;
      flushQueue();
    }
  }
}

function flushQueue() {
  if (!ctx || isMuted()) { pendingQueue = []; return; }
  const queue = pendingQueue.splice(0);
  queue.forEach(fn => fn(ctx));
}

// ── Synthesizers ──

function synthBoot(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.3;
  master.connect(ctx.destination);

  // Reverb
  const convolver = ctx.createConvolver();
  const len = ctx.sampleRate * 1.8;
  const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  }
  convolver.buffer = impulse;

  const dry = ctx.createGain(); dry.gain.value = 0.7;
  const wet = ctx.createGain(); wet.gain.value = 0.3;
  dry.connect(master);
  convolver.connect(wet);
  wet.connect(master);

  const now = ctx.currentTime;

  // E major ascending: E5 → G#5 → B5 → E6
  [
    { freq: 659.25, start: 0,    dur: 0.6  },
    { freq: 830.61, start: 0.15, dur: 0.55 },
    { freq: 987.77, start: 0.30, dur: 0.5  },
    { freq: 1318.5, start: 0.50, dur: 0.8  },
  ].forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
    const osc2 = ctx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.value = freq * 2;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now + start);
    env.gain.linearRampToValueAtTime(0.6, now + start + 0.04);
    env.gain.exponentialRampToValueAtTime(0.3, now + start + 0.15);
    env.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

    const env2 = ctx.createGain();
    env2.gain.setValueAtTime(0, now + start);
    env2.gain.linearRampToValueAtTime(0.12, now + start + 0.04);
    env2.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

    osc.connect(env); osc2.connect(env2);
    env.connect(dry); env.connect(convolver); env2.connect(dry);
    osc.start(now + start); osc.stop(now + start + dur + 0.1);
    osc2.start(now + start); osc2.stop(now + start + dur + 0.1);
  });

  // Sub bass
  const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = 164.81;
  const subEnv = ctx.createGain();
  subEnv.gain.setValueAtTime(0, now);
  subEnv.gain.linearRampToValueAtTime(0.15, now + 0.2);
  subEnv.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
  sub.connect(subEnv); subEnv.connect(dry);
  sub.start(now); sub.stop(now + 1.5);
}

function synthNotification(ctx) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.2;
  master.connect(ctx.destination);

  // Two-tone ping: C6 → E6 (bright, short)
  [
    { freq: 1046.5, start: 0,    dur: 0.15 },
    { freq: 1318.5, start: 0.08, dur: 0.2  },
  ].forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now + start);
    env.gain.linearRampToValueAtTime(0.5, now + start + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
    osc.connect(env); env.connect(master);
    osc.start(now + start); osc.stop(now + start + dur + 0.05);
  });
}

function synthWindowOpen(ctx) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.12;
  master.connect(ctx.destination);

  // Quick ascending whoosh: soft sine sweep
  const osc = ctx.createOscillator(); osc.type = 'sine';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.4, now + 0.02);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(env); env.connect(master);
  osc.start(now); osc.stop(now + 0.2);
}

function synthWindowClose(ctx) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.1;
  master.connect(ctx.destination);

  // Descending tone
  const osc = ctx.createOscillator(); osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(250, now + 0.1);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.3, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(env); env.connect(master);
  osc.start(now); osc.stop(now + 0.15);
}

function synthClick(ctx) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.08;
  master.connect(ctx.destination);

  // Tiny tick
  const osc = ctx.createOscillator(); osc.type = 'sine';
  osc.frequency.value = 1200;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.3, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  osc.connect(env); env.connect(master);
  osc.start(now); osc.stop(now + 0.05);
}

function synthUnlock(ctx) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.15;
  master.connect(ctx.destination);

  // Bright ascending two-note
  [
    { freq: 880, start: 0, dur: 0.12 },
    { freq: 1320, start: 0.06, dur: 0.18 },
  ].forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now + start);
    env.gain.linearRampToValueAtTime(0.4, now + start + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
    osc.connect(env); env.connect(master);
    osc.start(now + start); osc.stop(now + start + dur + 0.05);
  });
}
