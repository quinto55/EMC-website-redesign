import { describe, it, expect } from 'vitest';
import { TICKET_TYPES, GATES, LIVE_BASELINE, totals as fairTotals, addOnsLine } from '../src/demo/sample-fair.js';
import { createBoardState, snapshot, mulberry32 } from '../src/demo/board-engine.js';
import { forecast } from '../src/demo/pace.js';
import { createDashState, advance, dashSnapshot, slowGates, GATE_MINUTES, CAPACITY } from '../src/demo/dashboard-engine.js';

const deepFreeze = (o) => {
  Object.values(o).forEach((v) => v && typeof v === 'object' && deepFreeze(v));
  return Object.freeze(o);
};
const sum = (xs) => xs.reduce((a, v) => a + v, 0);
const PLACES = ['Online', 'Gate 1', 'Gate 2', 'Box Office 1'];
/** The Admission types, named here rather than read from the engine: Adult, Child and the Family 4-pack. */
const ADMISSION = ['adult', 'child', 'family'];
/** Tickets today as the real board counts them, from a ledger's per-type counts: Admission only. */
const admissionOf = (byType) => sum(ADMISSION.map((id) => byType[id]));
/** The add-ons the real board lists under Tickets today, from a ledger's per-type counts (parking, then rides). */
const addOnsOf = (byType) => [{ kind: 'parking', sold: byType.parking }, { kind: 'rides', sold: byType.wristband }].filter((a) => a.sold > 0);

/** Independent books, kept only from what each advance says it applied (`state.applied`), starting at the baseline. */
function ledger() {
  const tickets = Object.fromEntries(Object.entries(LIVE_BASELINE.sold).map(([id, row]) => [id, row.online + row.box]));
  const scans = { ...LIVE_BASELINE.scannedByGate };
  return {
    tickets,
    scans,
    record(applied) {
      if (!applied) return;
      tickets[applied.sale.typeId] += applied.sale.qty;
      for (const [id, n] of Object.entries(applied.scans)) scans[id] += n;
    },
  };
}
const bucketTotal = (g) => sum(g.minutes) + g.current;

/** Every gate's minute buckets grew by exactly the scans the advance applied to that gate (less any minutes that rolled off). */
function expectBucketsTrackScans(before, after, at) {
  const rolls = Math.min(Math.floor(after.clock / 60) - Math.floor(before.clock / 60), GATE_MINUTES);
  for (const g of GATES) {
    const dropped = rolls > 0 ? sum(before.gates[g.id].minutes.slice(0, rolls)) : 0;
    const applied = after.applied ? after.applied.scans[g.id] : 0;
    expect(bucketTotal(after.gates[g.id]), `${at} ${g.id} minutes`).toBe(bucketTotal(before.gates[g.id]) - dropped + applied);
    expect(bucketTotal(after.gates[g.id]), `${at} ${g.id} minutes within admitted`).toBeLessThanOrEqual(after.board.scannedByGate[g.id]);
  }
}

/** Every number in the snapshot is finite and not negative, and no text says NaN, Infinity or undefined. */
function expectSane(value, path = 'snapshot') {
  if (typeof value === 'number') {
    expect(Number.isFinite(value) && value >= 0, `${path} = ${value}`).toBe(true);
  } else if (typeof value === 'string') {
    expect(value, path).not.toMatch(/NaN|Infinity|undefined/);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) expectSane(v, `${path}.${k}`);
  }
}

