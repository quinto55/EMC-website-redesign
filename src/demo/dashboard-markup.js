// The live dashboard as HTML, laid out as the real live board (EMC-Ticketing-Platform: app/components/live/*): the
// top bar, the SAMPLE ribbon, four tiles, the alerts row, three columns of panels and the brief strip.
// Pure (no browser globals): the generator renders the opening board at build time, and the view uses the same
// field, chart and row functions to update the served board in place.
import { FAIR, TICKET_KIND_LABEL, addOnsLine } from './sample-fair.js';
import { count } from './board-engine.js';
import { cents } from './dashboard-engine.js';
import { DAY_START_MIN, DAY_END_MIN, shareBy } from './pace.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dollars = (n) => '$' + count(n);
const attrs = (a) => Object.entries(a).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');

/** The newest fraud tries the panel lists (the real board shows those that fit whole). */
export const TRIES_SHOWN = 3;

// ── Texts ──────────────────────────────────────────────────────────────────────────────────────────────────

/** One decimal under 10 a minute (a quiet gate is not "0"), whole numbers above, as on the real board. */
const rateText = (r) => (r < 10 ? String(Math.round(r * 10) / 10) : count(Math.round(r)));

/**
 * The pace headline as the real board writes it for an event that sells add-ons (pace.tsx, `paceHeadline`): the
 * forecast counts Admission tickets, and the legend's first label says so. The range is written with "to".
 */
function paceHeadline(p) {
  if (!p.projected) return { text: 'Forecast after the first admission ticket', range: '' };
  return { text: `On pace for ${count(p.projected)} today`, range: `(${count(p.low)} to ${count(p.high)})` };
}

/** The legend's first label, the real board's `ADMISSION_SOLD`: what the chart and its forecast count. */
export const ADMISSION_SOLD = 'Admission tickets sold so far';

/** Every text on the board that can change, by key: the markup prints them, the view writes them again. */
export function dashFields(snap) {
  const t = snap.totals;
  const head = paceHeadline(snap.pace);
  const f = {
    'clock-hm': snap.clock.hm,
    'clock-sec': `:${snap.clock.seconds}`,
    'clock-period': snap.clock.period,
    // The add-ons sold, in place of the real board's "+N since" line, as it does whenever add-ons have sold (the sample
    // fair always has).
    'tickets-sub': addOnsLine(t.addOns) ?? '',
    'gross-sub': `Average order ${cents(t.avgOrder)}`,
    'orders-sub': t.refundCount === 0 ? 'No refunds today' : `${count(t.refundCount)} ${t.refundCount === 1 ? 'refund' : 'refunds'}, ${cents(t.refunds)}`,
    'admitted-sub': t.gateRate > 0 ? `${count(t.gateRate)} a minute at the gates` : 'No admissions in the last 10 minutes',
    'pace-head': head.text,
    'pace-range': head.range,
    'money-avg': `Average order ${cents(t.avgOrder)}`,
    'brief-at': snap.brief.timeLabel,
    'brief-text': snap.brief.text,
  };
  for (const g of snap.gates) {
    f[`gate-${g.id}-admitted`] = count(g.admitted);
    f[`gate-${g.id}-rate`] = rateText(g.rate);
  }
  for (const x of snap.tenders) {
    f[`tender-${x.id}-amount`] = dollars(x.amount);
    f[`tender-${x.id}-share`] = `${x.share}%`;
  }
  for (const x of snap.types) {
    f[`type-${x.id}-status`] = x.note;
    f[`type-${x.id}-figs`] = `${count(x.sold)} sold · ${count(x.left)} left`;
  }
  for (const r of snap.registers) {
    f[`reg-${r.id}-sales`] = dollars(r.sales);
    f[`reg-${r.id}-card`] = `${r.cardSeconds} s card sale`;
    f[`reg-${r.id}-drawer`] = `Drawer ${cents(r.drawer)}`;
    f[`reg-${r.id}-close`] = r.close ? r.close.text : '';
  }
  for (const k of FRAUD_KINDS.map(([key]) => key)) f[`fraud-${k}`] = count(snap.fraud[k]);
  return f;
}

