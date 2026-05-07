/* Stormgauge — rainfall-day grouping helper.
   Two supported modes:
     'midnight' — Sydney calendar day, 12:00am to 11:59pm (default)
     '9am'      — BOM-style rainfall day, 9:00am to 8:59am next day
                  labelled with the START date (the day the period opens).

   Mode 'midnight' is the existing Stormgauge behaviour and remains the
   default everywhere; '9am' is opt-in via the top control. */

export const RAINFALL_DAY_MODES = Object.freeze(['midnight', '9am']);

export const RAINFALL_DAY_LABELS = Object.freeze({
  midnight: 'midnight to 11:59pm',
  '9am':    '9:00am to 8:59am',
});

export const RAINFALL_DAY_BUTTON_LABELS = Object.freeze({
  midnight: 'Midnight day',
  '9am':    '9am day (BOM)',
});

export const RAINFALL_DAY_PERIOD_LABEL = Object.freeze({
  midnight: '24hr periods from midnight (Sydney)',
  '9am':    '24hr periods from 9am (Sydney; BOM rainfall day)',
});

const SYDNEY = 'Australia/Sydney';

/** Returns YYYY-MM-DD for the rainfall-day the timestamp belongs to.
 *  - 'midnight': the Sydney calendar date of the timestamp.
 *  - '9am':      the Sydney wall-clock date AFTER subtracting 9 hours,
 *                so 8:59am is still "yesterday's 9am rainfall day".
 *  Returns null when the timestamp can't be parsed. */
export function rainfallDayKey(timestamp, mode = 'midnight') {
  if (timestamp == null) return null;
  const t = (timestamp instanceof Date)
    ? timestamp
    : new Date(typeof timestamp === 'string' ? timestamp.replace(' ', 'T') : timestamp);
  if (Number.isNaN(t.getTime())) return null;

  if (mode === '9am') {
    // Read the Sydney wall-clock components, subtract 9 hours, return the
    // resulting calendar date. This handles AEST/AEDT correctly because
    // we shift in wall-clock time, not UTC.
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: SYDNEY,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(t);
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    const naive = new Date(Date.UTC(
      get('year'), get('month') - 1, get('day'),
      get('hour'), get('minute'), get('second'),
    ));
    naive.setUTCHours(naive.getUTCHours() - 9);
    const Y = naive.getUTCFullYear();
    const M = String(naive.getUTCMonth() + 1).padStart(2, '0');
    const D = String(naive.getUTCDate()).padStart(2, '0');
    return `${Y}-${M}-${D}`;
  }

  // midnight: Sydney calendar date of the timestamp
  return t.toLocaleDateString('en-CA', { timeZone: SYDNEY });
}

/** Build a day-keyed object of summed rainfall.
 *  readings: [{ timestamp, value }]
 *  Returns { 'YYYY-MM-DD': totalMm, ... }. */
export function groupReadingsByRainfallDay(readings, mode = 'midnight') {
  const out = {};
  if (!Array.isArray(readings)) return out;
  for (const r of readings) {
    if (!r || r.timestamp == null) continue;
    const v = Number(r.value);
    if (!Number.isFinite(v)) continue;
    const k = rainfallDayKey(r.timestamp, mode);
    if (!k) continue;
    out[k] = (out[k] || 0) + v;
  }
  return out;
}

/** Robust mm formatter — null/undefined/NaN/Infinity all return the
 *  fallback string instead of "NaN mm" / "Infinity mm". */
export function formatRainfallMm(value, decimals = 1, fallback = '-') {
  if (value == null) return fallback;            // null and undefined → fallback (Number(null) === 0 trap)
  const n = (typeof value === 'number') ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return `${n.toFixed(decimals)} mm`;
}

/** "since midnight" / "since 9am" suffix that pairs with the rainToday
 *  display. */
export function rainTodaySinceLabel(mode = 'midnight') {
  return mode === '9am' ? 'since 9am' : 'since midnight';
}
