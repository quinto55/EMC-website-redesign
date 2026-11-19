// The IAFE trade show. Booth notes are hidden in the HTML and shown from now until the show
// ends; the dates are counted on the calendar in Louisville's time zone.
export const SHOW = { booth: '#410', city: 'Louisville', firstDay: '2026-11-30', lastDay: '2026-12-01', timeZone: 'America/New_York' };

/** `now` as YYYY-MM-DD on the calendar in the show's time zone. */
function showDate(now) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: SHOW.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function showPhase(now = new Date()) {
  const today = showDate(now);
  if (today < SHOW.firstDay) return 'before';
  if (today <= SHOW.lastDay) return 'during';
  return 'after';
}

const LINES = {
  before: `See us at Booth ${SHOW.booth} in ${SHOW.city}, Nov 30 to Dec 1`,
  during: `We're at Booth ${SHOW.booth} today`,
  after: `Good to meet you in ${SHOW.city}.`,
};

export function boothLine(now = new Date()) {
  return LINES[showPhase(now)];
}

export function initShowNotes(doc = document, now = new Date()) {
  const phase = showPhase(now);
  if (phase !== 'after') {
    for (const note of doc.querySelectorAll('[data-booth-note]')) note.hidden = false;
  }
  for (const line of doc.querySelectorAll('[data-booth-line]')) line.textContent = boothLine(now);
}
