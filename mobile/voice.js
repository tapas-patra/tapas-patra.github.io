// Mobile Voice Interface — orb, STT (3-tier), TTS with subtitle sync, reactive orb

const API_BASE = window.location.hostname === 'localhost' && window.location.port === '8000'
  ? 'http://localhost:8000'
  : 'https://portfolio-bot-5pwk.onrender.com';

const STARTER_PROMPTS = [
  "What are your skills?",
  "Tell me about a project",
  "Are you open to roles?",
];

let sttTier = 3; // 1=Web Speech, 2=whisper.js, 3=chat fallback
let recognition = null;
let isListening = false;
let isSpeaking = false;
let sessionHistory = [];
let ttsUtterances = [];

// Subtitle tracking
let subtitleWords = [];    // array of <span> elements
let wordCursor = 0;        // current word being spoken
let boundarySupported = null; // null=unknown, true/false after first utterance

// Orb reactive animation
let orbPulseTimer = null;
let orbVibrateId = null;
let vibrateIntensity = 0;  // 0 = gentle tremble, 1 = full voice kick

export function initVoice(container) {
  detectSTTTier();

  container.innerHTML = `
    <div class="voice-container" id="voice-container">
      <div class="voice-bg-canvas-wrap"><canvas id="voice-particles"></canvas></div>

      <div class="voice-content">
        <div class="voice-identity">
          <div class="voice-name">Tapas Kumar Patra</div>
          <div class="voice-title">SDET II at Setu by Pine Labs</div>
        </div>

        <div class="voice-orb-area">
          <div class="voice-status" id="voice-status">Tap to speak</div>
          <div class="voice-orb" id="voice-orb">
            <div class="voice-orb-inner" id="voice-orb-inner"></div>
            <div class="voice-orb-ring ring-1"></div>
            <div class="voice-orb-ring ring-2"></div>
            <div class="voice-orb-ring ring-3"></div>
          </div>
        </div>

        <div class="voice-transcript" id="voice-transcript">
          <div class="voice-transcript-in" id="voice-transcript-in"></div>
          <div class="voice-subtitle" id="voice-subtitle"></div>
        </div>

        <div class="voice-starters" id="voice-starters">
          ${STARTER_PROMPTS.map(p => `<button class="voice-starter-chip">${p}</button>`).join('')}
        </div>

        <div class="voice-tier-banner" id="voice-tier-banner" style="display:none;">
          Voice not available — switched to chat.
        </div>

        <div class="voice-quick-actions" id="voice-quick-actions">
          <button class="voice-action-btn" id="voice-open-chat">
            <span class="voice-action-icon">💬</span>
            <span>Chat</span>
          </button>
          <button class="voice-action-btn" id="voice-open-classic">
            <span class="voice-action-icon">🌐</span>
            <span>Classic View</span>
          </button>
        </div>
      </div>
    </div>
  `;

  injectStyles();
  bindEvents(container);
  initParticles();
  prewarmBackend();
}

// ── STT Tier Detection ──
function detectSTTTier() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    sttTier = 1;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
  } else {
    sttTier = 3;
  }
}

// ── Events ──
function bindEvents(container) {
  const orb = container.querySelector('#voice-orb');
  const starters = container.querySelector('#voice-starters');

  orb.addEventListener('click', () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  });

  starters.addEventListener('click', (e) => {
    const chip = e.target.closest('.voice-starter-chip');
    if (chip) {
      hideStarters();
      processQuery(chip.textContent);
    }
  });

  container.querySelector('#voice-open-chat')?.addEventListener('click', () => {
    const chatTab = document.querySelector('.mobile-nav-item[data-tab="chat"]');
    if (chatTab) chatTab.click();
  });

  container.querySelector('#voice-open-classic')?.addEventListener('click', () => {
    window.location.href = 'classic.html';
  });
}