/** The four tiles: the figure that counts up, and how it is written. */
export const TILES = [
  ['tickets', 'Tickets today', (t) => t.tickets],
  ['gross', 'Gross today', (t) => t.gross],
  ['orders', 'Orders', (t) => t.orders],
  ['admitted', 'Admitted', (t) => t.admitted],
];

const FRAUD_KINDS = [
  ['presentedAgain', 'Presented again'],
  ['voided', 'Voided'],
  ['wrongEvent', 'Wrong event'],
  ['wrongDay', 'Wrong day'],
];

// ── Charts (SVG, no library), as parts the markup draws and the view moves ───────────────────────────────────

/** The pace chart's drawing size before the browser measures its box. */
export const CHART_SIZE = { w: 520, h: 240 };
const PAD = { l: 46, r: 58, t: 22, b: 24 };
const AXIS_EVERY_MIN = 180;

/** A whole-ticket axis step of at least `raw`: 1, 2 or 5 x a power of ten, or 25, 250, 2,500 (the real board's). */
function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 && pow >= 10 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}
const path = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
const clampDay = (m) => Math.min(DAY_END_MIN, Math.max(DAY_START_MIN, m));
const fixed = (n) => n.toFixed(1);

/**
 * Today's Admission tickets against the expected day, with the forecast range ahead of now: every element of the
 * chart as { c (its hook), tag, cls, attrs, text }. Five axis lines and five hour labels always, so a tick only moves
 * them.
 */
