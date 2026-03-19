// Guide — TapasOS User Manual
// Interactive guide to all features, shortcuts, and capabilities

let container = null;
let activeSection = 'welcome';

const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
const MOD = IS_MAC ? '\u2325' : 'Alt+';
const MOD_NAME = IS_MAC ? 'Option' : 'Alt';

const SECTIONS = [
  { id: 'welcome',       label: 'Welcome',            icon: '\u{1F44B}' },
  { id: 'windows',       label: 'Windows',            icon: '\u{1FA9F}' },
  { id: 'dock',          label: 'Dock',               icon: '\u{1F4CC}' },
  { id: 'shortcuts',     label: 'Keyboard Shortcuts',  icon: '\u2328\uFE0F' },
  { id: 'spotlight',     label: 'Spotlight Search',    icon: '\u{1F50D}' },
  { id: 'mission',       label: 'Mission Control',     icon: '\u{1F5BC}\uFE0F' },
  { id: 'notifications', label: 'Notifications',       icon: '\u{1F514}' },
  { id: 'control',       label: 'Control Center',      icon: '\u{1F39B}\uFE0F' },
  { id: 'appstore',      label: 'App Store & Games',   icon: '\u{1F6D2}' },
  { id: 'wallpapers',    label: 'Wallpapers & Themes', icon: '\u{1F3A8}' },
  { id: 'snap',          label: 'Window Snapping',     icon: '\u{1F4D0}' },
  { id: 'dragdrop',      label: 'Drag & Drop',         icon: '\u{1F4E6}' },
  { id: 'tapascode',     label: 'TapasCode (AI)',      icon: '\u2318' },
  { id: 'lockscreen',    label: 'Lock Screen',         icon: '\u{1F512}' },
  { id: 'apps',          label: 'Built-in Apps',       icon: '\u{1F4F1}' },
  { id: 'tips',          label: 'Tips & Tricks',       icon: '\u{1F4A1}' },
];

export function init(el) {
  container = el;
  injectStyles();
  render();
}

function render() {
  container.innerHTML = `
    <div class="guide-app">
      <nav class="guide-nav">
        <div class="guide-nav-title">User Guide</div>
        ${SECTIONS.map(s => `
          <div class="guide-nav-item ${s.id === activeSection ? 'active' : ''}" data-section="${s.id}">
            <span class="guide-nav-icon">${s.icon}</span>
            <span>${s.label}</span>
          </div>
        `).join('')}
      </nav>
      <main class="guide-main" id="guide-content"></main>
    </div>
  `;
  renderSection();
  bindEvents();
}