describe('the dashboard engine', () => {
  it('opens on the same books as the home board', () => {
    const s = dashSnapshot(createDashState());
    expect(s.totals.tickets).toBe(2880);
    expect(s.totals.gross).toBe(61284);
    expect(s.totals.admitted).toBe(2618);
    expect(s.clock.label).toBe('6:42 PM');
    const home = snapshot(createBoardState());
    expect([s.totals.tickets, s.totals.gross, s.totals.admitted]).toEqual([home.tickets, home.sales, home.scanned]);
    expect(s.gates.map((g) => g.admitted)).toEqual(home.gates.map((g) => g.scanned));
  });

  it('opens with the brief\'s starting figures', () => {
    const s = dashSnapshot(createDashState());
    expect(s.totals.orders).toBe(1512);
    expect(s.totals.avgOrder).toBe(40.53);
    expect([s.totals.refundCount, s.totals.refunds]).toEqual([4, 96]);
    expect(s.totals.addOns).toEqual([{ kind: 'parking', sold: 279 }, { kind: 'rides', sold: 788 }]);
    expect(s.registers.map((r) => [r.name, r.cashier])).toEqual([['Gate 1', 'Sam'], ['Gate 2', 'Riley'], ['Box Office 1', 'Jordan']]);
    const { recent, ...counts } = s.fraud;
    expect(counts).toEqual({ presentedAgain: 12, voided: 3, wrongEvent: 0, wrongDay: 2 });
    expect(recent).toHaveLength(2);
    expect(s.feed).toHaveLength(4);
    expect(s.feed[0].ageLabel).toBe('just now');
    expect(s.types.map((t) => t.name)).toEqual(TICKET_TYPES.map((t) => t.name));
    expect(s.pace.series[s.pace.series.length - 1]).toEqual({ minute: 1122, tickets: 2880 });
    const f = forecast(2880, 1122);
    expect({ projected: s.pace.projected, low: s.pace.low, high: s.pace.high }).toEqual(f);
    expect(f).toEqual({ projected: 4490, low: 4290, high: 4690 });
    expect(s.brief).toEqual({
      timeLabel: '6:42 PM',
      text: 'As of 6:42 PM: 2,880 tickets sold, plus 279 parking and 788 rides, $61,284 gross, 2,618 admitted, with 4,490 projected for the day (4,290 to 4,690).',
    });
  });

  it('each ticket type row names its kind, and the sell-out note uses the real words', () => {
    const s = dashSnapshot(createDashState());
    expect(s.types.map((t) => [t.id, t.kind])).toEqual([
      ['adult', 'admission'], ['child', 'admission'], ['wristband', 'rides'], ['family', 'admission'], ['parking', 'parking'],
    ]);
    const note = Object.fromEntries(s.types.map((t) => [t.id, t.note]));
    // The real board's typeStatus: "Sells out ~" and the minute it runs out at the last hour's pace (9:29:06 PM here).
    expect(note.wristband).toBe('Sells out ~9:29 PM');
    for (const id of ['adult', 'child', 'family', 'parking']) expect(note[id], id).toBe("Won't sell out today");
  });

  it('an add-on sale moves gross, orders and money but not Tickets today or the pace line', () => {
    // Opening at 6:44 PM, a minute's advance crosses the 6:45 PM quarter hour, which the pace line marks.
    const state = createDashState({ minute: 18 * 60 + 44 });
    const before = dashSnapshot(state);
    // Always 0.9: four parking passes at the box office, paid in cash at Box Office 1.
    const parked = advance(state, () => 0.9, { seconds: 61 });
    expect([parked.applied.sale.typeId, parked.applied.sale.qty, parked.applied.sale.channelId]).toEqual(['parking', 4, 'box']);
    const s = dashSnapshot(parked);
    expect(s.totals.tickets).toBe(before.totals.tickets);
    expect(s.totals.tickets).toBe(2880);
    expect(s.totals.addOns).toEqual([{ kind: 'parking', sold: 283 }, { kind: 'rides', sold: 788 }]);
    expect(s.totals.gross).toBe(before.totals.gross + 40);
    expect(s.totals.orders).toBe(before.totals.orders + 1);
    expect(s.tenders.find((x) => x.id === 'cash').amount).toBe(before.tenders.find((x) => x.id === 'cash').amount + 40);
    expect(s.registers.find((r) => r.name === 'Box Office 1').sales).toBe(before.registers.find((r) => r.name === 'Box Office 1').sales + 40);
    expect(s.types.find((x) => x.id === 'parking').sold).toBe(283);
    // The pace line, its quarter-hour mark and the forecast count Admission only.
    expect(s.pace.series.find((p) => p.minute === 18 * 60 + 45)).toEqual({ minute: 18 * 60 + 45, tickets: 2880 });
    expect(s.pace.series[s.pace.series.length - 1].tickets).toBe(2880);
    expect(Math.max(...s.pace.series.map((p) => p.tickets))).toBe(2880);
    expect({ projected: s.pace.projected, low: s.pace.low, high: s.pace.high }).toEqual(forecast(2880, s.clock.minute));
    // Always 0.5: three ride wristbands online.
    const rode = advance(parked, () => 0.5);
    expect([rode.applied.sale.typeId, rode.applied.sale.qty]).toEqual(['wristband', 3]);
    const r = dashSnapshot(rode);
    expect(r.totals.tickets).toBe(2880);
    expect(r.totals.addOns).toEqual([{ kind: 'parking', sold: 283 }, { kind: 'rides', sold: 791 }]);
    expect(r.totals.gross).toBe(s.totals.gross + 90);
    expect(r.tenders.find((x) => x.id === 'card_online').amount).toBe(s.tenders.find((x) => x.id === 'card_online').amount + 90);
    expect(r.pace.series[r.pace.series.length - 1].tickets).toBe(2880);
  });

  it('every panel agrees with the books after any number of sales', () => {
    const rng = mulberry32(11);
    let state = createDashState();
    let prev = dashSnapshot(state);
    const books = ledger();
    let online = 0;
    for (let i = 0; i < 400; i++) {
      const before = state;
      state = advance(state, rng);
      books.record(state.applied);
      const s = dashSnapshot(state);
      const t = s.totals;
      const at = `after sale ${i + 1}`;

      // Money: the three tenders are the gross, in whole percents that sum to 100.
      expect(s.tenders.map((x) => x.label), at).toEqual(['Online card', 'Box-office card', 'Cash']);
      expect(sum(s.tenders.map((x) => x.amount)), at).toBe(t.gross);
      expect(sum(s.tenders.map((x) => x.share)), at).toBe(100);
      expect(t.gross).toBe(fairTotals(state.board.sold).sales);

      // Orders: one sale is one order.
      expect(t.orders, at).toBe(prev.totals.orders + 1);
      expect(t.avgOrder, at).toBe(Math.round((t.gross / t.orders) * 100) / 100);
      expect([t.refundCount, t.refunds]).toEqual([4, 96]);

      // Ticket types: each type's sold figure is what the applied sales added to its baseline, never past what it
      // can sell; what is left is the rest of its capacity.
      expect(state.applied, at).not.toBeNull();
      for (const x of s.types) {
        expect(x.sold, `${at} ${x.id} sold`).toBe(books.tickets[x.id]);
        expect(x.sold, `${at} ${x.id} within capacity`).toBeLessThanOrEqual(CAPACITY[x.id]);
        expect(x.left, `${at} ${x.id} left`).toBe(CAPACITY[x.id] - x.sold);
      }
      // Tickets today are the Admission tickets; the add-ons are listed beside them.
      expect(admissionOf(books.tickets), at).toBe(t.tickets);
      expect(t.addOns, at).toEqual(addOnsOf(books.tickets));

      // Gates: each gate's admitted figure is what the applied scans added to its baseline; its minute buckets track
      // the same scans and never hold more than it admitted; 30 minutes each; the rate is the last 10 minutes' mean.
      for (const g of s.gates) expect(g.admitted, `${at} ${g.id} admitted`).toBe(books.scans[g.id]);
      expect(sum(Object.values(books.scans)), at).toBe(t.admitted);
      expectBucketsTrackScans(before, state, at);
      expect(t.admitted).toBeLessThanOrEqual(t.tickets);
      for (const g of s.gates) {
        expect(g.perMinute, `${at} ${g.id}`).toHaveLength(30);
        for (const v of g.perMinute) expect(Number.isInteger(v) && v >= 0).toBe(true);
        expect(g.rate).toBe(Math.round((sum(g.perMinute.slice(-10)) / 10) * 10) / 10);
        expect(typeof g.slow).toBe('boolean');
      }
      expect(t.gateRate).toBe(Math.round(sum(s.gates.map((g) => sum(g.perMinute.slice(-10)) / 10))));

      // Registers: the box office's two tenders, sale for sale; an online sale changes no register.
      const regSales = sum(s.registers.map((r) => r.sales));
      expect(regSales, at).toBe(s.tenders[1].amount + s.tenders[2].amount);
      const sale = state.applied.sale;
      if (sale.channelId === 'online') {
        online++;
        expect(s.registers.map((r) => r.sales), at).toEqual(prev.registers.map((r) => r.sales));
        expect(s.tenders[0].amount).toBe(prev.tenders[0].amount + sale.amount);
      } else {
        const changed = s.registers.filter((r, k) => r.sales !== prev.registers[k].sales);
        expect(changed, at).toHaveLength(1);
        expect(changed[0].sales - prev.registers.find((r) => r.id === changed[0].id).sales).toBe(sale.amount);
        expect(s.feed[0].where).toBe(`${changed[0].name} · ${sale.tender}`);
      }

      // Fraud: counts only grow, at most five recent tries.
      for (const k of ['presentedAgain', 'voided', 'wrongEvent', 'wrongDay']) expect(s.fraud[k], `${at} ${k}`).toBeGreaterThanOrEqual(prev.fraud[k]);
      expect(s.fraud.recent.length).toBeLessThanOrEqual(5);

      // Pace: the line ends at the tickets sold, inside the forecast range.
      const series = s.pace.series;
      expect(series[series.length - 1].tickets, at).toBe(t.tickets);
      for (let k = 1; k < series.length; k++) expect(series[k].tickets).toBeGreaterThanOrEqual(series[k - 1].tickets);
      expect(t.tickets).toBeLessThanOrEqual(s.pace.low);
      expect(s.pace.low).toBeLessThanOrEqual(s.pace.projected);
      expect(s.pace.projected).toBeLessThanOrEqual(s.pace.high);

      // The newest sale leads the feed.
      expect(s.feed[0].id).toBe(sale.id);
      expect(s.feed[0].amount).toBe(sale.amount);
      expect(s.feed[0].lines).toBe(`${sale.qty}× ${sale.typeName}`);
      expect(s.feed).toHaveLength(4);
      prev = s;
    }
    expect(online).toBeGreaterThan(100); // both kinds of sale were exercised
    expect(online).toBeLessThan(300);
    expect(prev.fraud.presentedAgain).toBeGreaterThan(12); // about one advance in forty adds a try
    expect(prev.fraud.presentedAgain).toBeLessThan(30);
  });

  it('the clock moves forward with each advance and the feed ages', () => {
    let state = createDashState();
    const first = dashSnapshot(state);
    expect(first.feed.map((x) => x.ageLabel)).toEqual(['just now', '19 s ago', '47 s ago', '1 min ago']);
    state = advance(state, mulberry32(3));
    const next = dashSnapshot(state);
    expect(next.clock.minute).toBeCloseTo(first.clock.minute + 1.7 / 60, 9);
    expect(next.feed[0].ageLabel).toBe('just now');
    expect(next.feed[1].id).toBe(first.feed[0].id);
    expect(next.feed[1].ageLabel).toBe('just now'); // 2 s + 1.7 s: still under 5 s
    expect(next.feed[2].ageLabel).toBe('21 s ago');
    state = advance(state, mulberry32(4), { seconds: 120 });
    const later = dashSnapshot(state);
    expect(later.clock.label).toBe('6:44 PM');
    expect(later.feed[1].ageLabel).toBe('2 min ago');
    state = advance(state, mulberry32(5), { seconds: 60 * 30 });
    expect(dashSnapshot(state).clock.label).toBe('7:14 PM');
  });

  it('never mutates the state it was given', () => {
    const state = deepFreeze(createDashState());
    const before = JSON.stringify(state);
    let next = advance(state, mulberry32(1));
    // Across a minute boundary and a brief rewrite too.
    next = advance(deepFreeze(next), mulberry32(2), { seconds: 200 });
    expect(JSON.stringify(state)).toBe(before);
    expect(next).not.toBe(state);
    expect(() => dashSnapshot(deepFreeze(next))).not.toThrow();
  });

  it('is the same run for the same seed', () => {
    const run = (seed) => {
      const rng = mulberry32(seed);
      let state = createDashState();
      for (let i = 0; i < 60; i++) state = advance(state, rng);
      return dashSnapshot(state);
    };
    expect(run(3)).toEqual(run(3));
    expect(run(3)).not.toEqual(run(4));
    expect(dashSnapshot(createDashState())).toEqual(dashSnapshot(createDashState()));
  });

  it('shows only Online and the box-office registers as places; never a store', () => {
    const rng = mulberry32(5);
    let state = createDashState();
    for (let i = 0; i < 300; i++) {
      state = advance(state, rng);
      const s = dashSnapshot(state);
      for (const x of s.feed) {
        const [place, tender] = x.where.split(' · ');
        expect(PLACES, x.where).toContain(place);
        expect(place === 'Online' ? ['Card'] : ['Card', 'Cash']).toContain(tender);
      }
      const words = JSON.stringify(s);
      for (const w of ['Walgreens', 'Circle K', 'Menards', 'Retail', 'retail', 'store', 'Store']) expect(words).not.toContain(w);
    }
    expect(dashSnapshot(state).registers.map((r) => r.name)).toEqual(['Gate 1', 'Gate 2', 'Box Office 1']);
  });

  it('keeps every gate\'s minutes within what it admitted today', () => {
    const state = createDashState();
    for (const g of GATES) {
      const m = state.gates[g.id];
      expect(m.minutes).toHaveLength(GATE_MINUTES);
      expect(sum(m.minutes) + m.current, g.id).toBeLessThanOrEqual(state.board.scannedByGate[g.id]);
    }
  });

  it('rewrites the AI brief from the snapshot every three minutes', () => {
    const rng = mulberry32(8);
    let state = createDashState();
    for (let i = 0; i < 105; i++) state = advance(state, rng); // 178.5 seconds
    expect(dashSnapshot(state).brief.timeLabel).toBe('6:42 PM');
    state = advance(state, rng); // 180.2 seconds
    const s = dashSnapshot(state);
    expect(s.brief.timeLabel).toBe('6:45 PM');
    const t = s.totals;
    const fmt = (n) => n.toLocaleString('en-US');
    expect(s.brief.text.startsWith(`As of 6:45 PM: ${fmt(t.tickets)} tickets sold, ${addOnsLine(t.addOns)}, $${fmt(t.gross)} gross, ${fmt(t.admitted)} admitted, with ${fmt(s.pace.projected)} projected for the day (${fmt(s.pace.low)} to ${fmt(s.pace.high)}).`)).toBe(true);
    // Any alert at that moment is in it, word for word.
    for (const a of s.alerts) expect(s.brief.text).toContain(a.text);
    expect(s.brief.text).not.toMatch(/[–—]/);
  });
});

