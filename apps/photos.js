// Photos.app — Gallery of project screenshots and award images with lightbox

const ALBUMS = [
  {
    id: 'all',
    name: 'All Photos',
    icon: '\uD83D\uDDBC\uFE0F',
  },
  {
    id: 'projects',
    name: 'Projects',
    icon: '\uD83D\uDCC2',
  },
  {
    id: 'awards',
    name: 'Awards',
    icon: '\uD83C\uDFC6',
  },
  {
    id: 'profile',
    name: 'Profile',
    icon: '\uD83D\uDC64',
  },
];

const PHOTOS = [
  // Projects
  { id: 'p1', src: 'images/ai-chatbot.png', title: 'Tapas.ai — RAG Chatbot', desc: 'AI chatbot interface powered by RAG pipeline with SSE streaming', album: 'projects' },
  { id: 'p2', src: 'images/project1.png', title: 'Project Screenshot 1', desc: 'Portfolio project showcase', album: 'projects' },
  { id: 'p3', src: 'images/project2.png', title: 'Project Screenshot 2', desc: 'Application interface design', album: 'projects' },
  { id: 'p4', src: 'images/project3.png', title: 'Project Screenshot 3', desc: 'Dashboard and analytics view', album: 'projects' },
  { id: 'p5', src: 'images/project4.png', title: 'Project Screenshot 4', desc: 'Development workflow tool', album: 'projects' },
  { id: 'p6', src: 'images/project5.png', title: 'Project Screenshot 5', desc: 'Technical implementation view', album: 'projects' },
  { id: 'p7', src: 'images/pocketpad.png', title: 'PocketPad', desc: 'Lightweight note-taking application', album: 'projects' },

  // Awards
  { id: 'a1', src: 'images/awards/extraordinary.png', title: 'Extraordinary Award', desc: 'Recognition for exceptional performance at Wipro Technologies', album: 'awards' },
  { id: 'a2', src: 'images/awards/rookie-rockstar.png', title: 'Rookie Rockstar', desc: 'Outstanding new joiner award', album: 'awards' },
  { id: 'a3', src: 'images/awards/beyond_call_of_duty.png', title: 'Beyond Call of Duty', desc: 'Going above and beyond expectations', album: 'awards' },
  { id: 'a4', src: 'images/awards/always_communicating.png', title: 'Always Communicating', desc: 'Excellent communication and collaboration', album: 'awards' },
  { id: 'a5', src: 'images/awards/being_responsive.png', title: 'Being Responsive', desc: 'Consistent responsiveness and reliability', album: 'awards' },
  { id: 'a6', src: 'images/awards/inspiring.png', title: 'Inspiring', desc: 'Inspiring leadership and mentorship', album: 'awards' },
  { id: 'a7', src: 'images/awards/demonstrating_stewardship.png', title: 'Demonstrating Stewardship', desc: 'Ownership and accountability excellence', album: 'awards' },
  { id: 'a8', src: 'images/awards/victory_league.png', title: 'Victory League', desc: 'Team victory and collaboration achievement', album: 'awards' },

  // Profile
  { id: 'pr1', src: 'images/me.png', title: 'Tapas Kumar Patra', desc: 'SDET II at Setu by Pine Labs', album: 'profile' },
  { id: 'pr2', src: 'images/about_me.jpg', title: 'About Me', desc: 'Developer, engineer, and tech enthusiast', album: 'profile' },
];

let container = null;
let activeAlbum = 'all';

export async function init(el) {
  container = el;
  injectStyles();
  render();
}

