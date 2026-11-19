// The live dashboard's engine, modeled on the real live board (EMC-Ticketing-Platform: app/lib/live/analytics.ts and
// app/components/live/*). It wraps the home board's engine, so both boards sell the same tickets, take the same money
// and scan the same people; this adds what the real board shows around them: orders, the tender mix, registers, gate
// minutes, fraud watch, the pace of the day and the brief. As on the real board, Tickets today, the pace line, the
// forecast and Admitted count Admission tickets only; the add-ons (ride wristbands, parking passes) are named beside
// them and count in gross, orders and the money. Plain data in, plain data out: state is never mutated.
// Pure module (no browser globals): the page generator renders the opening board at build time.
import { TICKET_TYPES, GATES, totals, wholePercents, addOnsLine } from './sample-fair.js';
import { createBoardState, nextSale, mulberry32, count } from './board-engine.js';
import { DAY_END_MIN, soldBy, paceSeries, forecast } from './pace.js';

/** Minutes of admissions kept for each gate: the slow-gate rule replays its last 30, each against the 90 before. */
export const GATE_MINUTES = 130;
const TREND_MINUTES = 30;
const FEED_SHOWN = 4;
const RECENT_TRIES = 5;
const SLOT_MINUTES = 15;
/** Each ticket type's sales are kept a minute at a time for the last hour (the sell-out estimate's pace). */
const HOUR_MINUTES = 60;
const BRIEF_EVERY_SECONDS = 180;
/** How many times a sale is drawn again before the board gives up on selling this time (every type sold out). */
const MAX_DRAWS = 12;
/** About one advance in forty, someone tries a ticket that was already used. */
const TRY_CHANCE = 1 / 40;

const sum = (xs) => xs.reduce((a, v) => a + v, 0);
const pick = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

// ── Labels, as the real board writes them (app/components/live/format.ts) ──────────────────────────────────────