describe('a board left open', () => {
  const OPEN = 18 * 60 + 42;
  const CLOSE = 23 * 60;

  it('stays true for 12,000 sales: a sell-out, the close and a fresh day', () => {
    const rng = mulberry32(31);
    let state = createDashState();
    const opening = dashSnapshot(state);
    let prev = opening;
    let books = ledger();
    let restarts = 0;
    const soldOutSeen = new Set();
    for (let i = 1; i <= 12000; i++) {
      const before = state;
      const soldOutBefore = new Set(soldOutSeen);
      state = advance(state, rng);
      const s = dashSnapshot(state);
      const at = `advance ${i}`;
      expectSane(s, at);

      // The clock never leaves the sample day: from the opening minute up to (not including) 11 PM.
      expect(s.clock.minute >= OPEN && s.clock.minute < CLOSE, `${at} clock ${s.clock.minute}`).toBe(true);
      expect(s.clock.label, at).toMatch(/^(6:(4[2-9]|5\d)|(7|8|9|10):[0-5]\d) PM$/);

      if (s.clock.minute < prev.clock.minute) {
        // The close: the sample day starts again from the opening books, in one step.
        restarts += 1;
        expect(s, `${at} restart`).toEqual(opening);
        expect(state.applied).toBeNull();
        books = ledger();
        soldOutSeen.clear();
      } else {
        books.record(state.applied);
        for (const k of ['tickets', 'gross', 'orders', 'admitted']) expect(s.totals[k], `${at} ${k}`).toBeGreaterThanOrEqual(prev.totals[k]);
        expectBucketsTrackScans(before, state, at);
        // A type that had sold out is never sold again, in the books or in Latest sales.
        if (state.applied) {
          const { sale } = state.applied;
          expect(soldOutBefore.has(sale.typeId), `${at} sold a sold-out ${sale.typeId}`).toBe(false);
          expect(s.feed[0].id).toBe(sale.id);
          for (const id of soldOutBefore) {
            const name = TICKET_TYPES.find((t) => t.id === id).name;
            expect(s.feed[0].lines.endsWith(`× ${name}`), `${at} Latest sales sells ${name}`).toBe(false);
          }
        }
      }
      for (const x of s.types) {
        expect(x.sold, `${at} ${x.id} sold`).toBe(books.tickets[x.id]);
        expect(x.sold, `${at} ${x.id} within capacity`).toBeLessThanOrEqual(CAPACITY[x.id]);
        expect(x.left, `${at} ${x.id} left`).toBe(CAPACITY[x.id] - x.sold);
        if (x.left === 0) {
          expect(x.note).toBe('Sold out');
          soldOutSeen.add(x.id);
        }
      }
      for (const g of s.gates) expect(g.admitted, `${at} ${g.id} admitted`).toBe(books.scans[g.id]);
      // Tickets today are the Admission tickets, the add-ons are listed beside them, and every admission is one of them.
      expect(s.totals.tickets, `${at} tickets`).toBe(admissionOf(books.tickets));
      expect(s.totals.addOns, `${at} add-ons`).toEqual(addOnsOf(books.tickets));
      expect(s.totals.admitted, `${at} admitted within tickets`).toBeLessThanOrEqual(s.totals.tickets);
      for (const x of s.types) if (x.state === 'sellout') expect(x.note, `${at} ${x.id}`).toMatch(/^Sells out ~\d{1,2}:\d{2} (AM|PM)$/);

      // Lists keep their size; the forecast stays above what is sold.
      expect(s.feed).toHaveLength(4);
      expect(s.fraud.recent.length).toBeLessThanOrEqual(5);
      expect(s.alerts.length).toBeLessThanOrEqual(GATES.length);
      expect(s.totals.tickets).toBeLessThanOrEqual(s.pace.low);
      expect(s.pace.low).toBeLessThanOrEqual(s.pace.projected);
      expect(s.pace.projected).toBeLessThanOrEqual(s.pace.high);
      prev = s;
    }
    expect(restarts).toBe(1);
    expect(soldOutSeen.has('wristband')).toBe(true); // it sold out again on the second day, too
  }, 180000);

  it('a ticket type that sells out reads "Sold out" with 0 left, and only the other types keep selling', () => {
    const rng = mulberry32(31);
    let state = createDashState();
    let soldOutAt = null;
    for (let i = 1; i <= 2500; i++) {
      state = advance(state, rng);
      const w = dashSnapshot(state).types.find((x) => x.id === 'wristband');
      if (soldOutAt === null && w.left === 0) {
        soldOutAt = i;
        expect(w).toMatchObject({ sold: CAPACITY.wristband, left: 0, note: 'Sold out', state: 'soldout' });
      }
      if (soldOutAt !== null && i > soldOutAt) expect(state.applied.sale.typeId).not.toBe('wristband');
    }
    expect(soldOutAt).not.toBeNull();
    // A visitor who watches for a while sees it: well inside the first hour.
    expect(soldOutAt * 1.7).toBeLessThan(60 * 60);
  }, 60000);

  it('with every type sold out the demo simply stops selling', () => {
    let state = createDashState();
    const full = { ...state.board.sold };
    for (const t of TICKET_TYPES) full[t.id] = { online: CAPACITY[t.id] - state.board.sold[t.id].box, box: state.board.sold[t.id].box };
    state = { ...state, board: { ...state.board, sold: full } };
    const before = dashSnapshot(state);
    const after = advance(state, mulberry32(4));
    const s = dashSnapshot(after);
    expect(after.applied).toBeNull();
    expect(s.totals.orders).toBe(before.totals.orders);
    expect(s.totals.tickets).toBe(before.totals.tickets);
    expect(s.feed.map((x) => x.id)).toEqual(before.feed.map((x) => x.id));
    expect(s.clock.minute).toBeGreaterThan(before.clock.minute);
  });

  it('other ticket types cannot sell out within the sample day, even at the demo\'s pace', () => {
    // From the opening to the close the board makes about 9,100 sales; at most a quarter of them (once the
    // wristbands are gone), four tickets each, could fall on one type.
    const sales = Math.ceil(((CLOSE - OPEN) * 60) / 1.7);
    for (const t of TICKET_TYPES.filter((x) => x.id !== 'wristband')) {
      const opening = LIVE_BASELINE.sold[t.id].online + LIVE_BASELINE.sold[t.id].box;
      expect(opening + (sales / 4) * 2.5 * 1.3, t.id).toBeLessThan(CAPACITY[t.id]);
    }
  });
});