function render() {
  const filtered = activeAlbum === 'all' ? PHOTOS : PHOTOS.filter(p => p.album === activeAlbum);
  const albumInfo = ALBUMS.find(a => a.id === activeAlbum);

  container.innerHTML = `
    <div class="photos-app">
      <div class="photos-sidebar">
        <div class="photos-sidebar-title">Photos</div>
        ${ALBUMS.map(a => `
          <div class="photos-album-item ${a.id === activeAlbum ? 'active' : ''}" data-album="${a.id}">
            <span>${a.icon}</span>
            <span>${a.name}</span>
            <span class="photos-album-count">${a.id === 'all' ? PHOTOS.length : PHOTOS.filter(p => p.album === a.id).length}</span>
          </div>
        `).join('')}
      </div>
      <div class="photos-main">
        <div class="photos-toolbar">
          <div class="photos-toolbar-title">${albumInfo?.icon || ''} ${albumInfo?.name || 'Photos'}</div>
          <div class="photos-toolbar-count">${filtered.length} photo${filtered.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="photos-grid">
          ${filtered.map(photo => `
            <div class="photos-thumb" data-id="${photo.id}">
              <img src="${photo.src}" alt="${esc(photo.title)}" loading="lazy">
              <div class="photos-thumb-overlay">
                <div class="photos-thumb-title">${esc(photo.title)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  // Album selection
  container.querySelectorAll('.photos-album-item').forEach(el => {
    el.addEventListener('click', () => {
      activeAlbum = el.dataset.album;
      render();
    });
  });

  // Photo click → lightbox
  container.querySelectorAll('.photos-thumb').forEach(el => {
    el.addEventListener('click', () => {
      const photo = PHOTOS.find(p => p.id === el.dataset.id);
      if (photo) openLightbox(photo);
    });
  });
}

function openLightbox(photo) {
  const filtered = activeAlbum === 'all' ? PHOTOS : PHOTOS.filter(p => p.album === activeAlbum);
  let currentIdx = filtered.indexOf(photo);

  const overlay = document.createElement('div');
  overlay.className = 'photos-lightbox';

  function renderLightbox() {
    const current = filtered[currentIdx];
    overlay.innerHTML = `
      <div class="photos-lb-backdrop"></div>
      <button class="photos-lb-close">&times;</button>
      ${filtered.length > 1 ? `
        <button class="photos-lb-nav photos-lb-prev">\u2039</button>
        <button class="photos-lb-nav photos-lb-next">\u203A</button>
      ` : ''}
      <div class="photos-lb-content">
        <img src="${current.src}" alt="${esc(current.title)}" class="photos-lb-img">
        <div class="photos-lb-info">
          <div class="photos-lb-title">${esc(current.title)}</div>
          <div class="photos-lb-desc">${esc(current.desc)}</div>
          <div class="photos-lb-meta">${currentIdx + 1} of ${filtered.length}</div>
        </div>
      </div>
    `;

    // Bind lightbox events
    overlay.querySelector('.photos-lb-close').addEventListener('click', closeLb);
    overlay.querySelector('.photos-lb-backdrop').addEventListener('click', closeLb);

    const prev = overlay.querySelector('.photos-lb-prev');
    const next = overlay.querySelector('.photos-lb-next');
    if (prev) prev.addEventListener('click', () => { currentIdx = (currentIdx - 1 + filtered.length) % filtered.length; renderLightbox(); });
    if (next) next.addEventListener('click', () => { currentIdx = (currentIdx + 1) % filtered.length; renderLightbox(); });
  }

  function closeLb() {
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => overlay.remove(), 200);
  }

  function onKey(e) {
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') { currentIdx = (currentIdx - 1 + filtered.length) % filtered.length; renderLightbox(); }
    if (e.key === 'ArrowRight') { currentIdx = (currentIdx + 1) % filtered.length; renderLightbox(); }
  }

  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
  renderLightbox();
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function injectStyles() {
  if (document.getElementById('photos-styles')) return;
  const style = document.createElement('style');
  style.id = 'photos-styles';
  style.textContent = `
    .photos-app {
      display: flex;
      height: 100%;
      font-family: var(--font-body);
    }

    .photos-sidebar {
      width: 180px;
      flex-shrink: 0;
      background: rgba(0,0,0,0.2);
      border-right: 1px solid rgba(255,255,255,0.06);
      padding: 12px 6px;
    }

    .photos-sidebar-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      padding: 0 8px 10px;
    }

    .photos-album-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 7px;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 12px;
      transition: background 0.12s, color 0.12s;
    }

    .photos-album-item:hover {
      background: rgba(255,255,255,0.05);
    }

    .photos-album-item.active {
      background: rgba(0, 229, 255, 0.1);
      color: var(--cyan);
    }

    .photos-album-count {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
    }

    .photos-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .photos-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .photos-toolbar-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .photos-toolbar-count {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
    }

    .photos-grid {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
      align-content: start;
    }

    .photos-thumb {
      position: relative;
      aspect-ratio: 4/3;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .photos-thumb:hover {
      transform: scale(1.03);
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }

    .photos-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .photos-thumb-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20px 8px 6px;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
      opacity: 0;
      transition: opacity 0.15s;
    }

    .photos-thumb:hover .photos-thumb-overlay {
      opacity: 1;
    }

    .photos-thumb-title {
      font-size: 10px;
      font-weight: 500;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Lightbox */
    .photos-lightbox {
      position: fixed;
      inset: 0;
      z-index: 30000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .photos-lightbox.visible {
      opacity: 1;
    }

    .photos-lb-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .photos-lb-close {
      position: absolute;
      top: 16px;
      right: 20px;
      z-index: 2;
      background: none;
      border: none;
      color: rgba(255,255,255,0.7);
      font-size: 28px;
      cursor: pointer;
      transition: color 0.15s;
      line-height: 1;
    }

    .photos-lb-close:hover {
      color: #fff;
    }

    .photos-lb-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 2;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.8);
      font-size: 28px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }

    .photos-lb-nav:hover {
      background: rgba(255,255,255,0.15);
    }

    .photos-lb-prev { left: 16px; }
    .photos-lb-next { right: 16px; }

    .photos-lb-content {
      position: relative;
      z-index: 1;
      max-width: 80vw;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .photos-lb-img {
      max-width: 100%;
      max-height: 65vh;
      border-radius: 8px;
      object-fit: contain;
      box-shadow: 0 8px 40px rgba(0,0,0,0.5);
    }

    .photos-lb-info {
      text-align: center;
      margin-top: 16px;
    }

    .photos-lb-title {
      font-family: var(--font-body);
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 4px;
    }

    .photos-lb-desc {
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      margin-bottom: 4px;
    }

    .photos-lb-meta {
      font-family: var(--font-mono);
      font-size: 10px;
      color: rgba(255,255,255,0.35);
    }
  `;
  document.head.appendChild(style);
}
