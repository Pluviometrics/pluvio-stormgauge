/* Stormgauge — Top 10 analysis (pure compute, no DOM, no globals).
 *
 * Two functions:
 *   computeTopRainfallDays — flat list of largest gauge-day rainfall totals;
 *                            no per-gauge dedup.
 *   computeTopAepDays      — rarest gauge-day events (AEP across the 10
 *                            standard IFD durations contained within each
 *                            24h gauge-day window); deduped to one entry
 *                            per gauge.
 *
 * Both honour the rainfall-day mode passed in ('midnight' or '9am') and
 * the gauge set produced by the caller — they never read the DOM.
 */

import { rainfallDayKey } from '../rainfall/dailyGrouping.js';

/** Standard IFD durations for the AEP view, in minutes.
 *  5/10/15/30 min and 1/2/3/6/12/24 hr — the durations the Stormgauge brief
 *  enumerates for per-gauge-day rarity ranking. */
export const TOP10_AEP_DURATIONS = Object.freeze([5, 10, 15, 30, 60, 120, 180, 360, 720, 1440]);

/** @typedef {{ timestamp: string|number|Date, value: number }} Reading */
/** @typedef {{ stationId: string, stationName: string, readings: Reading[], intervalMinutes?: number }} GaugeBundle */

/** Sum readings into rainfall-day buckets and emit the top-N gauge-days.
 *  No dedup — a single gauge may appear multiple times.
 *
 *  @param {GaugeBundle[]} perGauge
 *  @param {'midnight'|'9am'} dayMode
 *  @param {number} [n=10]
 *  @returns {{rank:number,date:string,stationId:string,stationName:string,totalMm:number}[]}
 */
export function computeTopRainfallDays(perGauge, dayMode = 'midnight', n = 10) {
  const flat = [];
  for (const g of perGauge || []) {
    if (!g || !Array.isArray(g.readings)) continue;
    const byDay = {};
    for (const r of g.readings) {
      if (!r || r.timestamp == null) continue;
      const v = Number(r.value);
      if (!Number.isFinite(v)) continue;
      const key = rainfallDayKey(r.timestamp, dayMode);
      if (!key) continue;
      byDay[key] = (byDay[key] || 0) + v;
    }
    for (const [date, total] of Object.entries(byDay)) {
      if (total <= 0) continue;
      flat.push({
        date,
        stationId:   g.stationId,
        stationName: g.stationName,
        totalMm:     Math.round(total * 100) / 100,
      });
    }
  }
  flat.sort((a, b) => b.totalMm - a.totalMm);
  return flat.slice(0, n).map((entry, i) => ({ rank: i + 1, ...entry }));
}

/** Build per-gauge-day events ranked by AEP ascending (rarest first), up to N.
 *
 *  For each gauge, for each rainfall-day, the event is the rolling window
 *  (within the 10 standard IFD durations) whose AEP is rarest. Window-
 *  contained-in-day is enforced by bucketing readings by day first and
 *  running rolling-max only inside each bucket — a window that would cross
 *  a day boundary simply can't form.
 *
 *  No per-gauge dedup: in single-gauge use the result is that gauge's top
 *  N days; in multi-gauge use the result is the top N (gauge, day) events
 *  globally and may include multiple days from the same gauge.
 *
 *  @param {GaugeBundle[]} perGauge
 *  @param {(stationId:string, durationMinutes:number, depthMm:number) => any} calcAEP
 *  @param {'midnight'|'9am'} dayMode
 *  @param {number} [n=10]
 *  @returns {{rank:number,date:string,stationId:string,stationName:string,depthMm:number,durationMinutes:number,aep:any,peakStart:string|null,peakEnd:string|null}[]}
 */