describe('the slow gate on the sample board', () => {
  it('no gate is slow when the board opens, so the alerts row starts empty', () => {
    const s = dashSnapshot(createDashState());
    expect(s.gates.map((g) => g.slow)).toEqual([false, false, false]);
    expect(s.alerts).toEqual([]);
  });

  it('North Gate is flagged within the first two minutes of watching, by the same rule as the alert', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = mulberry32(seed);
      let state = createDashState();
      let flaggedAt = null;
      for (let i = 1; i <= 71 && flaggedAt === null; i++) {
        state = advance(state, rng);
        const s = dashSnapshot(state);
        if (s.gates.some((g) => g.slow)) flaggedAt = i;
      }
      expect(flaggedAt, `seed ${seed}`).not.toBeNull();
      const s = dashSnapshot(state);
      expect(s.gates.filter((g) => g.slow).map((g) => g.name), `seed ${seed}`).toEqual(['North Gate']);
    }
  });

  it('the Slow flags and the alerts always agree, and the flag clears again', () => {
    const rng = mulberry32(17);
    let state = createDashState();
    let seen = false;
    let cleared = false;
    for (let i = 0; i < 1100; i++) {
      state = advance(state, rng);
      const s = dashSnapshot(state);
      const facts = GATES.map((g) => ({ id: g.id, name: g.name, perMinute: state.gates[g.id].minutes, lagSeconds: 0 }));
      const rule = slowGates(facts);
      expect(s.gates.filter((g) => g.slow).map((g) => g.name)).toEqual(rule.map((r) => r.name));
      expect(s.alerts).toEqual(rule.map((r) => ({ kind: 'slow_gate', text: `${r.name} is admitting ${r.fewerPct}% less than its usual share.` })));
      if (rule.length) seen = true;
      else if (seen) cleared = true;
    }
    expect(seen).toBe(true);
    expect(cleared).toBe(true);
  });
});