export function paceChartParts(pace, size = CHART_SIZE) {
  const { w, h } = size;
  const series = pace.series.filter((p) => p.minute <= DAY_END_MIN);
  const sold = pace.series[pace.series.length - 1].tickets;
  const nowM = clampDay(pace.nowMinute);
  const shareNow = shareBy(nowM);
  const top = Math.max(sold, pace.high || 0, 10);
  const step = niceStep((top * 1.04) / 4);
  const yMax = step * 4;
  const iw = Math.max(1, w - PAD.l - PAD.r);
  const ih = Math.max(1, h - PAD.t - PAD.b);
  const X = (m) => PAD.l + ((clampDay(m) - DAY_START_MIN) / (DAY_END_MIN - DAY_START_MIN)) * iw;
  const Y = (v) => PAD.t + (1 - v / yMax) * ih;

  const actual = series.map((p) => [X(p.minute), Y(p.tickets)]);
  if (pace.nowMinute > DAY_END_MIN) actual.push([X(DAY_END_MIN), Y(sold)]);
  const nowX = X(nowM);
  const area = `${path(actual)}L${fixed(nowX)},${fixed(Y(0))}L${fixed(X(DAY_START_MIN))},${fixed(Y(0))}Z`;

  const quarters = [];
  for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += 15) quarters.push(m);
  const expected = pace.projected ? path(quarters.map((m) => [X(m), Y(pace.projected * shareBy(m))])) : '';
  const ahead = quarters.filter((m) => m > nowM);
  const coneAt = (end, m) => sold + ((end - sold) * (shareBy(m) - shareNow)) / Math.max(1e-6, 1 - shareNow);
  const cone = pace.projected && ahead.length
    ? `${path([[nowX, Y(sold)], ...ahead.map((m) => [X(m), Y(coneAt(pace.high, m))])])}${[...ahead].reverse().map((m) => `L${fixed(X(m))},${fixed(Y(coneAt(pace.low, m)))}`).join('')}Z`
    : '';

  const parts = [];
  for (let k = 0; k <= 4; k++) {
    const v = k * step;
    parts.push({ c: `yl${k}`, tag: 'line', cls: 'db-rule', attrs: { x1: PAD.l, x2: w - PAD.r, y1: fixed(Y(v)), y2: fixed(Y(v)) } });
    parts.push({ c: `yt${k}`, tag: 'text', cls: 'db-axis', attrs: { x: PAD.l - 8, y: fixed(Y(v)), dy: '0.32em', 'text-anchor': 'end' }, text: yMax >= 10000 && v > 0 ? `${count(v / 1000)}K` : count(v) });
  }
  // Every 3 hours, or every 6 where 3-hour labels would touch (a phone), as on the real board.
  const every = (iw * AXIS_EVERY_MIN) / (DAY_END_MIN - DAY_START_MIN) < 56 ? 2 : 1;
  for (let k = 0; k < 5; k++) {
    const m = DAY_START_MIN + k * AXIS_EVERY_MIN;
    const hr = Math.floor(m / 60);
    const text = k % every === 0 ? `${hr % 12 === 0 ? 12 : hr % 12} ${hr < 12 ? 'AM' : 'PM'}` : '';
    parts.push({ c: `xt${k}`, tag: 'text', cls: 'db-axis', attrs: { x: fixed(X(m)), y: h - 6, 'text-anchor': k === 0 ? 'start' : 'middle' }, text });
  }
  parts.push(
    { c: 'cone', tag: 'path', cls: 'db-cone', attrs: { d: cone } },
    { c: 'area', tag: 'path', cls: 'db-wash', attrs: { d: area, fill: 'url(#db-wash)' } },
    { c: 'expected', tag: 'path', cls: 'db-expected', attrs: { d: expected } },
    { c: 'sold', tag: 'path', cls: 'db-sold', attrs: { d: path(actual), stroke: 'url(#db-gold)', filter: 'url(#db-glow)' } },
    { c: 'now', tag: 'line', cls: 'db-now', attrs: { x1: fixed(nowX), x2: fixed(nowX), y1: PAD.t, y2: fixed(Y(0)) } },
    { c: 'now-label', tag: 'text', cls: 'db-axis', attrs: { x: fixed(nowX), y: PAD.t - 8, 'text-anchor': 'middle' }, text: 'Now' },
    { c: 'ping', tag: 'circle', cls: 'db-now__ping', attrs: { cx: fixed(nowX), cy: fixed(Y(sold)), r: 5 } },
    { c: 'dot', tag: 'circle', cls: 'db-now__dot', attrs: { cx: fixed(nowX), cy: fixed(Y(sold)), r: 5 } },
    { c: 'sold-label', tag: 'text', cls: 'db-label', attrs: { x: fixed(nowX - 10), y: fixed(Y(sold) - 10), 'text-anchor': 'end' }, text: count(sold) },
    { c: 'proj-label', tag: 'text', cls: 'db-label db-label--muted', attrs: { x: fixed(X(DAY_END_MIN) + 6), y: fixed(Y(pace.projected || 0)), dy: '0.32em' }, text: pace.projected ? count(pace.projected) : '' },
  );
  return {
    viewBox: `0 0 ${w} ${h}`,
    defs: { goldX1: PAD.l, goldX2: w - PAD.r, w, h },
    parts,
  };
}

const SPARK = { W: 120, H: 32, P: 4, RECENT: 10 };
/** A gate's last 30 minutes, on a scale every gate shares; the last 10 (what its rate measures) in gold, ending in a dot. */
export function sparkParts(values, max) {
  const { W, H, P, RECENT } = SPARK;
  const n = values.length;
  const pts = values.map((v, i) => [P + (i * (W - 2 * P)) / Math.max(1, n - 1), H - P - (v / max) * (H - 2 * P)]);
  const end = pts[n - 1] ?? [P, H - P];
  return [
    { c: 'area', tag: 'path', cls: 'db-spark__area', attrs: { d: n > 1 ? `${path(pts)}L${fixed(end[0])},${H - P}L${P},${H - P}Z` : '' } },
    { c: 'line', tag: 'path', cls: 'db-spark__line', attrs: { d: n > 1 ? path(pts) : '' } },
    { c: 'recent', tag: 'path', cls: 'db-spark__now', attrs: { d: n > 1 ? path(pts.slice(-RECENT)) : '' } },
    { c: 'dot', tag: 'circle', cls: 'db-spark__dot', attrs: { cx: fixed(end[0]), cy: fixed(end[1]), r: 3 } },
  ];
}
export const sparkMax = (gates) => Math.max(1, ...gates.flatMap((g) => g.perMinute));