// ── Listening ──
function startListening() {
  if (sttTier === 3) {
    document.getElementById('voice-tier-banner').style.display = 'block';
    return;
  }

  if (sttTier === 1 && recognition) {
    isListening = true;
    setOrbState('listening');
    setStatus('Listening...');
    hideStarters();

    let finalTranscript = '';

    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      showTranscriptIn(finalTranscript || interim);
    };

    recognition.onend = () => {
      isListening = false;
      if (finalTranscript.trim()) {
        processQuery(finalTranscript.trim());
      } else {
        setOrbState('idle');
        setStatus('Tap to speak');
      }
    };

    recognition.onerror = (e) => {
      isListening = false;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        sttTier = 3;
        document.getElementById('voice-tier-banner').style.display = 'block';
      }
      setOrbState('idle');
      setStatus('Tap to speak');
    };

    try {
      recognition.start();
    } catch {
      isListening = false;
      setOrbState('idle');
    }
  }
}

function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
  }
  isListening = false;
}

// ── Process Query ──
async function processQuery(text) {
  setOrbState('thinking');
  setStatus('Thinking...');
  showTranscriptIn(text);

  sessionHistory.push({ role: 'user', content: text });

  try {
    const resp = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: sessionHistory,
        session_id: getSessionId(),
      }),
    });

    if (!resp.ok) throw new Error('Server error');

    let fullText = '';
    const contentType = resp.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream')) {
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              fullText += parsed.token || parsed.content || '';
            } catch {
              fullText += data;
            }
          }
        }
      }
    } else {
      const data = await resp.json();
      fullText = data.response || data.content || '';
    }

    sessionHistory.push({ role: 'assistant', content: fullText });
    const cleanText = stripMarkdown(fullText);
    speakText(cleanText);
  } catch {
    showSubtitle("Sorry, I couldn't connect. Try again or use the chat.");
    setOrbState('idle');
    setStatus('Tap to speak');
  }
}

// ── TTS with subtitle sync + reactive orb ──
function speakText(text) {
  if (!('speechSynthesis' in window)) {
    showSubtitle(text);
    setOrbState('idle');
    setStatus('Tap to speak');
    return;
  }

  isSpeaking = true;
  setOrbState('speaking');
  setStatus('Speaking...');
  startVibrationLoop();

  // Build subtitle word spans
  const allWords = text.split(/\s+/).filter(w => w.length > 0);
  const subtitleEl = document.getElementById('voice-subtitle');
  subtitleEl.innerHTML = allWords.map((w, i) =>
    `<span class="sub-word" data-idx="${i}">${esc(w)} </span>`
  ).join('');
  subtitleEl.style.opacity = '1';
  subtitleWords = Array.from(subtitleEl.querySelectorAll('.sub-word'));
  wordCursor = 0;

  // Chunk into sentences
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

  window.speechSynthesis.cancel();
  ttsUtterances = [];

  // Pick best male voice
  const voices = window.speechSynthesis.getVoices();
  const maleNames = ['Male', 'Daniel', 'Aaron', 'Alex', 'David', 'Guy', 'James', 'Mark', 'Rishi'];
  const isMale = (v) => maleNames.some(n => v.name.includes(n));
  const preferred =
       voices.find(v => v.lang.startsWith('en') && isMale(v) && v.name.includes('Google'))
    || voices.find(v => v.lang.startsWith('en') && isMale(v))
    || voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
    || voices.find(v => v.lang.startsWith('en') && v.localService)
    || voices.find(v => v.lang.startsWith('en'))
    || null;

  // Track word ranges per sentence
  let sentenceWordStart = 0;

  sentences.forEach((sentence, i) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;
    const wordsInSentence = trimmed.split(/\s+/).filter(w => w.length > 0).length;
    const myStartIdx = sentenceWordStart;

    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.rate = 1.15;
    utterance.pitch = 0.95;
    if (preferred) utterance.voice = preferred;

    let sentenceBoundaryFired = false;

    // Word-by-word highlight via onboundary
    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        if (boundarySupported === null) boundarySupported = true;
        sentenceBoundaryFired = true;
        highlightWord(wordCursor);
        pulseOrb();
        wordCursor++;
      }
    };

    // Sentence-level fallback for browsers without onboundary
    utterance.onstart = () => {
      setTimeout(() => {
        if (!sentenceBoundaryFired && boundarySupported !== true) {
          boundarySupported = false;
          // Animate words one by one with estimated timing
          const avgWordDuration = (trimmed.length / wordsInSentence) * 55; // ~55ms per char
          for (let w = 0; w < wordsInSentence; w++) {
            setTimeout(() => {
              highlightWord(myStartIdx + w);
              pulseOrb();
            }, w * avgWordDuration);
          }
        }
      }, 150);
    };

    // Last sentence: clean up on end
    if (i === sentences.length - 1) {
      utterance.onend = () => {
        isSpeaking = false;
        // Mark all words as spoken
        subtitleWords.forEach(el => {
          el.classList.remove('sub-word-active');
          el.classList.add('sub-word-spoken');
        });
        resetOrbPulse();
        setOrbState('idle');
        setStatus('Tap to speak');
        fadeTranscripts();
      };
    }

    sentenceWordStart += wordsInSentence;
    ttsUtterances.push(utterance);
    window.speechSynthesis.speak(utterance);
  });
}