// A few of the real board's own cases (app/lib/live/analytics.test.ts), to show the rule came across unchanged.
describe('slowGates, ported from the real board', () => {
  const runs = (...r) => r.flatMap(([minutes, each]) => Array(minutes).fill(each));
  const gate = (name, perMinute, over = {}) => ({ id: name, name, perMinute, lagSeconds: 0, ...over });
  const boardAt = (gates, end) => gates.map((x) => ({ ...x, perMinute: x.perMinute.slice(Math.max(0, end + 1 - GATE_MINUTES), end + 1) }));

  it('gates of different sizes are never slow while each keeps its own pace', () => {
    expect(slowGates([gate('Main Gate', runs([130, 10])), gate('North Gate', runs([130, 5]))])).toEqual([]);
    expect(slowGates([gate('Main Gate', runs([130, 10])), gate('East Gate', runs([130, 10])), gate('North Gate', runs([130, 4]))])).toEqual([]);
  });

  it('waits for a baseline: no alert in the first minutes of admissions; the same fall after nearly two hours is one', () => {
    const early = [gate('Main Gate', runs([115, 0], [15, 10])), gate('North Gate', runs([115, 0], [5, 10], [10, 2]))];
    expect(slowGates(early)).toEqual([]);
    const later = [gate('Main Gate', runs([20, 0], [110, 10])), gate('North Gate', runs([20, 0], [100, 10], [10, 2]))];
    expect(slowGates(later)).toEqual([{ name: 'North Gate', fewerPct: 67 }]);
  });

  it('a gate that goes silent is not slow from the minute its 10-minute window empties, and a slow state clears there', () => {
    const gates = [gate('Main Gate', runs([200, 10])), gate('Ride Gate', runs([200, 10])), gate('North Gate', runs([150, 10], [20, 2], [30, 0]))];
    const northAt = (end) => slowGates(boardAt(gates, end)).map((g) => g.name);
    expect(northAt(157)).toEqual([]);
    expect(northAt(158)).toEqual(['North Gate']);
    expect(northAt(178)).toEqual(['North Gate']);
    for (let end = 179; end < 200; end++) expect(northAt(end)).toEqual([]);
  });

  it('with fewer than two counted gates there is no alert', () => {
    expect(slowGates([gate('Main Gate', runs([120, 10], [10, 0]))])).toEqual([]);
  });
});