const drawParts = (parts) => parts.map((p) => `<${p.tag} data-c="${p.c}" class="${p.cls}"${attrs(p.attrs)}>${p.text === undefined ? '' : esc(p.text)}</${p.tag}>`).join('');

function chartSVG(pace, size) {
  const model = paceChartParts(pace, size);
  const d = model.defs;
  return `<svg viewBox="${model.viewBox}" aria-hidden="true" focusable="false">` +
    '<defs>' +
    `<linearGradient id="db-gold" gradientUnits="userSpaceOnUse" x1="${d.goldX1}" y1="0" x2="${d.goldX2}" y2="0"><stop offset="0" stop-color="#ffd66b"/><stop offset="1" stop-color="#ff9c3d"/></linearGradient>` +
    '<linearGradient id="db-wash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb84f" stop-opacity="0.28"/><stop offset="1" stop-color="#ffb84f" stop-opacity="0"/></linearGradient>' +
    `<filter id="db-glow" filterUnits="userSpaceOnUse" x="0" y="0" width="${d.w}" height="${d.h}"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    '</defs>' +
    drawParts(model.parts) +
    '</svg>';
}

function sparkSVG(values, max) {
  const { W, H, P } = SPARK;
  return `<svg class="db-spark" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">` +
    `<line class="db-spark__base" x1="${P}" x2="${W - P}" y1="${H - P}" y2="${H - P}"></line>` +
    drawParts(sparkParts(values, max)) +
    '</svg>';
}

// ── Rows that come and go ──────────────────────────────────────────────────────────────────────────────────

/** A sale in Latest sales: a ticket stub, its amount and age on the torn-off end. */
export function feedItemHTML(x) {
  return `<li class="db-stub" data-id="${esc(x.id)}"><div class="db-stub__main"><p class="db-stub__lines">${esc(x.lines)}</p>` +
    `<p class="db-stub__where">${esc(x.where)}</p></div>` +
    `<div class="db-stub__amount"><strong>${esc(cents(x.amount))}</strong><span data-age>${esc(x.ageLabel)}</span></div></li>`;
}

/** A ticket presented again: who tried where, then when and where it was first used, and how long ago. */
export function tryItemHTML(r) {
  return `<li class="db-try" data-id="${esc(r.id)}"><p class="db-try__what">` +
    `<span class="db-try__line"><span class="db-try__tail">${esc(r.tail)}</span> tried again at ${esc(r.gate)}</span>` +
    `<span class="db-try__first"><span class="visually-hidden"> · </span>first used ${esc(r.firstLabel)} at ${esc(r.firstGate)}</span></p>` +
    `<span class="db-try__age" data-age>${esc(r.timeLabel)}</span></li>`;
}

/** An alert in the alerts row, word for word as the rule wrote it. */
export function alertHTML(a) {
  return `<p class="db-alert" data-kind="${esc(a.kind)}"><span class="db-alert__icon" aria-hidden="true">` +
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 2.2 19 17.8H1Z"/><path class="db-alert__mark" d="M10 7.6v4.6M10 14.6v.2"/></svg>' +
    `</span><span class="db-alert__text">${esc(a.text)}</span></p>`;
}

// ── The board ─────────────────────────────────────────────────────────────────────────────────────────────

const field = (f, key, tag = 'span', cls = '') => `<${tag}${cls ? ` class="${cls}"` : ''} data-f="${key}">${esc(f[key])}</${tag}>`;

function device(kind, state) {
  const name = kind === 'reader' ? 'Reader' : 'Printer';
  return `<span class="db-device" data-device="${kind}" data-state="${state}"><span class="db-device__dot" aria-hidden="true"></span>${name}` +
    `<span class="${state === 'online' ? 'visually-hidden' : 'db-device__state'}"> ${state}</span></span>`;
}

