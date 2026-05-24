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

  // Capture priority — narrowest first. We want the PNG to stop exactly at
  // the edge of the table the user is looking at, with no panel-width
  // whitespace and no button cluster on the right.
  const activePanel = resultsEl.querySelector('.rpanel.active');
  const target =
       activePanel?.querySelector('table.results-table')
    || activePanel?.querySelector('.results-table-wrap')
    || activePanel
    || resultsEl;

  const now    = new Date();
  const pad    = n => String(n).padStart(2, '0');
  const tsFile = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const slug   = csvSlug(selected?.name ?? '');
  const filename = `stormgauge_report${slug ? '_' + slug : ''}_${tsFile}.png`;

  // Lift overflow/max-height on the results container and any intermediate
  // scroll wrapper so the target renders at full size for capture.
  const prevResults = { maxHeight: resultsEl.style.maxHeight, overflow: resultsEl.style.overflow };
  resultsEl.style.maxHeight = 'none';
  resultsEl.style.overflow  = 'visible';

  const wrapEl = target.closest?.('.results-table-wrap');
  const prevWrap = wrapEl ? { overflow: wrapEl.style.overflow, maxHeight: wrapEl.style.maxHeight } : null;
  if (wrapEl) {
    wrapEl.style.overflow = 'visible';
    wrapEl.style.maxHeight = 'none';
  }

  // Snapshot the live theme so we can propagate it onto html2canvas's
  // cloned <html> in onclone. Without this, dark-theme CSS overrides
  // (e.g. `html[data-theme="dark"] td { color: #C8DCEA }`) don't apply
  // in the capture and td text falls back to the default light-theme
  // colour `#1A2B3C` — invisible against the dark canvas background.
  const liveTheme = document.documentElement.dataset.theme || null;

  try {
    // Constrain the output canvas to the target's bounding box.
    // Do NOT override windowWidth/windowHeight — that forces html2canvas to
    // re-render the page in a virtual viewport of that size, which breaks
    // sticky-positioned children like the table <thead> (renders with the
    // wrong background colour).
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
    }
  }
}
