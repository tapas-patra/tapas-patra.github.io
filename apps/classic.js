// Classic Portfolio View — loads classic.html in an iframe

export function init(container) {
  container.style.padding = '0';
  container.style.overflow = 'hidden';
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 12px;background:var(--glass);border-bottom:1px solid var(--glass-border);flex-shrink:0;">
        <span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);">classic.html</span>
        <a href="classic.html" target="_blank" rel="noopener" style="font-size:11px;color:var(--cyan);text-decoration:none;font-family:var(--font-mono);">Open in new tab &#x2197;</a>
      </div>
      <iframe src="classic.html" style="flex:1;border:none;width:100%;background:#0B1120;"></iframe>
    </div>
  `;
}