/** Everything inside the board's screen. `size` is the pace chart's drawing size (the browser passes its box's). */
export function renderDashboardInner(snap, { size = CHART_SIZE } = {}) {
  const f = dashFields(snap);
  const max = sparkMax(snap.gates);

  const tiles = TILES.map(([key, label, value]) => `<div class="db-tile" data-tile="${key}"><span class="db-tile__label">${label}</span>` +
    `<strong class="db-tile__value">${key === 'gross' ? '<span class="db-tile__unit">$</span>' : ''}<span data-f="${key}">${count(value(snap.totals))}</span></strong>` +
    field(f, `${key}-sub`, 'span', 'db-tile__sub') + '</div>').join('');

  const feed = `<div class="db-panel db-feed" data-panel="feed"><h3 class="db-panel__title">Latest sales</h3>` +
    `<ol class="db-feed__list">${snap.feed.map(feedItemHTML).join('')}</ol></div>`;

  const fraud = `<div class="db-panel db-fraud" data-panel="fraud"><h3 class="db-panel__title">Fraud watch</h3>` +
    `<ul class="db-fraud__counts">${FRAUD_KINDS.map(([k, label]) => `<li data-fraud="${k}"${snap.fraud[k] === 0 ? ' data-zero' : ''}>${field(f, `fraud-${k}`, 'strong')}<span>${label}</span></li>`).join('')}</ul>` +
    `<ol class="db-fraud__list">${snap.fraud.recent.slice(0, TRIES_SHOWN).map(tryItemHTML).join('')}</ol></div>`;

  const pace = '<div class="db-panel db-pace" data-panel="pace"><div class="db-pace__head">' +
    `<h3 class="db-pace__title">${field(f, 'pace-head')} ${field(f, 'pace-range', 'span', 'db-pace__range')}</h3>` +
    `<ul class="db-legend"><li><span class="db-key db-key--sold" aria-hidden="true"></span>${ADMISSION_SOLD}</li>` +
    '<li><span class="db-key db-key--expected" aria-hidden="true"></span>Expected at this pace</li>' +
    '<li><span class="db-key db-key--range" aria-hidden="true"></span>Forecast range</li></ul></div>' +
    `<div class="db-chart">${chartSVG(snap.pace, size)}</div></div>`;

  const types = '<div class="db-panel db-types" data-panel="types"><h3 class="db-panel__title">Ticket types today</h3><ul class="db-types__list">' +
    // Each row names its kind after the name, as the real board does for an event that sells add-ons.
    snap.types.map((x) => `<li class="db-type" data-type="${x.id}" data-state="${x.state}">` +
      `<span class="db-type__name"><span>${esc(x.name)}</span><span class="db-type__kind">${esc(TICKET_KIND_LABEL[x.kind])}</span></span>` +
      field(f, `type-${x.id}-status`, 'span', 'db-type__status') +
      `<span class="db-meter" aria-hidden="true"><span style="--fill:${meterFill(x)}"></span></span>` +
      field(f, `type-${x.id}-figs`, 'span', 'db-type__figs') + '</li>').join('') +
    '</ul></div>';

  const gates = '<div class="db-panel db-gates" data-panel="gates"><h3 class="db-panel__title">Gates</h3><ul class="db-gates__list">' +
    snap.gates.map((g) => {
      const alert = g.slow ? snap.alerts.find((a) => a.text.startsWith(`${g.name} `)) : null;
      return `<li class="db-gate" data-gate="${g.id}"${g.slow ? ' data-slow' : ''}><p class="db-gate__name"><span>${esc(g.name)}</span>` +
        `<span class="db-flag"${g.slow ? `${attrs({ title: alert ? alert.text : '' })}` : ' hidden'}>Slow</span></p>` +
        `<p class="db-gate__sub">${field(f, `gate-${g.id}-admitted`)} admitted</p>` +
        sparkSVG(g.perMinute, max) +
        `<p class="db-gate__rate">${field(f, `gate-${g.id}-rate`, 'strong')}<span>/min</span></p></li>`;
    }).join('') +
    '</ul></div>';

  const money = '<div class="db-panel db-money" data-panel="money"><div class="db-panel__head"><h3 class="db-panel__title">Money</h3>' +
    field(f, 'money-avg', 'span', 'db-money__avg') + '</div>' +
    `<div class="db-mix" aria-hidden="true">${snap.tenders.map((x) => `<span data-method="${x.id}" style="--part:${x.amount}"></span>`).join('')}</div>` +
    `<ul class="db-tenders">${snap.tenders.map((x) => `<li class="db-tender" data-method="${x.id}"><span class="db-swatch" aria-hidden="true"></span>` +
      `<span class="db-tender__label">${esc(x.label)}</span>${field(f, `tender-${x.id}-amount`, 'strong', 'db-tender__amount')}` +
      `${field(f, `tender-${x.id}-share`, 'span', 'db-tender__share')}</li>`).join('')}</ul></div>`;

  const registers = '<div class="db-panel db-regs" data-panel="registers"><h3 class="db-panel__title">Registers</h3><ul class="db-regs__list">' +
    snap.registers.map((r) => `<li class="db-reg" data-reg="${r.id}"><p class="db-reg__name"><span>${esc(r.name)}</span><span class="db-reg__cashier">${esc(r.cashier)}</span></p>` +
      `<p class="db-reg__devices">${device('reader', r.reader)}${device('printer', r.printer)}</p>` +
      `<p class="db-reg__figs">${field(f, `reg-${r.id}-sales`, 'strong', 'db-reg__sales')}${field(f, `reg-${r.id}-card`)}${field(f, `reg-${r.id}-drawer`)}` +
      `<span data-f="reg-${r.id}-close"${r.close ? ` data-close="${r.close.kind}"` : ''}>${esc(f[`reg-${r.id}-close`])}</span></p></li>`).join('') +
    '</ul></div>';

  const clock = snap.clock;
  return '<div class="db-bar">' +
    '<img class="db-logo" src="/emc-site/img/emc-logo-on-dark.png" width="309" height="250" alt="EMC Tickets" loading="lazy" decoding="async">' +
    `<p class="db-event">${esc(FAIR.name)}</p>` +
    '<p class="db-live"><span class="db-live__dot" aria-hidden="true"></span>LIVE</p>' +
    `<p class="db-clock"><time data-a="clock" datetime="${clock.datetime}">${field(f, 'clock-hm')}${field(f, 'clock-sec', 'span', 'db-clock__sec')}${field(f, 'clock-period', 'span', 'db-clock__period')}</time></p>` +
    '<span class="db-pill">Sample data</span>' +
    '<button type="button" class="db-btn" data-fullscreen hidden>Full screen</button>' +
    '</div>' +
    '<p class="db-ribbon">SAMPLE · simulated crowd</p>' +
    '<div class="db-grid">' +
    `<div class="db-tiles">${tiles}</div>` +
    `<div class="db-alerts" role="status" aria-label="Alerts">${snap.alerts.map(alertHTML).join('')}</div>` +
    `<div class="db-col" data-col="stream">${feed}${fraud}</div>` +
    `<div class="db-col" data-col="day">${pace}${types}</div>` +
    `<div class="db-col" data-col="ops">${gates}${money}${registers}</div>` +
    '</div>' +
    '<div class="db-brief"><div class="db-brief__head"><h3 class="db-brief__label">AI brief</h3>' +
    `<span class="db-brief__tag">sample</span>${field(f, 'brief-at', 'span', 'db-brief__at')}</div>` +
    `${field(f, 'brief-text', 'p', 'db-brief__text')}</div>`;
}

/** How full a ticket type's meter is: sold today of sold plus left. */
export const meterFill = (x) => `${(((x.sold + x.left) === 0 ? 1 : x.sold / (x.sold + x.left)) * 100).toFixed(1)}%`;

/**
 * The whole board: one sample container (data-sample) holding the dark screen and, on computers, the monitor's stand.
 * Its panels are h3s: it sits under the Live dashboard block's h2.
 */
export function renderDashboardHTML(snap) {
  return '<div class="db" data-dashboard data-sample role="group" aria-label="Sample live board">' +
    `<div class="db-screen">${renderDashboardInner(snap)}</div>` +
    '<div class="db-stand" aria-hidden="true"></div>' +
    '</div>';
}
