// TapasOS Menubar

let clockInterval = null;

export function initMenubar() {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
  updateGithubDot();
}

function updateClock() {
  const el = document.querySelector('.menubar-clock');
  if (!el) return;
  const now = new Date();
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const day = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  el.textContent = `${day}  ${h12}:${m}:${s} ${ampm}`;
}

function updateGithubDot() {
  // Will check data.json for committed_today when available
  // For now, fetch data.json if it exists
  fetch('data.json')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data?.github?.committed_today) {
        const dot = document.querySelector('.menubar-github-dot');
        if (dot) dot.classList.add('active');
      }
    })
    .catch(() => {});
}

export function setActiveAppName(name) {
  const el = document.querySelector('.menubar-app-name');
  if (el) el.textContent = name || '';
}