function highlightWord(idx) {
  if (idx < 0 || idx >= subtitleWords.length) return;

  // Remove active from previous words, mark as spoken
  subtitleWords.forEach((el, i) => {
    if (i < idx) {
      el.classList.remove('sub-word-active');
      el.classList.add('sub-word-spoken');
    } else if (i === idx) {
      el.classList.add('sub-word-active');
      el.classList.remove('sub-word-spoken');
    } else {
      el.classList.remove('sub-word-active', 'sub-word-spoken');
    }
  });

  // Auto-scroll to keep active word visible
  const subtitleEl = document.getElementById('voice-subtitle');
  const activeEl = subtitleWords[idx];
  if (subtitleEl && activeEl) {
    const containerRect = subtitleEl.getBoundingClientRect();
    const wordRect = activeEl.getBoundingClientRect();
    // If word is below the visible area or near bottom, scroll
    if (wordRect.top > containerRect.bottom - 20 || wordRect.bottom > containerRect.bottom) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

// ── Reactive Orb Animation ──

// Generate a random wavy border-radius
// spread: how wild the deformation is (0 = subtle, 1 = extreme)
function randBlob(spread = 0.5) {
  const base = 50;
  const range = 15 + spread * 25; // 15-40% deviation from circle
  const r = () => Math.floor(base - range + Math.random() * range * 2);
  return `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`;
}

// Continuous vibration loop — runs every frame while speaking
function startVibrationLoop() {
  if (orbVibrateId) return; // already running

  function vibrate() {
    if (!isSpeaking) { orbVibrateId = null; return; }

    const inner = document.getElementById('voice-orb-inner');
    const rings = document.querySelectorAll('.voice-orb-ring');
    if (!inner) { orbVibrateId = null; return; }

    // Decay intensity toward baseline tremble
    vibrateIntensity = Math.max(0, vibrateIntensity - 0.04);

    // Base tremble (always active) + intensity spike from word beats
    const tremble = 0.15 + vibrateIntensity * 0.85; // 0.15 baseline, up to 1.0

    // Core deformation
    const spread = tremble;
    const scale = 1 + tremble * 0.2;
    const glow = Math.floor(25 + tremble * 60);
    const rotate = (Math.random() - 0.5) * tremble * 6; // slight wobble rotation

    inner.style.borderRadius = randBlob(spread);
    inner.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
    inner.style.boxShadow = `0 0 ${glow}px rgba(0,229,255,${0.25 + tremble * 0.3}), 0 0 ${glow * 1.6}px rgba(124,58,237,${0.08 + tremble * 0.15})`;

    // Rings follow with dampened intensity
    rings.forEach((ring, i) => {
      const ringTremble = tremble * (0.7 - i * 0.15);
      const ringScale = 1 + ringTremble * 0.15;
      ring.style.borderRadius = randBlob(ringTremble);
      ring.style.transform = `scale(${ringScale})`;
      ring.style.opacity = `${0.2 + ringTremble * 0.4}`;
    });

    orbVibrateId = requestAnimationFrame(vibrate);
  }

  orbVibrateId = requestAnimationFrame(vibrate);
}

function stopVibrationLoop() {
  if (orbVibrateId) {
    cancelAnimationFrame(orbVibrateId);
    orbVibrateId = null;
  }
  vibrateIntensity = 0;
}

// Called on each word boundary — spikes the vibration intensity
function pulseOrb() {
  vibrateIntensity = 0.6 + Math.random() * 0.4; // spike to 0.6-1.0
  // Start loop if not already running
  if (!orbVibrateId && isSpeaking) startVibrationLoop();
}

function resetOrbPulse() {
  stopVibrationLoop();
  clearTimeout(orbPulseTimer);
  const inner = document.getElementById('voice-orb-inner');
  if (inner) {
    inner.style.transform = '';
    inner.style.boxShadow = '';
    inner.style.borderRadius = '';
  }
  document.querySelectorAll('.voice-orb-ring').forEach(ring => {
    ring.style.transform = '';
    ring.style.opacity = '';
    ring.style.borderRadius = '';
  });
}

function stopSpeaking() {
  window.speechSynthesis.cancel();
  isSpeaking = false;
  resetOrbPulse();
  setOrbState('idle');
  setStatus('Tap to speak');
  // Mark all spoken
  subtitleWords.forEach(el => {
    el.classList.remove('sub-word-active');
    el.classList.add('sub-word-spoken');
  });
}

// ── Orb States ──
function setOrbState(state) {
  const orb = document.getElementById('voice-orb');
  if (!orb) return;
  orb.className = 'voice-orb';
  orb.classList.add(`orb-${state}`);
}

function setStatus(text) {
  const el = document.getElementById('voice-status');
  if (el) el.textContent = text;
}

// ── Transcript ──
function showTranscriptIn(text) {
  const el = document.getElementById('voice-transcript-in');
  if (el) { el.textContent = text; el.style.opacity = '1'; }
}

function showSubtitle(text) {
  const el = document.getElementById('voice-subtitle');
  if (el) {
    el.textContent = text;
    el.style.opacity = '1';
  }
}

function fadeTranscripts() {
  setTimeout(() => {
    const inEl = document.getElementById('voice-transcript-in');
    const outEl = document.getElementById('voice-subtitle');
    if (inEl) inEl.style.opacity = '0';
    if (outEl) outEl.style.opacity = '0';
  }, 8000);
}

function hideStarters() {
  const el = document.getElementById('voice-starters');
  if (el) el.style.display = 'none';
}

// ── Markdown Stripping ──
function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/[-*_]{3,}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Helpers ──
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function getSessionId() {
  let id = sessionStorage.getItem('tapasos-session');
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('tapasos-session', id); }
  return id;
}

function prewarmBackend() {
  fetch(`${API_BASE}/health`).catch(() => {});
}

// ── Ambient Particles ──
function initParticles() {
  const canvas = document.getElementById('voice-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const particles = [];
  const COUNT = 30;

  function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.2 + 0.3,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Styles ──
function injectStyles() {
  if (document.getElementById('voice-styles')) return;
  const s = document.createElement('style');
  s.id = 'voice-styles';
  s.textContent = `
    .voice-container {
      position:fixed; inset:0; background:var(--bg-deep);
      display:flex; flex-direction:column; overflow:hidden;
      font-family:var(--font-body);
    }
    .voice-bg-canvas-wrap { position:absolute; inset:0; z-index:0; }
    #voice-particles { width:100%; height:100%; }

    .voice-content {
      position:relative; z-index:1; flex:1;
      display:flex; flex-direction:column; align-items:center;
      justify-content:center; padding:24px; gap:16px;
    }

    .voice-identity { text-align:center; margin-bottom:8px; }
    .voice-name { font-size:16px; font-weight:600; color:var(--text-primary); }
    .voice-title { font-size:12px; color:var(--text-muted); margin-top:2px; }

    /* Orb */
    .voice-orb-area { display:flex; flex-direction:column; align-items:center; gap:12px; }

    .voice-status {
      font-size:12px; color:var(--text-muted); font-family:var(--font-mono);
      letter-spacing:0.5px;
    }

    .voice-orb {
      width:120px; height:120px; border-radius:50%; position:relative;
      cursor:pointer; display:flex; align-items:center; justify-content:center;
      -webkit-tap-highlight-color:transparent;
    }

    .voice-orb-inner {
      width:80px; height:80px;
      border-radius:30% 70% 70% 30% / 30% 30% 70% 70%;
      background:radial-gradient(circle at 40% 40%, rgba(0,229,255,0.4), rgba(124,58,237,0.3));
      box-shadow:0 0 30px rgba(0,229,255,0.2), 0 0 60px rgba(124,58,237,0.1);
      transition:transform 0.12s ease-out, box-shadow 0.12s ease-out, border-radius 0.4s ease-in-out;
      animation:blobMorph 6s ease-in-out infinite;
    }

    @keyframes blobMorph {
      0%   { border-radius:30% 70% 70% 30% / 30% 30% 70% 70%; }
      25%  { border-radius:58% 42% 36% 64% / 43% 65% 35% 57%; }
      50%  { border-radius:40% 60% 54% 46% / 62% 36% 64% 38%; }
      75%  { border-radius:64% 36% 48% 52% / 35% 58% 42% 65%; }
      100% { border-radius:30% 70% 70% 30% / 30% 30% 70% 70%; }
    }

    .voice-orb-ring {
      position:absolute; border:1px solid rgba(0,229,255,0.15);
      transition:transform 0.12s ease-out, opacity 0.12s ease-out, border-radius 0.5s ease-in-out;
    }
    .ring-1 { width:100px; height:100px; top:10px; left:10px; animation:wavyRing1 7s ease-in-out infinite; }
    .ring-2 { width:110px; height:110px; top:5px; left:5px; opacity:0.5; animation:wavyRing2 8s ease-in-out infinite; }
    .ring-3 { width:120px; height:120px; top:0; left:0; opacity:0.3; animation:wavyRing3 9s ease-in-out infinite; }

    @keyframes wavyRing1 {
      0%   { border-radius:40% 60% 55% 45% / 55% 40% 60% 45%; }
      33%  { border-radius:55% 45% 40% 60% / 40% 60% 45% 55%; }
      66%  { border-radius:45% 55% 60% 40% / 60% 45% 55% 40%; }
      100% { border-radius:40% 60% 55% 45% / 55% 40% 60% 45%; }
    }
    @keyframes wavyRing2 {
      0%   { border-radius:55% 45% 42% 58% / 45% 58% 42% 55%; }
      33%  { border-radius:42% 58% 55% 45% / 58% 42% 55% 45%; }
      66%  { border-radius:58% 42% 45% 55% / 42% 55% 45% 58%; }
      100% { border-radius:55% 45% 42% 58% / 45% 58% 42% 55%; }
    }
    @keyframes wavyRing3 {
      0%   { border-radius:48% 52% 60% 40% / 52% 40% 60% 48%; }
      33%  { border-radius:60% 40% 48% 52% / 40% 52% 48% 60%; }
      66%  { border-radius:40% 60% 52% 48% / 60% 48% 52% 40%; }
      100% { border-radius:48% 52% 60% 40% / 52% 40% 60% 48%; }
    }

    /* Idle state — gentle pulse + blob morph */
    .orb-idle .voice-orb-inner {
      animation:blobMorph 6s ease-in-out infinite, orbPulse 3s ease-in-out infinite;
    }
    @keyframes orbPulse {
      0%,100% { transform:scale(1); box-shadow:0 0 30px rgba(0,229,255,0.2); }
      50% { transform:scale(1.05); box-shadow:0 0 50px rgba(0,229,255,0.35); }
    }

    /* Listening — expanded, fast wavy ripple */
    .orb-listening .voice-orb-inner {
      transform:scale(1.15);
      box-shadow:0 0 40px rgba(0,229,255,0.5), 0 0 80px rgba(0,229,255,0.2);
      animation:blobMorph 3s ease-in-out infinite;
    }
    .orb-listening .ring-1 { animation:wavyRipple 1.2s ease-out infinite; }
    .orb-listening .ring-2 { animation:wavyRipple 1.2s ease-out 0.3s infinite; }
    .orb-listening .ring-3 { animation:wavyRipple 1.2s ease-out 0.6s infinite; }
    @keyframes wavyRipple {
      0% { transform:scale(1); opacity:0.5; border-radius:40% 60% 55% 45% / 55% 40% 60% 45%; }
      50% { border-radius:55% 45% 40% 60% / 40% 60% 45% 55%; }
      100% { transform:scale(1.5); opacity:0; border-radius:45% 55% 60% 40% / 60% 45% 55% 40%; }
    }

    /* Thinking — different pulse color, faster morph */
    .orb-thinking .voice-orb-inner {
      animation:blobMorph 2s ease-in-out infinite, orbThink 1s ease-in-out infinite;
      background:radial-gradient(circle at 40% 40%, rgba(124,58,237,0.5), rgba(0,229,255,0.3));
    }
    @keyframes orbThink {
      0%,100% { transform:scale(1); }
      50% { transform:scale(1.08); }
    }

    /* Speaking — fully JS-driven vibration, disable CSS animations */
    .orb-speaking .voice-orb-inner {
      animation:none;
      transition:none;
    }
    .orb-speaking .voice-orb-ring {
      animation:none;
      transition:none;
    }

    /* Subtitle area */
    .voice-transcript {
      text-align:center; max-width:340px; width:100%;
      display:flex; flex-direction:column; gap:6px;
    }
    .voice-transcript-in {
      font-size:14px; color:var(--text-primary);
      opacity:0; transition:opacity 0.5s ease;
    }
    .voice-subtitle {
      font-size:14px; line-height:1.7; color:var(--text-dim);
      opacity:0; transition:opacity 0.5s ease;
      max-height:120px; overflow-y:auto; scroll-behavior:smooth;
      padding:4px 0;
      scrollbar-width:none;
    }
    .voice-subtitle::-webkit-scrollbar { display:none; }

    /* Word highlighting */
    .sub-word {
      transition:color 0.15s ease, text-shadow 0.15s ease;
      color:var(--text-dim);
    }
    .sub-word-active {
      color:var(--cyan);
      text-shadow:0 0 8px rgba(0,229,255,0.3);
    }
    .sub-word-spoken {
      color:var(--text-muted);
    }

    /* Starters */
    .voice-starters {
      display:flex; flex-wrap:wrap; gap:8px; justify-content:center;
      max-width:320px; margin-top:8px;
    }
    .voice-starter-chip {
      background:var(--glass); border:1px solid var(--glass-border);
      color:var(--text-primary); padding:8px 16px; border-radius:20px;
      font-size:13px; font-family:var(--font-body); cursor:pointer;
      transition:background 0.2s, border-color 0.2s;
      -webkit-tap-highlight-color:transparent;
    }
    .voice-starter-chip:active { background:var(--glass-hover); border-color:var(--cyan); }

    /* Tier banner */
    .voice-tier-banner {
      background:rgba(255,95,86,0.1); border:1px solid rgba(255,95,86,0.2);
      border-radius:8px; padding:8px 16px; font-size:12px;
      color:var(--text-muted); text-align:center; margin-top:12px;
    }

    /* Quick actions */
    .voice-quick-actions {
      display:flex; gap:12px; margin-top:16px; justify-content:center;
    }
    .voice-action-btn {
      display:flex; align-items:center; gap:6px;
      background:var(--glass); border:1px solid var(--glass-border);
      color:var(--text-primary); padding:10px 18px; border-radius:24px;
      font-size:13px; font-family:var(--font-body); cursor:pointer;
      transition:background 0.2s, border-color 0.2s, transform 0.15s;
      -webkit-tap-highlight-color:transparent;
    }
    .voice-action-btn:active {
      background:var(--glass-hover); border-color:var(--cyan);
      transform:scale(0.96);
    }
    .voice-action-icon { font-size:16px; }
  `;
  document.head.appendChild(s);
}
