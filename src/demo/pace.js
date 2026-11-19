// The sample fair's day: when its tickets sell, and where today is heading.
// Pure module (no browser globals): the page generator renders the opening board at build time.

/** The fair opens at 9 AM and closes at 11 PM (minutes of the day). */
export const DAY_START_MIN = 9 * 60;
export const DAY_END_MIN = 23 * 60;

/** Each hour's share of a day's sales, 9 AM to 10 PM: a slow morning, a steady afternoon, the evening peak. */
const HOURLY = [20, 30, 50, 60, 60, 60, 60, 70, 80, 90, 100, 90, 60, 32];
const DAY_TOTAL = HOURLY.reduce((a, w) => a + w, 0);
/** Below this share of the day the forecast is not yet meaningful; it is held here instead of dividing by nothing. */
const MIN_SHARE = 0.05;
/** The sample's own morning ran a little behind the usual curve (so its line and the expected one are told apart). */
const BEHIND = 1.15;

const ceil10 = (n) => Math.ceil(n / 10) * 10;

/** Share of the day's sales made by `minute`: 0 at open, 1 at close, never decreasing (clamped outside the day). */
export function shareBy(minute) {
  if (!(minute > DAY_START_MIN)) return 0;
  if (minute >= DAY_END_MIN) return 1;
  const hours = (minute - DAY_START_MIN) / 60;
  const whole = Math.floor(hours);
  let done = 0;
  for (let h = 0; h < whole; h++) done += HOURLY[h];
  return (done + (hours - whole) * HOURLY[whole]) / DAY_TOTAL;
}

/** Tickets the sample had sold by `minute`, when it had sold `ticketsNow` by `nowMinute`. */
export function soldBy(minute, ticketsNow, nowMinute) {
  const now = shareBy(nowMinute);
  if (minute >= nowMinute) return ticketsNow;
  if (now <= 0) return 0;
  return Math.round(ticketsNow * (shareBy(minute) / now) ** BEHIND);
}

/** Tickets sold so far: one point per half hour from open to now, the last one exactly `ticketsNow` at `nowMinute`. */
export function paceSeries(ticketsNow, nowMinute) {
  const points = [];
  for (let m = DAY_START_MIN; m < Math.min(nowMinute, DAY_END_MIN); m += 30) {
    points.push({ minute: m, tickets: soldBy(m, ticketsNow, nowMinute) });
  }
  points.push({ minute: nowMinute, tickets: ticketsNow });
  return points;
}

/**
 * Where the day is heading at this pace: what is sold over the share of the day gone, to the nearest 10, never below
 * what is already sold; the range around it narrows as the day goes on (to the nearest 50).
 */
export function forecast(ticketsNow, nowMinute) {
  const share = Math.max(shareBy(nowMinute), MIN_SHARE);
  const sold = ceil10(ticketsNow);
  const projected = Math.max(sold, Math.round(ticketsNow / share / 10) * 10);
  const band = Math.round((projected * (0.02 + 0.06 * (1 - share))) / 50) * 50;
  return { projected, low: Math.max(sold, projected - band), high: projected + band };
}
