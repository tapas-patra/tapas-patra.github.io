// TapasOS Lock Screen — triggers after inactivity, slide to unlock

import { playUnlock } from './sounds.js';

const LS_KEY = 'tapasos-lock-timeout';
const DEFAULT_TIMEOUT = 5; // minutes

let lockTimer = null;
let isLocked = false;
let clockInterval = null;

export function initLockScreen() {
  resetInactivityTimer();

  // Track user activity
  const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(evt => {
    document.addEventListener(evt, () => {
      if (!isLocked) resetInactivityTimer();
    }, { passive: true });
  });
}

export function getLockTimeout() {
  const stored = localStorage.getItem(LS_KEY);
  const val = stored ? parseInt(stored, 10) : DEFAULT_TIMEOUT;
  return (val > 0 && val <= 60) ? val : DEFAULT_TIMEOUT;
}

export function setLockTimeout(minutes) {
  localStorage.setItem(LS_KEY, String(Math.max(0, Math.min(60, minutes))));
  resetInactivityTimer();
}

export function lockNow() {
  showLockScreen();
}

function resetInactivityTimer() {
  clearTimeout(lockTimer);
  const timeout = getLockTimeout();
  if (timeout === 0) return; // 0 = disabled
  lockTimer = setTimeout(showLockScreen, timeout * 60 * 1000);
}

function showLockScreen() {
  if (isLocked) return;
  isLocked = true;
  clearTimeout(lockTimer);

  const overlay = document.createElement('div');
  overlay.id = 'lock-screen';

  overlay.innerHTML = `
    <div class="lock-bg"></div>
    <div class="lock-content">
      <div class="lock-clock">
        <div class="lock-time" id="lock-time"></div>
        <div class="lock-date" id="lock-date"></div>
      </div>
      <div class="lock-slider-wrap">
        <div class="lock-slider-track" id="lock-track">
          <div class="lock-slider-thumb" id="lock-thumb">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div class="lock-slider-label">slide to unlock</div>
          <div class="lock-slider-fill" id="lock-fill"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  updateLockClock();
  clockInterval = setInterval(updateLockClock, 1000);

  // Slide to unlock
  initSlider(overlay);
}

function updateLockClock() {
  const now = new Date();
  const timeEl = document.getElementById('lock-time');
  const dateEl = document.getElementById('lock-date');
  if (!timeEl || !dateEl) return;

  const hours = now.getHours();
  const mins = String(now.getMinutes()).padStart(2, '0');
  timeEl.textContent = `${hours}:${mins}`;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  dateEl.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

function initSlider(overlay) {
  const track = document.getElementById('lock-track');
  const thumb = document.getElementById('lock-thumb');
  const fill = document.getElementById('lock-fill');
  if (!track || !thumb) return;

  let dragging = false;
  let startX = 0;
  let thumbX = 0;
  let trackWidth = 0;
  const thumbSize = 52;

  function onStart(e) {
    dragging = true;
    startX = (e.touches ? e.touches[0].clientX : e.clientX);
    trackWidth = track.offsetWidth - thumbSize - 8; // 8 for padding
    thumb.style.transition = 'none';
    fill.style.transition = 'none';
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = clientX - startX;
    thumbX = Math.max(0, Math.min(dx, trackWidth));
    thumb.style.transform = `translateX(${thumbX}px)`;
    fill.style.width = `${thumbX + thumbSize}px`;

    // Fade out label as slider moves
    const progress = thumbX / trackWidth;
    const label = track.querySelector('.lock-slider-label');
    if (label) label.style.opacity = String(1 - progress * 1.5);
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;

    const progress = thumbX / trackWidth;

    if (progress > 0.75) {
      // Unlock
      thumb.style.transition = 'transform 0.2s ease';
      fill.style.transition = 'width 0.2s ease';
      thumb.style.transform = `translateX(${trackWidth}px)`;
      fill.style.width = `${trackWidth + thumbSize}px`;

      playUnlock();
      overlay.classList.add('unlocking');
      setTimeout(() => dismissLockScreen(overlay), 400);
    } else {
      // Snap back
      thumb.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
      fill.style.transition = 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
      thumb.style.transform = 'translateX(0)';
      fill.style.width = `${thumbSize}px`;

      const label = track.querySelector('.lock-slider-label');
      if (label) {
        label.style.transition = 'opacity 0.3s';
        label.style.opacity = '1';
      }
      thumbX = 0;
    }
  }

  // Mouse events
  thumb.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);

  // Touch events
  thumb.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);

  // Cleanup listeners when lock screen is removed
  overlay._cleanupSlider = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
  };
}

function dismissLockScreen(overlay) {
  isLocked = false;
  clearInterval(clockInterval);
  clockInterval = null;

  if (overlay._cleanupSlider) overlay._cleanupSlider();

  overlay.classList.remove('visible');
  setTimeout(() => overlay.remove(), 500);

  resetInactivityTimer();
}