export function computeTopAepDays(perGauge, calcAEP, dayMode = 'midnight', n = 10) {
  if (typeof calcAEP !== 'function') return [];

  const events = [];

  for (const g of perGauge || []) {
    if (!g || !Array.isArray(g.readings) || !g.readings.length) continue;

    const byDay = {};
    for (const r of g.readings) {
      if (!r || r.timestamp == null) continue;
      const v = Number(r.value);
      if (!Number.isFinite(v)) continue;
      const key = rainfallDayKey(r.timestamp, dayMode);
      if (!key) continue;
      (byDay[key] = byDay[key] || []).push(r);
    }

    for (const [date, dayReadings] of Object.entries(byDay)) {
      if (!dayReadings.length) continue;
      let dayRarest = null;
      for (const d of TOP10_AEP_DURATIONS) {
        const rolling = rollingMaxWithin(dayReadings, d);
        if (!rolling || rolling.maxDepth <= 0) continue;
        let aep = null;
        try { aep = calcAEP(g.stationId, d, rolling.maxDepth); } catch (e) { aep = null; }
        if (!aep) continue;
        const prob = aepProb(aep.aep);
        if (!dayRarest || prob < dayRarest.aepProb) {
          dayRarest = {
            stationId:   g.stationId,
            stationName: g.stationName,
            date,
            depthMm:         Math.round(rolling.maxDepth * 100) / 100,
            durationMinutes: d,
            aep,
            aepProb:         prob,
            peakStart:       rolling.peakStart,
            peakEnd:         rolling.peakEnd,
          };
        }
      }
      if (dayRarest) events.push(dayRarest);
    }
  }

  events.sort((a, b) => a.aepProb - b.aepProb);
  return events.slice(0, n).map((entry, i) => {
    const { aepProb: _drop, ...rest } = entry;
    return { rank: i + 1, ...rest };
  });
}

/** Timestamp-aware O(n) sliding-window max. For each "end" reading e, the
 *  window is the half-open interval (e.t - durationMinutes, e.t] — i.e. all
 *  readings whose timestamps fall within `durationMinutes` minutes ending
 *  at e.t. Sums the values in that window; tracks the maximum sum seen.
 *
 *  Why timestamp-aware: MHL KiWIS data is SPARSE (zero readings are
 *  dropped). An index-based window of N consecutive readings can span far
 *  more than N×interval minutes of wall time, badly distorting the
 *  rolling-max for any duration. Timestamp-aware sliding is the only
 *  correct approach for sparse data.
 *
 *  Requires `readings` to be sorted by timestamp ascending.
 *
 *  Returns null if the input is empty. */
function rollingMaxWithin(readings, durationMinutes) {
  if (!readings || !readings.length) return null;
  const durMs = Number(durationMinutes) * 60_000;
  if (!(durMs > 0)) return null;

  const n = readings.length;
  const times = new Array(n);
  const values = new Array(n);
  for (let i = 0; i < n; i++) {
    times[i] = new Date(readings[i].timestamp).getTime();
    values[i] = Number(readings[i].value) || 0;
  }

  let maxDepth = 0;
  let peakStartIdx = 0;
  let peakEndIdx   = 0;
  let left = 0;
  let windowSum = 0;
  for (let right = 0; right < n; right++) {
    windowSum += values[right];
    const tRight = times[right];
    // Drop readings whose timestamp is outside (tRight - durMs, tRight].
    while (left < right && times[left] <= tRight - durMs) {
      windowSum -= values[left];
      left++;
    }
    if (windowSum > maxDepth) {
      maxDepth = windowSum;
      peakStartIdx = left;
      peakEndIdx   = right;
    }
  }
  return {
    maxDepth,
    peakStart: readings[peakStartIdx].timestamp,
    peakEnd:   readings[peakEndIdx].timestamp,
  };
}

/** Convert an AEP string ("~5%", ">63.2%", "~0.5%") to a probability number
 *  for ascending sort. Lower = rarer. Mirrors the in-page aepStringToProb. */
function aepProb(aepStr) {
  if (!aepStr || typeof aepStr !== 'string') return 1;
  if (aepStr.startsWith('>')) return 1;
  const clean = aepStr.replace(/[~<>%]/g, '').trim();
  const v = parseFloat(clean);
  if (!Number.isFinite(v)) return 1;
  return v / 100;
}
