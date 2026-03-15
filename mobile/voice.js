// Mobile Voice Interface — orb, STT (3-tier), TTS, transcript

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://tapasos-api.onrender.com';

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
let audioCtx = null;
let analyser = null;
let orbAnimId = null;

export function initVoice(container) {
  detectSTTTier();

  container.innerHTML = `
    <div class="voice-container" id="voice-container">
      <div class="voice-bg-canvas-wrap"><canvas id="voice-particles"></canvas></div>

      <div class="voice-content">
        <div class="voice-identity">
          <div class="voice-name">Tapas Kumar Patra</div>
          <div class="voice-title">Senior Software Engineer</div>
        </div>

        <div class="voice-orb-area">
          <div class="voice-status" id="voice-status">Tap to speak</div>
          <div class="voice-orb" id="voice-orb">
            <div class="voice-orb-inner"></div>
            <div class="voice-orb-ring ring-1"></div>
            <div class="voice-orb-ring ring-2"></div>
            <div class="voice-orb-ring ring-3"></div>
          </div>
        </div>

        <div class="voice-transcript" id="voice-transcript">
          <div class="voice-transcript-in" id="voice-transcript-in"></div>
          <div class="voice-transcript-out" id="voice-transcript-out"></div>
        </div>

        <div class="voice-starters" id="voice-starters">
          ${STARTER_PROMPTS.map(p => `<button class="voice-starter-chip">${p}</button>`).join('')}
        </div>

        <div class="voice-tier-banner" id="voice-tier-banner" style="display:none;">
          Voice not available — switched to chat.
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
    // Tier 2 (whisper.js) would be loaded lazily on first tap
    // For now, fall to tier 3 (chat) since whisper.js is a large dependency
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
}

// ── Listening ──
function startListening() {
  if (sttTier === 3) {
    // No voice — show banner, switch to chat nav
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
    showTranscriptOut(fullText);
    speakText(fullText);
  } catch {
    showTranscriptOut("Sorry, I couldn't connect. Try again or use the chat.");
    setOrbState('idle');
    setStatus('Tap to speak');
  }
}

// ── TTS ──
function speakText(text) {
  if (!('speechSynthesis' in window)) {
    setOrbState('idle');
    setStatus('Tap to speak');
    return;
  }

  isSpeaking = true;
  setOrbState('speaking');
  setStatus('Speaking...');

  // Chunk into sentences for faster perceived start
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

  window.speechSynthesis.cancel();
  ttsUtterances = [];

  // Pick best voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
    || voices.find(v => v.lang.startsWith('en') && v.localService)
    || voices.find(v => v.lang.startsWith('en'))
    || null;

  sentences.forEach((sentence, i) => {
    const utterance = new SpeechSynthesisUtterance(sentence.trim());
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    if (preferred) utterance.voice = preferred;

    if (i === sentences.length - 1) {
      utterance.onend = () => {
        isSpeaking = false;
        setOrbState('idle');
        setStatus('Tap to speak');
        fadeTranscripts();
      };
    }

    ttsUtterances.push(utterance);
    window.speechSynthesis.speak(utterance);
  });
}

function stopSpeaking() {
  window.speechSynthesis.cancel();
  isSpeaking = false;
  setOrbState('idle');
  setStatus('Tap to speak');
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

function showTranscriptOut(text) {
  const el = document.getElementById('voice-transcript-out');
  if (el) {
    // Truncate for display
    el.textContent = text.length > 200 ? text.slice(0, 200) + '...' : text;
    el.style.opacity = '1';
  }
}

function fadeTranscripts() {
  setTimeout(() => {
    const inEl = document.getElementById('voice-transcript-in');
    const outEl = document.getElementById('voice-transcript-out');
    if (inEl) inEl.style.opacity = '0';
    if (outEl) outEl.style.opacity = '0';
  }, 8000);
}

function hideStarters() {
  const el = document.getElementById('voice-starters');
  if (el) el.style.display = 'none';
}

// ── Helpers ──
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
      width:80px; height:80px; border-radius:50%;
      background:radial-gradient(circle at 40% 40%, rgba(0,229,255,0.4), rgba(124,58,237,0.3));
      box-shadow:0 0 30px rgba(0,229,255,0.2), 0 0 60px rgba(124,58,237,0.1);
      transition:transform 0.3s ease, box-shadow 0.3s ease;
    }

    .voice-orb-ring {
      position:absolute; border-radius:50%; border:1px solid rgba(0,229,255,0.15);
      transition:transform 0.3s ease, opacity 0.3s ease;
    }
    .ring-1 { width:100px; height:100px; top:10px; left:10px; }
    .ring-2 { width:110px; height:110px; top:5px; left:5px; opacity:0.5; }
    .ring-3 { width:120px; height:120px; top:0; left:0; opacity:0.3; }

    /* Idle state — gentle pulse */
    .orb-idle .voice-orb-inner {
      animation:orbPulse 3s ease-in-out infinite;
    }
    @keyframes orbPulse {
      0%,100% { transform:scale(1); box-shadow:0 0 30px rgba(0,229,255,0.2); }
      50% { transform:scale(1.05); box-shadow:0 0 50px rgba(0,229,255,0.35); }
    }

    /* Listening — expanded, fast ripple */
    .orb-listening .voice-orb-inner {
      transform:scale(1.15);
      box-shadow:0 0 40px rgba(0,229,255,0.5), 0 0 80px rgba(0,229,255,0.2);
    }
    .orb-listening .ring-1 { animation:ripple 1.2s ease-out infinite; }
    .orb-listening .ring-2 { animation:ripple 1.2s ease-out 0.3s infinite; }
    .orb-listening .ring-3 { animation:ripple 1.2s ease-out 0.6s infinite; }
    @keyframes ripple {
      0% { transform:scale(1); opacity:0.5; }
      100% { transform:scale(1.5); opacity:0; }
    }

    /* Thinking — different pulse color */
    .orb-thinking .voice-orb-inner {
      animation:orbThink 1s ease-in-out infinite;
      background:radial-gradient(circle at 40% 40%, rgba(124,58,237,0.5), rgba(0,229,255,0.3));
    }
    @keyframes orbThink {
      0%,100% { transform:scale(1); }
      50% { transform:scale(1.08); }
    }

    /* Speaking — waveform-like animation */
    .orb-speaking .voice-orb-inner {
      box-shadow:0 0 50px rgba(0,229,255,0.5), 0 0 100px rgba(124,58,237,0.2);
    }
    .orb-speaking .ring-1 { animation:speakRing 0.6s ease-in-out infinite alternate; }
    .orb-speaking .ring-2 { animation:speakRing 0.6s ease-in-out 0.15s infinite alternate; }
    .orb-speaking .ring-3 { animation:speakRing 0.6s ease-in-out 0.3s infinite alternate; }
    @keyframes speakRing {
      0% { transform:scale(1); opacity:0.4; }
      100% { transform:scale(1.2); opacity:0.15; }
    }

    /* Transcript */
    .voice-transcript { text-align:center; min-height:60px; max-width:320px; }
    .voice-transcript-in {
      font-size:14px; color:var(--text-primary); margin-bottom:6px;
      opacity:0; transition:opacity 0.5s ease;
    }
    .voice-transcript-out {
      font-size:13px; color:var(--text-muted); line-height:1.5;
      opacity:0; transition:opacity 0.5s ease;
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
  `;
  document.head.appendChild(s);
}
