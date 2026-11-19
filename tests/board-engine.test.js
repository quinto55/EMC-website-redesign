import { describe, it, expect } from 'vitest';
import { TICKET_TYPES, totals } from '../src/demo/sample-fair.js';
import { mulberry32, createBoardState, nextSale, snapshot, count, money, SAMPLE_FEED } from '../src/demo/board-engine.js';

const deepFreeze = (o) => {
  Object.values(o).forEach((v) => v && typeof v === 'object' && deepFreeze(v));
  return Object.freeze(o);
};

describe('the board engine', () => {
  it('every sale keeps the books straight', () => {
    const rng = mulberry32(7);
    let state = createBoardState();
    // An independent ledger, kept from the sale objects alone.
    let tickets = 3947;
    let sales = 61284;
    for (let i = 0; i < 500; i++) {
      const prev = state;
      const r = nextSale(state, rng);
      state = r.state;
      tickets += r.sale.qty;
      sales += r.sale.amount;
      const s = snapshot(state);
      expect(s.tickets).toBe(tickets);
      expect(s.sales).toBe(sales);
      expect(totals(state.sold).tickets).toBe(tickets);
      expect(totals(state.sold).sales).toBe(sales);
      // exactly one cell of `sold` changed, by exactly qty, and it is the cell the sale names
      for (const t of TICKET_TYPES) {
        for (const channelId of ['online', 'box']) {
          const delta = state.sold[t.id][channelId] - prev.sold[t.id][channelId];
          const named = t.id === r.sale.typeId && channelId === r.sale.channelId;
          expect(delta, `${t.id}/${channelId}`).toBe(named ? r.sale.qty : 0);
        }
      }
      expect(s.channels.reduce((a, c) => a + c.share, 0)).toBe(100);
      expect(s.scanned).toBeLessThanOrEqual(s.tickets);
      expect(r.sale.qty).toBeGreaterThanOrEqual(1);
      expect(r.sale.qty).toBeLessThanOrEqual(4);
      expect(['online', 'box']).toContain(r.sale.channelId);
      expect(r.sale.amount).toBe(r.sale.qty * TICKET_TYPES.find((t) => t.id === r.sale.typeId).price);
      if (r.sale.channelId === 'online') {
        expect(r.sale.tender).toBe('Card');
        expect(r.sale.place).toBe('Online');
      } else {
        expect(r.sale.place).toBe('Box office');
        expect(['Card', 'Cash']).toContain(r.sale.tender);
      }
    }
  });

  it('never scans more people in than tickets sold, even when the gates are caught up', () => {
    for (const short of [0, 1]) {
      for (let seed = 1; seed <= 40; seed++) {
        const base = createBoardState();
        let state = { ...base, scannedByGate: { main: snapshot(base).tickets - short, north: 0, midway: 0 } };
        const rng = mulberry32(seed);
        for (let i = 0; i < 20; i++) {
          state = nextSale(state, rng).state;
          const s = snapshot(state);
          expect(s.scanned, `short ${short}, seed ${seed}, sale ${i}`).toBeLessThanOrEqual(s.tickets);
        }
      }
    }
  });

  it('is the same run for the same seed', () => {
    const run = (seed) => {
      const rng = mulberry32(seed);
      let state = createBoardState();
      for (let i = 0; i < 40; i++) state = nextSale(state, rng).state;
      return snapshot(state);
    };
    expect(run(3)).toEqual(run(3));
    expect(run(3)).not.toEqual(run(4));
  });

  it('does not change the state it was given', () => {
    const state = deepFreeze(createBoardState());
    const before = JSON.stringify(state);
    const r = nextSale(state, mulberry32(1));
    expect(JSON.stringify(state)).toBe(before);
    expect(r.state).not.toBe(state);
  });

  it('keeps the feed newest first and no longer than feedSize', () => {
    const rng = mulberry32(5);
    let state = createBoardState();
    const ids = [];
    for (let i = 0; i < 12; i++) {
      const r = nextSale(state, rng);
      state = r.state;
      ids.push(r.sale.id);
      const feed = snapshot(state, { feedSize: 3 }).feed;
      expect(feed.length).toBe(3);
      expect(feed[0].id).toBe(r.sale.id);
    }
    expect(snapshot(state, { feedSize: 3 }).feed.map((s) => s.id)).toEqual(ids.slice(-3).reverse());
    expect(state.feed.length).toBe(8);
    expect(snapshot(state, { feedSize: 5 }).feed.length).toBe(5);
  });

  it('starts at the baseline: 3,947 tickets, $61,284, 2,618 scanned', () => {
    const s = snapshot(createBoardState());
    expect([s.tickets, s.sales, s.scanned]).toEqual([3947, 61284, 2618]);
    expect(s.gates.map((g) => g.scanned)).toEqual([1412, 731, 475]);
    expect(s.feed.length).toBe(3);
  });

  it('opens with eight fixed sample sales that are already counted', () => {
    const state = createBoardState();
    expect(state.feed.length).toBe(8);
    expect(SAMPLE_FEED.length).toBe(8);
    for (const s of SAMPLE_FEED) {
      expect(s.qty).toBeGreaterThanOrEqual(1);
      expect(s.qty).toBeLessThanOrEqual(4);
      expect(s.amount).toBe(s.qty * TICKET_TYPES.find((t) => t.id === s.typeId).price);
      expect(['online', 'box']).toContain(s.channelId);
    }
    expect(new Set(SAMPLE_FEED.map((s) => s.typeId)).size).toBe(5);
    expect(new Set(SAMPLE_FEED.map((s) => s.channelId)).size).toBe(2);
  });

  it('formats numbers', () => {
    expect(count(3947)).toBe('3,947');
    expect(money(61284)).toBe('$61,284');
  });
});