function bindEvents() {
  container.querySelectorAll('.guide-nav-item').forEach(el => {
    el.addEventListener('click', () => {
      activeSection = el.dataset.section;
      container.querySelectorAll('.guide-nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      renderSection();
    });
  });
}

function renderSection() {
  const content = container.querySelector('#guide-content');
  if (!content) return;
  const fn = sectionRenderers[activeSection];
  content.innerHTML = fn ? fn() : '';
  content.scrollTop = 0;
}

function kbd(key) {
  return `<kbd class="guide-kbd">${key}</kbd>`;
}

function shortcut(keys, desc) {
  return `<div class="guide-shortcut"><span class="guide-keys">${keys}</span><span class="guide-desc">${desc}</span></div>`;
}

function section(title, body) {
  return `<div class="guide-section"><h2 class="guide-h2">${title}</h2>${body}</div>`;
}

function tip(text) {
  return `<div class="guide-tip">${text}</div>`;
}

const sectionRenderers = {
  welcome: () => `
    <div class="guide-hero">
      <div class="guide-hero-icon">\u{1F5A5}\uFE0F</div>
      <h1 class="guide-h1">Welcome to TapasOS</h1>
      <p class="guide-subtitle">A browser-based operating system built by Tapas Kumar Patra</p>
    </div>
    ${section('What is TapasOS?', `
      <p>TapasOS is a fully interactive desktop environment that runs in your browser. It features window management, a dock, keyboard shortcuts, notifications, an app store, AI-powered terminal, and much more.</p>
      <p>Use the sidebar to explore each feature in detail.</p>
    `)}
    ${section('Quick Start', `
      <div class="guide-grid-2">
        <div class="guide-card">
          <div class="guide-card-icon">\u{1F50D}</div>
          <div class="guide-card-title">Search Anything</div>
          <div class="guide-card-desc">Press ${kbd(MOD + 'K')} or ${kbd('/')} to open Spotlight and find any app instantly.</div>
        </div>
        <div class="guide-card">
          <div class="guide-card-icon">\u{1FA9F}</div>
          <div class="guide-card-title">Manage Windows</div>
          <div class="guide-card-desc">Drag title bars to move, drag edges to resize, or snap to edges for split view.</div>
        </div>
        <div class="guide-card">
          <div class="guide-card-icon">\u{1F3AE}</div>
          <div class="guide-card-title">Install Games</div>
          <div class="guide-card-desc">Open the App Store to install Snake, 2048, Minesweeper, Memory Match, and Breakout.</div>
        </div>
        <div class="guide-card">
          <div class="guide-card-icon">\u2318</div>
          <div class="guide-card-title">AI Terminal</div>
          <div class="guide-card-desc">Open TapasCode to control the OS with natural language using your own API key.</div>
        </div>
      </div>
    `)}
  `,

  windows: () => `
    <h1 class="guide-h1">Window Management</h1>
    ${section('Traffic Lights', `
      <p>Every window has three buttons in the title bar:</p>
      <ul>
        <li><span class="guide-dot red"></span> <strong>Close</strong> \u2014 Closes the window</li>
        <li><span class="guide-dot yellow"></span> <strong>Minimize</strong> \u2014 Hides window to dock</li>
        <li><span class="guide-dot green"></span> <strong>Maximize</strong> \u2014 Toggles fullscreen / restore</li>
      </ul>
    `)}
    ${section('Moving & Resizing', `
      <p>Drag the <strong>title bar</strong> to move a window. Drag any <strong>edge or corner</strong> to resize.</p>
      <p>Double-click the title bar to maximize/restore.</p>
    `)}
    ${section('Keyboard Controls', `
      ${shortcut(kbd(MOD + 'W'), 'Close focused window')}
      ${shortcut(kbd(MOD + 'Shift+W'), 'Close all windows')}
      ${shortcut(kbd(MOD + 'M'), 'Minimize focused window')}
      ${shortcut(kbd(MOD + 'Enter'), 'Maximize / Restore window')}
      ${shortcut(kbd(MOD + 'H'), 'Hide all windows (minimize all)')}
      ${shortcut(kbd(MOD + '`'), 'Cycle through open windows')}
    `)}
    ${tip('Right-click the desktop for a context menu with window management options.')}
  `,

  dock: () => `
    <h1 class="guide-h1">Dock</h1>
    ${section('Overview', `
      <p>The Dock sits at the bottom of the screen and gives quick access to your favorite apps.</p>
      <ul>
        <li>Click any icon to open the app</li>
        <li>A <strong>dot</strong> below an icon means the app is currently open</li>
        <li>The <strong>Trash</strong> is always at the far right, separated by a divider</li>
      </ul>
    `)}
    ${section('Magnification', `
      <p>Hover over dock icons and they magnify based on cursor distance \u2014 just like macOS.</p>
    `)}
    ${section('Customization', `
      <ul>
        <li><strong>Reorder</strong> \u2014 Drag dock icons left/right to rearrange</li>
        <li><strong>Add to Dock</strong> \u2014 Right-click any app window title bar &gt; "Keep in Dock"</li>
        <li><strong>Remove from Dock</strong> \u2014 Right-click a dock icon &gt; "Remove from Dock"</li>
        <li><strong>Reset Dock</strong> \u2014 Right-click desktop &gt; "Reset Dock"</li>
      </ul>
      <p>Your dock order is saved in localStorage and persists across sessions.</p>
    `)}
  `,

  shortcuts: () => `
    <h1 class="guide-h1">Keyboard Shortcuts</h1>
    <p class="guide-muted">All shortcuts use ${kbd(MOD_NAME)} as the modifier key.</p>
    ${section('Window Management', `
      ${shortcut(kbd(MOD + 'W'), 'Close focused window')}
      ${shortcut(kbd(MOD + 'Shift+W'), 'Close all windows')}
      ${shortcut(kbd(MOD + 'M'), 'Minimize focused window')}
      ${shortcut(kbd(MOD + 'Enter'), 'Maximize / Restore')}
      ${shortcut(kbd(MOD + 'H'), 'Minimize all windows')}
      ${shortcut(kbd(MOD + '`'), 'Cycle windows (app switcher)')}
    `)}
    ${section('System', `
      ${shortcut(kbd(MOD + 'K') + ' or ' + kbd('/'), 'Spotlight Search')}
      ${shortcut(kbd('F3') + ' or ' + kbd(MOD + 'Tab'), 'Mission Control')}
      ${shortcut(kbd(MOD + 'N'), 'Notification Center')}
      ${shortcut(kbd(MOD + 'L'), 'Lock Screen')}
      ${shortcut(kbd('Escape'), 'Close overlay (spotlight, menu, mission control)')}
    `)}
    ${tip(`On Mac, ${MOD_NAME} is the \u2325 (Option) key. On Windows/Linux, it's the Alt key.`)}
  `,

  spotlight: () => `
    <h1 class="guide-h1">Spotlight Search</h1>
    ${section('How to Open', `
      <p>Press ${kbd(MOD + 'K')} or ${kbd('/')} from anywhere.</p>
      <p>A search bar appears at the top center of the screen.</p>
    `)}
    ${section('What You Can Do', `
      <ul>
        <li>Search and open any installed app by name</li>
        <li>Results appear instantly as you type</li>
        <li>Press ${kbd('Enter')} to open the first result</li>
        <li>Use ${kbd('\u2191')} ${kbd('\u2193')} arrow keys to select, then ${kbd('Enter')}</li>
        <li>Press ${kbd('Escape')} to close</li>
      </ul>
    `)}
    ${tip('Spotlight is the fastest way to open any app. You don\'t need to find it in the dock or Launchpad.')}
  `,

  mission: () => `
    <h1 class="guide-h1">Mission Control</h1>
    ${section('Overview', `
      <p>Mission Control gives you a bird\u2019s-eye view of all open windows.</p>
      <p>Press ${kbd('F3')} or ${kbd(MOD + 'Tab')} to toggle it.</p>
    `)}
    ${section('Usage', `
      <ul>
        <li>All open windows shrink and spread across the screen</li>
        <li>Click any window to focus it and exit Mission Control</li>
        <li>Press ${kbd('Escape')} or ${kbd('F3')} to close without selecting</li>
      </ul>
    `)}
  `,

  notifications: () => `
    <h1 class="guide-h1">Notifications</h1>
    ${section('Toast Notifications', `
      <p>When something happens (app installed, note created, etc.), a toast slides in from the top-right.</p>
      <p>Toasts dismiss automatically after a few seconds, or click the <strong>\u00D7</strong> to dismiss immediately.</p>
    `)}
    ${section('Notification Center', `
      <p>Click the <strong>bell icon</strong> in the menu bar, or press ${kbd(MOD + 'N')}.</p>
      <ul>
        <li>Shows full history of all notifications, grouped by app</li>
        <li>Badge count appears on the bell when you have notifications</li>
        <li><strong>Clear All</strong> removes everything</li>
        <li>Clear per-app group with the <strong>\u00D7</strong> button on each group header</li>
      </ul>
    `)}
  `,

  control: () => `
    <h1 class="guide-h1">Control Center</h1>
    ${section('How to Open', `
      <p>Click the <strong>Wi-Fi icon</strong> in the menu bar (top-right area).</p>
    `)}
    ${section('Controls', `
      <ul>
        <li><strong>Wi-Fi</strong> \u2014 Toggle connectivity on/off</li>
        <li><strong>Sound</strong> \u2014 Mute/unmute system sounds</li>
        <li><strong>Brightness</strong> \u2014 Adjust display brightness (50\u2013100%)</li>
        <li><strong>Volume</strong> \u2014 Adjust system volume (0\u2013100%)</li>
      </ul>
    `)}
    ${tip('These same controls are also available in the Settings app under the Display and Sound sections.')}
  `,

  appstore: () => `
    <h1 class="guide-h1">App Store & Games</h1>
    ${section('Browsing', `
      <p>Open the <strong>App Store</strong> from the dock, Launchpad, or Spotlight.</p>
      <ul>
        <li><strong>Discover</strong> \u2014 Featured games + all categories</li>
        <li><strong>Categories</strong> \u2014 System, Productivity, Portfolio, Developer, Games</li>
        <li><strong>Installed</strong> \u2014 See all installed apps with option to uninstall</li>
        <li>Use the search bar to filter apps</li>
      </ul>
    `)}
    ${section('Installing & Uninstalling', `
      <ul>
        <li>Click <strong>Get</strong> to install a store-only app (games)</li>
        <li>Click <strong>Uninstall</strong> to remove a non-system app</li>
        <li>Or <strong>drag an app from Launchpad to the Trash</strong> in the dock</li>
        <li><strong>System apps</strong> (Settings, Finder, Trash, etc.) cannot be uninstalled</li>
        <li>Uninstalled apps disappear from Launchpad and Finder but remain in the App Store</li>
      </ul>
    `)}
    ${section('Available Games', `
      <div class="guide-grid-2">
        <div class="guide-card-sm">\u{1F40D} <strong>Snake</strong> \u2014 Eat, grow, survive</div>
        <div class="guide-card-sm">\u{1F9E9} <strong>2048</strong> \u2014 Slide & merge tiles</div>
        <div class="guide-card-sm">\u{1F4A3} <strong>Minesweeper</strong> \u2014 Clear the mines</div>
        <div class="guide-card-sm">\u{1F3B4} <strong>Memory Match</strong> \u2014 Find matching pairs</div>
        <div class="guide-card-sm">\u{1F3BE} <strong>Breakout</strong> \u2014 Break all the bricks</div>
      </div>
    `)}
  `,

  wallpapers: () => `
    <h1 class="guide-h1">Wallpapers & Themes</h1>
    ${section('Changing Wallpaper', `
      <p>Open <strong>Settings</strong> &gt; Wallpaper section, or right-click the desktop &gt; "Change Wallpaper".</p>
    `)}
    ${section('Available Wallpapers', `
      <ul>
        <li><strong>Particle Mesh</strong> \u2014 Interactive particle network (default)</li>
        <li><strong>Aurora</strong> \u2014 Northern lights gradient</li>
        <li><strong>Midnight</strong> \u2014 Deep space blue</li>
        <li><strong>Ember</strong> \u2014 Warm dark ember glow</li>
        <li><strong>Ocean</strong> \u2014 Deep ocean blue-green</li>
        <li><strong>Nebula</strong> \u2014 Purple cosmic nebula</li>
        <li><strong>Monochrome</strong> \u2014 Clean dark minimal</li>
        <li><strong>Dynamic</strong> \u2014 Changes with time of day</li>
      </ul>
    `)}
    ${tip('All wallpapers are CSS gradients \u2014 zero network requests, instant switching.')}
  `,

  snap: () => `
    <h1 class="guide-h1">Window Snapping</h1>
    ${section('How It Works', `
      <p>Drag a window to the <strong>edge of the screen</strong> to snap it into position.</p>
    `)}
    ${section('Snap Zones', `
      <ul>
        <li><strong>Left edge</strong> \u2014 Snap to left half</li>
        <li><strong>Right edge</strong> \u2014 Snap to right half</li>
        <li><strong>Top edge</strong> \u2014 Maximize (full screen)</li>
        <li><strong>Corners</strong> \u2014 Quarter-screen snap (top-left, top-right, bottom-left, bottom-right)</li>
      </ul>
      <p>A blue preview overlay shows where the window will land before you release.</p>
    `)}
    ${tip('This is great for side-by-side multitasking \u2014 snap two apps to left and right halves.')}
  `,

  dragdrop: () => `
    <h1 class="guide-h1">Drag & Drop</h1>
    ${section('Dock Reordering', `
      <p>Drag dock icons left/right to rearrange them. Your order is saved automatically.</p>
    `)}
    ${section('Uninstall via Trash', `
      <p>Drag an app from <strong>Launchpad</strong> onto the <strong>Trash</strong> icon in the dock to uninstall it.</p>
      <p>System apps cannot be uninstalled this way.</p>
    `)}
    ${section('Text Drop', `
      <p>Select text in your browser and drag it onto the TapasOS desktop. It automatically creates a <strong>Note</strong> with that content.</p>
    `)}
    ${section('Finder Items', `
      <p>App items in Finder are draggable. Drop them on the desktop to open them.</p>
    `)}
  `,

  tapascode: () => `
    <h1 class="guide-h1">TapasCode (AI Terminal)</h1>
    ${section('What is TapasCode?', `
      <p>TapasCode is an AI-powered terminal that lets you control TapasOS with natural language.</p>
      <p>It connects to AI providers (Claude, GPT, Gemini, Mistral) using <strong>your own API key</strong>.</p>
    `)}
    ${section('Setup', `
      <ol>
        <li>Open TapasCode from Launchpad or Spotlight</li>
        <li>Select your AI provider (Claude, GPT, Gemini, or Mistral)</li>
        <li>Choose a model from the dropdown</li>
        <li>Enter your API key (stored in session only \u2014 cleared when you close the tab)</li>
      </ol>
    `)}
    ${section('What You Can Do', `
      <div class="guide-grid-2">
        <div class="guide-card-sm">"Open settings"</div>
        <div class="guide-card-sm">"Set wallpaper to nebula"</div>
        <div class="guide-card-sm">"Set volume to 40"</div>
        <div class="guide-card-sm">"Close all windows"</div>
        <div class="guide-card-sm">"Create a folder called Work"</div>
        <div class="guide-card-sm">"What apps are open?"</div>
        <div class="guide-card-sm">"Show my notifications"</div>
        <div class="guide-card-sm">"Lock the screen"</div>
      </div>
    `)}
    ${tip('TapasCode dynamically knows which apps are installed \u2014 install Snake from the App Store and you can say "open snake".')}
  `,

  lockscreen: () => `
    <h1 class="guide-h1">Lock Screen</h1>
    ${section('Locking', `
      <ul>
        <li>Press ${kbd(MOD + 'L')} to lock immediately</li>
        <li>Or use TapasCode: "lock the screen"</li>
        <li>The screen also locks automatically after a period of inactivity</li>
      </ul>
    `)}
    ${section('Unlocking', `
      <p>Slide the lock screen up (drag or swipe) to unlock. No password required.</p>
    `)}
    ${section('Settings', `
      <p>Configure the auto-lock timeout in <strong>Settings</strong> &gt; Lock Screen.</p>
    `)}
  `,

  apps: () => `
    <h1 class="guide-h1">Built-in Apps</h1>
    ${section('System', `
      <ul>
        <li>\u2699\uFE0F <strong>Settings</strong> \u2014 Wallpaper, sound, display, lock screen preferences</li>
        <li>\u{1F4BB} <strong>Finder</strong> \u2014 Browse the virtual filesystem</li>
        <li>\u{1F5D1}\uFE0F <strong>Trash</strong> \u2014 View and restore deleted items</li>
        <li>\u{1F680} <strong>Launchpad</strong> \u2014 Grid view of all installed apps</li>
        <li>\u{1F6D2} <strong>App Store</strong> \u2014 Browse, install, and manage apps</li>
      </ul>
    `)}
    ${section('Productivity', `
      <ul>
        <li>\u{1F4DD} <strong>Notes</strong> \u2014 Create and manage notes (auto-saved)</li>
        <li>\u{1F4C5} <strong>Calendar</strong> \u2014 Career timeline and key dates</li>
        <li>\u2328\uFE0F <strong>Terminal</strong> \u2014 Interactive command-line shell</li>
        <li>\u{1F9ED} <strong>Browser</strong> \u2014 Built-in web browser with bookmarks</li>
        <li>\u{1F3A8} <strong>Photos</strong> \u2014 Project screenshots and images</li>
      </ul>
    `)}
    ${section('Portfolio', `
      <ul>
        <li>\u{1F916} <strong>Tapas.ai</strong> \u2014 RAG-powered AI chatbot about Tapas</li>
        <li>\u{1F4C2} <strong>Projects</strong> \u2014 GitHub repositories</li>
        <li>\u26A1 <strong>Skills</strong> \u2014 Technical skills overview</li>
        <li>\u{1F4C8} <strong>Activity Monitor</strong> \u2014 GitHub contribution stats</li>
        <li>\u{1F3C6} <strong>Awards</strong> \u2014 Performance awards</li>
        <li>\u{1F4C4} <strong>Resume</strong> \u2014 Download or preview CV</li>
        <li>\u{1F4BC} <strong>Experience</strong> \u2014 Work history</li>
        <li>\u{1F393} <strong>Education</strong> \u2014 Educational background</li>
        <li>\u{1F4EC} <strong>Contact</strong> \u2014 Get in touch</li>
        <li>\u{1F310} <strong>Classic View</strong> \u2014 Traditional HTML portfolio</li>
      </ul>
    `)}
    ${section('Developer', `
      <ul>
        <li>\u2318 <strong>TapasCode</strong> \u2014 AI terminal for controlling TapasOS</li>
      </ul>
    `)}
  `,

  tips: () => `
    <h1 class="guide-h1">Tips & Tricks</h1>
    ${section('Power User Tips', `
      <ul class="guide-tips-list">
        <li>Press ${kbd('/')} from anywhere to instantly open Spotlight \u2014 faster than ${kbd(MOD + 'K')}.</li>
        <li>Right-click the desktop for quick access to wallpaper changes, dock reset, and window actions.</li>
        <li>Drag a window to any corner for quarter-screen snapping \u2014 great for 4-app layouts.</li>
        <li>The Particle Mesh wallpaper is interactive \u2014 move your mouse to see particles react.</li>
        <li>Hold ${kbd(MOD_NAME)} and press ${kbd('\`')} repeatedly to cycle through open windows.</li>
        <li>Install games from the App Store, play them, then uninstall to keep the system clean.</li>
        <li>TapasCode API keys are session-only \u2014 they're automatically cleared when you close the tab.</li>
        <li>Notification history persists during your session. Use the bell icon to review past alerts.</li>
        <li>The Dynamic wallpaper changes color based on the time of day \u2014 warm during day, cool at night.</li>
        <li>All your data (dock order, notes, settings) is stored in localStorage and persists across visits.</li>
      </ul>
    `)}
    ${section('Known Limitations', `
      <ul>
        <li>This is a browser-based OS \u2014 no real file system or processes</li>
        <li>Game installs are session-only and reset on page reload</li>
        <li>TapasCode requires an active internet connection and a valid AI API key</li>
        <li>Browser app works best with HTTPS URLs due to iframe restrictions</li>
      </ul>
    `)}
  `,
};

function injectStyles() {
  if (document.getElementById('guide-styles')) return;
  const style = document.createElement('style');
  style.id = 'guide-styles';
  style.textContent = `
    .guide-app {
      display: flex;
      height: 100%;
      font-family: var(--font-body);
    }

    /* Sidebar */
    .guide-nav {
      width: 200px;
      flex-shrink: 0;
      background: rgba(0,0,0,0.2);
      border-right: 1px solid rgba(255,255,255,0.06);
      padding: 12px 6px;
      overflow-y: auto;
    }
    .guide-nav-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      padding: 0 10px 10px;
    }
    .guide-nav-item {
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
    .guide-nav-item:hover { background: rgba(255,255,255,0.05); }
    .guide-nav-item.active { background: rgba(0,229,255,0.1); color: var(--cyan); }
    .guide-nav-icon { font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }

    /* Main content */
    .guide-main {
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px;
    }

    .guide-h1 {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 800;
      color: var(--text-primary);
      margin: 0 0 20px;
      letter-spacing: -0.3px;
    }
    .guide-h2 {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .guide-muted {
      color: var(--text-muted);
      font-size: 12px;
      margin-bottom: 16px;
    }

    .guide-section {
      margin-bottom: 24px;
    }
    .guide-section p, .guide-section li {
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.7;
      margin: 0 0 8px;
    }
    .guide-section ul, .guide-section ol {
      padding-left: 20px;
      margin: 0 0 8px;
    }
    .guide-section li {
      margin-bottom: 4px;
    }

    /* Hero */
    .guide-hero {
      text-align: center;
      padding: 30px 0 20px;
    }
    .guide-hero-icon { font-size: 48px; margin-bottom: 12px; }
    .guide-subtitle {
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 6px;
    }

    /* Keyboard shortcut rows */
    .guide-shortcut {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: 6px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.04);
      margin-bottom: 4px;
    }
    .guide-keys {
      flex-shrink: 0;
    }
    .guide-desc {
      color: var(--text-muted);
      font-size: 12px;
      text-align: right;
    }
    .guide-kbd {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--cyan);
      font-weight: 600;
      line-height: 1.4;
    }

    /* Cards */
    .guide-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .guide-card {
      padding: 16px;
      border-radius: 10px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
    }
    .guide-card-icon { font-size: 24px; margin-bottom: 8px; }
    .guide-card-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
    }
    .guide-card-desc {
      font-size: 11px;
      color: var(--text-dim);
      line-height: 1.5;
    }
    .guide-card-sm {
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.04);
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* Tip callout */
    .guide-tip {
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(0,229,255,0.04);
      border: 1px solid rgba(0,229,255,0.1);
      color: var(--cyan);
      font-size: 12px;
      line-height: 1.6;
      margin-top: 8px;
    }
    .guide-tip::before {
      content: 'Tip: ';
      font-weight: 700;
    }

    /* Traffic light dots */
    .guide-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 4px;
      vertical-align: middle;
    }
    .guide-dot.red { background: #FF5F56; }
    .guide-dot.yellow { background: #FFBD2E; }
    .guide-dot.green { background: #27C93F; }

    .guide-tips-list li {
      margin-bottom: 8px !important;
    }
  `;
  document.head.appendChild(style);
}
