/* Stormgauge — Top 10 rendering (DOM-only, no compute).
 *
 * Renders one of two views for the currently-selected gauge:
 *   view='rainfall' — rank, date, total mm
 *   view='aep'      — rank, date, depth, duration, AEP (as "1 in N yrs")
 *
 * Deps are passed in so the module stays decoupled from the in-page globals
 * (escapeHtml, aepToARI, classifyAEP, DUR_LABELS, formatRainfallMm).
 */

/** @typedef {{
 *    targetEl: HTMLElement,
 *    view: 'rainfall'|'aep',
 *    rainfallRows: Array,
 *    aepRows: Array,
 *    onSwitchView: (v: 'rainfall'|'aep') => void,
 *    onClickRainfallDay?: (date: string) => void,
 *    deps: {
 *      escapeHtml:  (s: any) => string,
 *      aepToARI:    (aep: any) => string,
 *      classifyAEP: (aepStr: string) => { cls: string, label: string },
 *      DUR_LABELS:  Record<number, string>,
 *      formatRainfallMm: (v: any, decimals?: number, fallback?: string) => string,
 *      fmtDate?:    (date: string) => string,
 *    }
 *  }} RenderArgs */

/** Render the Top 10 panel. The toggle is rendered inline and calls back
 *  via onSwitchView. No Run button — the data is computed inside
 *  runAnalysis (cheap, single-gauge) and refreshed when Analyse re-runs.
 *
 *  @param {RenderArgs} args */
export function renderTop10Panel(args) {
  const { targetEl, view, rainfallRows, aepRows, deps } = args;
  if (!targetEl) return;

  const safeView = view === 'rainfall' ? 'rainfall' : 'aep';
  const tableHtml = safeView === 'rainfall'
    ? renderRainfallTable(rainfallRows, deps)
    : renderAepTable(aepRows, deps);

  targetEl.innerHTML = `
    <div class="top10-toolbar" style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <div class="top10-pillset" style="display:inline-flex;border:1px solid var(--border);border-radius:6px;overflow:hidden">
        <button type="button" class="top10-pill ${safeView === 'rainfall' ? 'top10-pill--active' : ''}"
                data-top10-view="rainfall"
                style="padding:6px 14px;font-size:12px;border:0;cursor:pointer;background:${safeView === 'rainfall' ? 'var(--teal)' : 'transparent'};color:${safeView === 'rainfall' ? '#fff' : 'inherit'}">
          Top 10 Rainfall days
        </button>
        <button type="button" class="top10-pill ${safeView === 'aep' ? 'top10-pill--active' : ''}"
                data-top10-view="aep"
                style="padding:6px 14px;font-size:12px;border:0;cursor:pointer;background:${safeView === 'aep' ? 'var(--teal)' : 'transparent'};color:${safeView === 'aep' ? '#fff' : 'inherit'}">
          Top 10 AEP days
        </button>
      </div>
    </div>
    <div class="results-table-wrap">${tableHtml}</div>
  `;

  targetEl.querySelectorAll('[data-top10-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-top10-view');
      if (v && typeof args.onSwitchView === 'function') args.onSwitchView(v);
    });
  });
  if (typeof args.onClickRainfallDay === 'function') {
    targetEl.querySelectorAll('[data-top10-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const day = btn.getAttribute('data-top10-day');
        if (day) args.onClickRainfallDay(day);
      });
    });
  }
}

function renderRainfallTable(rows, deps) {
  if (!rows || !rows.length) {
    return `<div style="padding:24px;text-align:center;color:var(--text-l);font-size:13px">
      No rainfall recorded for this gauge in the selected period.
    </div>`;
  }
  const fmtDate = deps.fmtDate || defaultFmtDate;
  const body = rows.map((r) => {
    const dayAttr = deps.escapeHtml(r.date);
    return `
    <tr>
      <td>${r.rank}</td>
      <td><button type="button" class="day-link" data-top10-day="${dayAttr}">${deps.escapeHtml(fmtDate(r.date))}</button></td>
      <td class="r"><strong>${deps.formatRainfallMm(r.totalMm)}</strong></td>
    </tr>`;
  }).join('');
  return `
    <table class="results-table compact">
      <thead><tr>
        <th>#</th><th>Date</th><th class="r">Rainfall</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

function renderAepTable(rows, deps) {
  if (!rows || !rows.length) {
    return `<div style="padding:24px;text-align:center;color:var(--text-l);font-size:13px">
      No AEP-rankable days for this gauge in the selected period.
    </div>`;
  }
  const fmtDate = deps.fmtDate || defaultFmtDate;
  const body = rows.map((r) => {
    const aepStr = r.aep?.aep || '-';
    const cls    = deps.classifyAEP ? deps.classifyAEP(aepStr).cls : '';
    const durLbl = deps.DUR_LABELS?.[r.durationMinutes] || `${r.durationMinutes} min`;
    return `
      <tr>
        <td>${r.rank}</td>
        <td>${deps.escapeHtml(fmtDate(r.date))}</td>
        <td class="r">${deps.formatRainfallMm(r.depthMm)}</td>
        <td class="r">${deps.escapeHtml(durLbl)}</td>
        <td><span class="aep-badge ${cls}">${deps.escapeHtml(deps.aepToARI(r.aep || aepStr))}</span></td>
      </tr>`;
  }).join('');
  return `
    <table class="results-table compact">
      <thead><tr>
        <th>#</th><th>Date</th>
        <th class="r">Depth</th><th class="r">Duration</th><th>AEP</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

function defaultFmtDate(date) {
  if (!date) return '-';
  try {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-AU',
      { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(date);
  }
}
