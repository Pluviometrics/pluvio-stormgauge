import { csvSlug } from './exportHelpers.js';

export async function exportPNG() {
  const resultsEl = document.getElementById('results');
  if (!resultsEl || !resultsEl.classList.contains('show')) {
    alert('No results to export. Run an analysis first.');
    return;
  }
  if (typeof html2canvas === 'undefined') {
    alert('PNG export library did not load. Check your internet connection.');
    return;
  }

  // Capture the table-wrap when one exists — it has the right background
  // colour for dark theme (#0A1520). We then force its display to
  // inline-block + max-content during capture so the wrap collapses to
  // the table's natural width rather than spanning the full panel.
  // Falls back to the table, panel, then the whole results container.
  const activePanel = resultsEl.querySelector('.rpanel.active');
  const wrapEl = activePanel?.querySelector('.results-table-wrap') || null;
  const target =
       wrapEl
    || activePanel?.querySelector('table.results-table')
    || activePanel
    || resultsEl;
  console.warn('[PNG] target=', target?.tagName, target?.id || '(no id)',
               'class=' + (target?.className || ''),
               'rect=', JSON.stringify(target?.getBoundingClientRect?.() || {}));

  const now    = new Date();
  const pad    = n => String(n).padStart(2, '0');
  const tsFile = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const slug   = csvSlug(selected?.name ?? '');
  const filename = `stormgauge_report${slug ? '_' + slug : ''}_${tsFile}.png`;

  // Lift overflow/max-height on the results container so descendants
  // render at full size for capture.
  const prevResults = { maxHeight: resultsEl.style.maxHeight, overflow: resultsEl.style.overflow };
  resultsEl.style.maxHeight = 'none';
  resultsEl.style.overflow  = 'visible';

  // Force the wrap to shrink-wrap the table. inline-block + max-content
  // collapses the wrap to its content's intrinsic width; otherwise the
  // wrap stretches to the panel width and html2canvas captures that.
  const prevWrap = wrapEl ? {
    overflow:  wrapEl.style.overflow,
    maxHeight: wrapEl.style.maxHeight,
    display:   wrapEl.style.display,
    width:     wrapEl.style.width,
    maxWidth:  wrapEl.style.maxWidth,
  } : null;
  if (wrapEl) {
    wrapEl.style.overflow  = 'visible';
    wrapEl.style.maxHeight = 'none';
    wrapEl.style.display   = 'inline-block';
    wrapEl.style.width     = 'max-content';
    wrapEl.style.maxWidth  = 'none';
  }

  // Snapshot the live theme so we can propagate it onto html2canvas's
  // cloned <html> in onclone. Without this, dark-theme CSS overrides
  // (e.g. `html[data-theme="dark"] td { color: #C8DCEA }`) don't apply
  // in the capture and td text falls back to the default light-theme
  // colour `#1A2B3C` — invisible against the dark canvas background.
  const liveTheme = document.documentElement.dataset.theme || null;

  try {
    // Re-measure after the wrap restyle so the canvas matches the
    // shrink-wrapped width, not whatever it was before.
    const rect = target.getBoundingClientRect();
    const canvas = await html2canvas(target, {
      backgroundColor: '#0A1520',
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width:  Math.ceil(rect.width),
      height: Math.ceil(rect.height),
      onclone: (clonedDoc) => {
        if (liveTheme) clonedDoc.documentElement.dataset.theme = liveTheme;
      }
    });
    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href   = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    }, 'image/png');
  } catch(e) {
    console.error('PNG export failed:', e);
    alert('PNG export failed: ' + e.message);
  } finally {
    resultsEl.style.maxHeight = prevResults.maxHeight;
    resultsEl.style.overflow  = prevResults.overflow;
    if (wrapEl && prevWrap) {
      wrapEl.style.overflow  = prevWrap.overflow;
      wrapEl.style.maxHeight = prevWrap.maxHeight;
      if (prevWrap.display)   wrapEl.style.display  = prevWrap.display;  else wrapEl.style.removeProperty('display');
      if (prevWrap.width)     wrapEl.style.width    = prevWrap.width;    else wrapEl.style.removeProperty('width');
      if (prevWrap.maxWidth)  wrapEl.style.maxWidth = prevWrap.maxWidth; else wrapEl.style.removeProperty('max-width');
    }
  }
}