/** A minute of the day as "6:42 PM". */
export function minuteLabel(minuteOfDay) {
  const m = ((Math.floor(minuteOfDay) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** How long before `now` something happened: "just now", "12 s ago", "5 min ago", then its time (seconds of the day). */
function ageLabel(at, now) {
  const seconds = Math.max(0, Math.round(now - at));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return minuteLabel(at / 60);
}

/** Dollars and cents, as the real board shows an average order, a refund total, a drawer or a sale. */
export const cents = (dollars) => '$' + dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── The slow-gate rule, ported unchanged from the real board (analytics.ts, `slowGates`) ───────────────────────

const GATE_RATE_MINUTES = 10;
const BASELINE_MINUTES = 90;
const REPLAY_MINUTES = 30;
const RAISE_AFTER = 3;
const SPAN_START_ADMISSIONS = 10;
const MIN_GATE_BASE = 45;
const GAP_MINUTES = 10;
const UNSETTLED_PCT = 10;
const MIN_ALL_NOW = 30;
const MIN_ALL_BASE = 180;
const SCANNER_LATE_SECONDS = 120;

/** Admissions a minute at a gate over the last 10 minutes (`perMinute` is oldest first). */
export function gateRate(perMinute) {
  const last = perMinute.slice(-GATE_RATE_MINUTES);
  return last.length ? sum(last) / last.length : 0;
}

const at = (perMinute, back) => perMinute[perMinute.length - 1 - back] ?? 0;
function admitted(perMinute, back, minutes) {
  let total = 0;
  for (let k = back; k < back + minutes; k++) total += at(perMinute, k);
  return total;
}
/** Whether a gate's shortfall now is larger than chance explains (expected - now >= 3 x the root of expected). */
function beyondChance(now, base, othersNow, othersBase) {
  if (othersBase <= 0) return false;
  const e = base * othersNow;
  const short = e - now * othersBase;
  if (short <= 0) return false;
  if (![short, e, othersBase].every(Number.isInteger)) return short * short >= 9 * e * othersBase;
  return BigInt(short) * BigInt(short) >= BigInt(9) * BigInt(e) * BigInt(othersBase);
}
function longestSilence(perMinute, oldest, newest) {
  let longest = 0;
  let run = 0;
  for (let k = oldest; k >= newest; k--) {
    run = at(perMinute, k) === 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
}

/**
 * The real board's rule: a gate is slow when its share of the admissions has fallen well below its own usual share
 * (under 60 % of it for three minutes in a row, by more than chance explains), compared only while the crowd's split
 * between the gates is settled; it clears at 80 %. `gates`: { id, name, perMinute (oldest first, the last entry the
 * latest complete minute), lagSeconds, live? }. Returns each slow gate with the share it has lost, in whole percent.
 */
export function slowGates(gates) {
  const candidates = gates.filter((g) => g.id !== null && !g.live && !(g.lagSeconds > SCANNER_LATE_SECONDS));
  if (candidates.length < 2) return [];
  const minutes = Array.from({ length: REPLAY_MINUTES }, (_, i) => REPLAY_MINUTES - 1 - i);
  const replay = minutes.map((back) => {
    const newest = back + GATE_RATE_MINUTES;
    const oldest = newest + BASELINE_MINUTES - 1;
    let first = oldest;
    while (first >= newest && candidates.reduce((a, g) => a + admitted(g.perMinute, first - GAP_MINUTES + 1, GAP_MINUTES), 0) < SPAN_START_ADMISSIONS) first--;
    const each = candidates.map((g) => {
      const now = admitted(g.perMinute, back, GATE_RATE_MINUTES);
      const base = admitted(g.perMinute, newest, BASELINE_MINUTES);
      const span = first >= newest ? admitted(g.perMinute, newest, first - newest + 1) : 0;
      const steady = first >= newest && base >= MIN_GATE_BASE && longestSilence(g.perMinute, first, newest) < GAP_MINUTES;
      return { now, base, span, steady };
    });
    const load = each.reduce((a, g) => a + g.now + g.span, 0);
    const unsteadyLoad = each.reduce((a, g) => a + (g.steady ? 0 : g.now + g.span), 0);
    const settled = first >= newest && 100 * unsteadyLoad < UNSETTLED_PCT * load;
    const counted = each.map((g) => settled && g.steady && g.now > 0);
    const all = each.reduce((a, g, i) => (counted[i] ? { gates: a.gates + 1, now: a.now + g.now, base: a.base + g.base } : a), { gates: 0, now: 0, base: 0 });
    return { each, counted, all };
  });
  const slow = [];
  candidates.forEach((g, gi) => {
    let isSlow = false;
    let run = 0;
    let share = { n: 0, d: 1 };
    replay.forEach(({ each, counted, all }) => {
      const mine = each[gi];
      const eligible = counted[gi] && all.gates >= 2 && all.now >= MIN_ALL_NOW && all.base >= MIN_ALL_BASE;
      share = { n: mine.now * all.base, d: mine.base * all.now };
      if (eligible && 5 * share.n < 3 * share.d && beyondChance(mine.now, mine.base, all.now - mine.now, all.base - mine.base)) {
        if (++run >= RAISE_AFTER) isSlow = true;
      } else {
        run = 0;
        if (!eligible || 5 * share.n >= 4 * share.d) isSlow = false;
      }
    });
    if (isSlow) slow.push({ name: g.name, fewerPct: Math.round((100 * (share.d - share.n)) / share.d) });
  });
  return slow;
}

/** The slow-gate alert's sentence, word for word as the real board writes it. */
const slowGateText = (g) => `${g.name} is admitting ${g.fewerPct}% less than its usual share.`;

// ── The sample fair's opening books (the baseline totals are the home board's) ────────────────────────────────

const OPENING_ORDERS = 1512;
const OPENING_REFUNDS = { count: 4, amount: 96 };
/** The box office's cash takings; the rest of its sales were by card. */
const BOX_CASH = 9328;
/** Three box-office registers, their sample cashiers (first names only, as on the real board) and the day so far. */
const REGISTERS = [
  { id: 'gate-1', name: 'Gate 1', cashier: 'Sam', card: 5210, cash: 3744, cardSeconds: 7, drawer: 844, variance: null },
  { id: 'gate-2', name: 'Gate 2', cashier: 'Riley', card: 4386, cash: 3102, cardSeconds: 9, drawer: 712, variance: 0 },
  { id: 'box-1', name: 'Box Office 1', cashier: 'Jordan', card: null, cash: null, cardSeconds: 6, drawer: 588, variance: -2 },
];
/**
 * What each ticket type can sell today. Ride wristbands run short: they sell out about 20 minutes into a visit (and
 * are then never sold again). The others are far above what the board can sell before the sample day closes.
 */
export const CAPACITY = { adult: 12000, child: 9000, wristband: 1180, family: 8000, parking: 8000 };
/** The opening feed's ages (seconds) and, for its box-office sales, which register rang them up. */
const FEED_AGES = [2, 19, 47, 83];
const FEED_REGISTERS = ['gate-1', 'box-1', 'gate-2', 'gate-1'];
/** Two tries already today: minutes before the board opens, and when each ticket was first used before that. */
const OPENING_TRIES = [
  { ago: 13, tail: '…4F2A9C', gate: 'North Gate', firstBefore: 31, firstGate: 'Main Gate' },
  { ago: 66, tail: '…B71E03', gate: 'Main Gate', firstBefore: 84, firstGate: 'Midway Gate' },
];

/**
 * Each gate's last 130 minutes of admissions, oldest first, within what it admitted today: a quiet late afternoon
 * building to the evening crowd. Over the last six minutes North Gate's scans thin out (the crowd moves to Main and
 * Midway), two minutes short of what the slow-gate rule needs to flag it; the minutes the board adds while it is
 * watched decide it. Deterministic, so the build and the browser open on the same board.
 */
function openingGateMinutes() {
  const rng = mulberry32(2026);
  const BUILD = GATE_MINUTES - TREND_MINUTES;
  const THIN = 6;
  const share = { main: 0.36, north: 0.36, midway: 0.28 };
  const thinned = { main: 14, north: 0, midway: 8 };
  const rate = (gateId, i) => {
    if (i >= GATE_MINUTES - THIN) return thinned[gateId];
    return share[gateId] * (i < BUILD ? 3 + (8 * i) / BUILD : 28);
  };
  const out = {};
  for (const g of GATES) {
    const minutes = [];
    let running = 0;
    let shown = 0;
    for (let i = 0; i < GATE_MINUTES; i++) {
      running += rate(g.id, i) * (0.9 + 0.2 * rng());
      const next = Math.round(running);
      minutes.push(next - shown);
      shown = next;
    }
    out[g.id] = { minutes, current: 0 };
  }
  return out;
}

const describeSale = (sale) => `${sale.qty}× ${sale.typeName}`;
const registerById = (id) => REGISTERS.find((r) => r.id === id);

/** The board as it opens, at `minute` (default 6:42 PM). */
export function createDashState({ minute = 18 * 60 + 42 } = {}) {
  const board = createBoardState();
  const t = totals(board.sold);
  const online = t.byChannel.find((c) => c.id === 'online').sales;
  const box = t.byChannel.find((c) => c.id === 'box').sales;
  const clock = minute * 60;

  // The third register holds what the box office took that the other two did not.
  const [r1, r2] = REGISTERS;
  const registers = REGISTERS.map((r) => ({
    ...r,
    card: r.card ?? box - BOX_CASH - r1.card - r2.card,
    cash: r.cash ?? BOX_CASH - r1.cash - r2.cash,
    reader: 'online',
    printer: 'online',
  }));

  let boxSeen = 0;
  const feed = board.feed.slice(0, FEED_SHOWN).map((sale, i) => ({
    id: sale.id,
    lines: describeSale(sale),
    where: sale.channelId === 'online' ? 'Online · Card' : `${registerById(FEED_REGISTERS[boxSeen++]).name} · ${sale.tender}`,
    amount: sale.amount,
    at: clock - FEED_AGES[i],
  }));

  // The last hour's sales of each type, spread evenly over its minutes: the curve's share of the day, by type. Every
  // type counts here, add-ons too: each type's own pace is what its sell-out note reads.
  const allTypes = sum(t.byType.map((x) => x.tickets));
  const lastHourAll = allTypes - soldBy(minute - HOUR_MINUTES, allTypes, minute);
  const typeMinutes = Object.fromEntries(t.byType.map((x) => [x.id, {
    minutes: Array(HOUR_MINUTES).fill((x.tickets * lastHourAll) / allTypes / HOUR_MINUTES),
    current: 0,
  }]));

  const state = {
    board,
    clock,
    openMinute: minute,
    applied: null,
    orders: OPENING_ORDERS,
    refunds: { ...OPENING_REFUNDS },
    tenders: { card_online: online, card_present: box - BOX_CASH, cash: BOX_CASH },
    registers,
    gates: openingGateMinutes(),
    fraud: {
      presentedAgain: 12,
      voided: 3,
      wrongEvent: 0,
      wrongDay: 2,
      recent: OPENING_TRIES.map((x, i) => ({
        id: `try-0${i}`, at: clock - x.ago * 60, tail: x.tail, gate: x.gate,
        firstAt: clock - (x.ago + x.firstBefore) * 60, firstGate: x.firstGate,
      })),
    },
    tries: 0,
    feed,
    pace: { base: { tickets: t.tickets, minute }, marks: [] }, // Admission tickets, as the real board's pace counts
    typeMinutes,
    brief: null,
  };
  return { ...state, brief: writeBrief(state) };
}

/** Minute buckets after `rolls` whole minutes: the current minute joins the record, the oldest leave. */
function roll(buckets, rolls, keep) {
  if (rolls <= 0) return buckets;
  const out = {};
  for (const [id, b] of Object.entries(buckets)) {
    const added = [b.current, ...Array(Math.min(rolls, keep) - 1).fill(0)];
    out[id] = { minutes: [...b.minutes, ...added].slice(-keep), current: 0 };
  }
  return out;
}

/**
 * Moves the sample clock on: whole minutes roll the gates' and types' buckets; each quarter hour crossed is marked
 * with the Admission tickets sold by then.
 */
function passTime(state, seconds) {
  const clock = state.clock + seconds;
  const rolls = Math.floor(clock / 60) - Math.floor(state.clock / 60);
  const gates = roll(state.gates, rolls, GATE_MINUTES);
  const typeMinutes = roll(state.typeMinutes, rolls, HOUR_MINUTES);
  let { pace } = state;
  const fromSlot = Math.floor(state.clock / (SLOT_MINUTES * 60));
  const toSlot = Math.floor(clock / (SLOT_MINUTES * 60));
  if (toSlot > fromSlot) {
    const tickets = totals(state.board.sold).tickets;
    const marks = [...pace.marks];
    for (let k = fromSlot + 1; k <= toSlot; k++) marks.push({ minute: k * SLOT_MINUTES, tickets });
    pace = { ...pace, marks };
  }
  return { ...state, clock, gates, typeMinutes, pace };
}

/**
 * The home board's next sale, drawn again from the same random stream while it would take a ticket type past what it
 * can sell (a sold-out type, or more tickets than are left of it). Null when no draw fits: every type is sold out.
 */
function nextSellableSale(board, rng) {
  for (let draw = 0; draw < MAX_DRAWS; draw++) {
    const next = nextSale(board, rng);
    const row = next.state.sold[next.sale.typeId];
    if (row.online + row.box <= CAPACITY[next.sale.typeId]) return next;
  }
  return null;
}

/**
 * One sale through the home board's engine, plus everything derived from it. What it applied is kept as `applied`
 * ({ sale, scans by gate }, or null when nothing could be sold). At the sample day's close (11 PM) the board starts the
 * day again from its opening books instead. Never mutates `state`.
 */
export function advance(state, rng = Math.random, { seconds = 1.7 } = {}) {
  if (state.clock + seconds >= DAY_END_MIN * 60) return createDashState({ minute: state.openMinute });
  const s = passTime(state, seconds);
  const drawn = nextSellableSale(s.board, rng);
  if (!drawn) return finish({ ...s, applied: null }, rng);
  const { state: board, sale } = drawn;

  // The money: an online sale is an online card payment; a box-office sale is rung up at one register.
  let { tenders, registers } = s;
  let where = 'Online · Card';
  if (sale.channelId === 'online') {
    tenders = { ...tenders, card_online: tenders.card_online + sale.amount };
  } else {
    const reg = pick(registers, rng);
    const cash = sale.tender === 'Cash';
    tenders = cash ? { ...tenders, cash: tenders.cash + sale.amount } : { ...tenders, card_present: tenders.card_present + sale.amount };
    registers = registers.map((r) => (r.id !== reg.id ? r : cash
      ? { ...r, cash: r.cash + sale.amount, drawer: r.drawer + sale.amount }
      : { ...r, card: r.card + sale.amount }));
    where = `${reg.name} · ${sale.tender}`;
  }

  // Scans go into the current minute of the gate that took them; tickets into their type's current minute.
  let { gates } = s;
  const scans = {};
  for (const g of GATES) {
    scans[g.id] = board.scannedByGate[g.id] - s.board.scannedByGate[g.id];
    if (scans[g.id] > 0) gates = { ...gates, [g.id]: { ...gates[g.id], current: gates[g.id].current + scans[g.id] } };
  }
  const typeRow = s.typeMinutes[sale.typeId];
  const typeMinutes = { ...s.typeMinutes, [sale.typeId]: { ...typeRow, current: typeRow.current + sale.qty } };

  const entry = { id: sale.id, lines: describeSale(sale), where, amount: sale.amount, at: s.clock };
  return finish({
    ...s, board, tenders, registers, gates, typeMinutes,
    applied: { sale, scans },
    orders: s.orders + 1,
    feed: [entry, ...s.feed].slice(0, FEED_SHOWN),
  }, rng);
}

/** What happens whether or not a sale was made: now and then a used ticket is presented again; the brief is rewritten. */
function finish(s, rng) {
  let { fraud, tries } = s;
  if (rng() < TRY_CHANCE) {
    tries += 1;
    const tail = '…' + Math.floor(rng() * 0x1000000).toString(16).toUpperCase().padStart(6, '0');
    const gate = pick(GATES, rng).name;
    const firstGate = pick(GATES, rng).name;
    const firstAt = s.clock - (8 + Math.floor(rng() * 150)) * 60;
    const attempt = { id: `try-${tries}`, at: s.clock, tail, gate, firstAt, firstGate };
    fraud = { ...fraud, presentedAgain: fraud.presentedAgain + 1, recent: [attempt, ...fraud.recent].slice(0, RECENT_TRIES) };
  }
  const next = { ...s, fraud, tries };
  // The brief is written again every three minutes, from the figures at that moment.
  return next.clock - next.brief.at >= BRIEF_EVERY_SECONDS ? { ...next, brief: writeBrief(next) } : next;
}

/** The figures the brief and the snapshot share. */
function figures(state) {
  const t = totals(state.board.sold);
  const minute = state.clock / 60;
  const facts = GATES.map((g) => ({ id: g.id, name: g.name, perMinute: state.gates[g.id].minutes, lagSeconds: 0 }));
  const slow = slowGates(facts);
  return {
    t,
    minute,
    admitted: sum(Object.values(state.board.scannedByGate)),
    forecast: forecast(t.tickets, minute),
    slow,
    alerts: slow.map((g) => ({ kind: 'slow_gate', text: slowGateText(g) })),
  };
}

/**
 * The AI brief's sample text: only snapshot figures (the Admission tickets, then the add-ons sold, as the real board's
 * summary names them), ranges written with "to", then any alert word for word.
 */
function writeBrief(state) {
  const f = figures(state);
  const p = f.forecast;
  const sold = [`${count(f.t.tickets)} tickets sold`, addOnsLine(f.t.addOns), `$${count(f.t.sales)} gross`, `${count(f.admitted)} admitted`];
  const text = [
    `As of ${minuteLabel(f.minute)}: ${sold.filter(Boolean).join(', ')}, ` +
      `with ${count(p.projected)} projected for the day (${count(p.low)} to ${count(p.high)}).`,
    ...f.alerts.map((a) => a.text),
  ].join(' ');
  return { at: state.clock, text };
}

/**
 * A ticket type's note, in the real board's words (pace.tsx, `typeStatus`): "Sold out"; "Sells out ~9:29 PM", the
 * minute it runs out at the last hour's pace, only when that is before closing; otherwise "Won't sell out today".
 */
function typeStatus(left, lastHour, minute) {
  if (left <= 0) return { state: 'soldout', note: 'Sold out' };
  if (lastHour > 0) {
    const at = minute + (left / lastHour) * 60;
    if (at < DAY_END_MIN) return { state: 'sellout', note: `Sells out ~${minuteLabel(at)}` };
  }
  return { state: 'ok', note: "Won't sell out today" };
}

function closeOf(variance) {
  if (variance === null) return null;
  if (variance > 0) return { kind: 'over', text: `Over ${cents(variance)}` };
  if (variance < 0) return { kind: 'short', text: `Short ${cents(-variance)}` };
  return { kind: 'even', text: 'Even' };
}

const TENDERS = [
  ['card_online', 'Online card'],
  ['card_present', 'Box-office card'],
  ['cash', 'Cash'],
];

/** Everything the board shows, as plain data. */
export function dashSnapshot(state) {
  const f = figures(state);
  const { t, minute } = f;
  const clockSeconds = Math.floor(state.clock % 60);
  const whole = Math.floor(minute);
  const hours = Math.floor((((whole % 1440) + 1440) % 1440) / 60);
  const slowNames = new Set(f.slow.map((g) => g.name));

  // The pace line (Admission tickets): the day before the board opened, each quarter hour marked since, then now.
  const { base, marks } = state.pace;
  const series = paceSeries(base.tickets, base.minute);
  for (const m of marks) if (m.minute > base.minute) series.push(m);
  if (minute > series[series.length - 1].minute) series.push({ minute, tickets: t.tickets });

  const amounts = TENDERS.map(([id]) => state.tenders[id]);
  const shares = wholePercents(amounts);

  return {
    clock: {
      minute,
      label: minuteLabel(minute),
      hm: minuteLabel(minute).split(' ')[0],
      seconds: String(clockSeconds).padStart(2, '0'),
      period: hours < 12 ? 'AM' : 'PM',
      datetime: `${String(hours).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}:${String(clockSeconds).padStart(2, '0')}`,
    },
    totals: {
      tickets: t.tickets,
      addOns: t.addOns,
      gross: t.sales,
      orders: state.orders,
      admitted: f.admitted,
      avgOrder: Math.round((t.sales / state.orders) * 100) / 100,
      refundCount: state.refunds.count,
      refunds: state.refunds.amount,
      gateRate: Math.round(sum(GATES.map((g) => gateRate(state.gates[g.id].minutes)))),
    },
    feed: state.feed.map(({ at: when, ...x }) => ({ ...x, ageLabel: ageLabel(when, state.clock) })),
    pace: { series, ...f.forecast, nowMinute: minute },
    gates: GATES.map((g) => {
      const minutes = state.gates[g.id].minutes;
      return {
        id: g.id,
        name: g.name,
        admitted: state.board.scannedByGate[g.id],
        perMinute: minutes.slice(-TREND_MINUTES),
        rate: Math.round(gateRate(minutes) * 10) / 10,
        slow: slowNames.has(g.name),
      };
    }),
    alerts: f.alerts,
    tenders: TENDERS.map(([id, label], i) => ({ id, label, amount: amounts[i], share: shares[i] })),
    types: TICKET_TYPES.map((type) => {
      const sold = t.byType.find((x) => x.id === type.id).tickets;
      // Never below 0: a type at its capacity is not sold again (`nextSellableSale`).
      const left = CAPACITY[type.id] - sold;
      const hour = state.typeMinutes[type.id];
      const lastHour = sum(hour.minutes) + hour.current;
      return { id: type.id, name: type.name, kind: type.kind, sold, left, ...typeStatus(left, lastHour, minute) };
    }),
    registers: state.registers.map((r) => ({
      id: r.id,
      name: r.name,
      cashier: r.cashier,
      sales: r.card + r.cash,
      cardSeconds: r.cardSeconds,
      drawer: r.drawer,
      reader: r.reader,
      printer: r.printer,
      close: closeOf(r.variance),
    })),
    fraud: {
      presentedAgain: state.fraud.presentedAgain,
      voided: state.fraud.voided,
      wrongEvent: state.fraud.wrongEvent,
      wrongDay: state.fraud.wrongDay,
      recent: state.fraud.recent.map((x) => ({
        id: x.id, tail: x.tail, gate: x.gate, firstLabel: minuteLabel(x.firstAt / 60), firstGate: x.firstGate,
        timeLabel: ageLabel(x.at, state.clock),
      })),
    },
    brief: { timeLabel: minuteLabel(state.brief.at / 60), text: state.brief.text },
  };
}
