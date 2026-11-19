// The sample board's engine. Plain data in, plain data out: state is never mutated.
// Pure module (no browser globals): the page generator renders the opening board at build time.
import { TICKET_TYPES, GATES, LIVE_BASELINE, totals } from './sample-fair.js';

export const count = (n) => n.toLocaleString('en-US');
export const money = (n) => '$' + n.toLocaleString('en-US');

/** The standard 32-bit mulberry32 generator: the same seed gives the same run. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const price = (typeId) => TICKET_TYPES.find((t) => t.id === typeId).price;
const typeName = (typeId) => TICKET_TYPES.find((t) => t.id === typeId).name;
const sample = (n, typeId, qty, channelId, place, tender) => ({
  id: `sample-${n}`, qty, typeId, typeName: typeName(typeId), channelId, place, tender, amount: qty * price(typeId),
});

/** The eight sales the feed opens with, newest first. Display only: already inside the baseline totals. */
export const SAMPLE_FEED = [
  sample(8, 'adult', 2, 'online', 'Online', 'Card'),
  sample(7, 'wristband', 1, 'box', 'Box office', 'Cash'),
  sample(6, 'family', 1, 'online', 'Online', 'Card'),
  sample(5, 'parking', 3, 'box', 'Box office', 'Card'),
  sample(4, 'child', 4, 'online', 'Online', 'Card'),
  sample(3, 'adult', 1, 'box', 'Box office', 'Cash'),
  sample(2, 'wristband', 2, 'online', 'Online', 'Card'),
  sample(1, 'child', 2, 'box', 'Box office', 'Card'),
];

const FEED_KEPT = 8;

export function createBoardState(baseline = LIVE_BASELINE) {
  const sold = {};
  for (const [typeId, row] of Object.entries(baseline.sold)) sold[typeId] = { ...row };
  return { sold, scannedByGate: { ...baseline.scannedByGate }, feed: SAMPLE_FEED.map((s) => ({ ...s })), seq: 0 };
}

const pick = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
const sum = (obj) => Object.values(obj).reduce((a, v) => a + v, 0);

/** One new sale (5 Online to 3 Box office), plus 0 to 2 scans at a random gate, never past the tickets sold. */
export function nextSale(state, rng = Math.random) {
  const type = pick(TICKET_TYPES, rng);
  const qty = 1 + Math.min(3, Math.floor(rng() * 4));
  const online = rng() * 8 < 5;
  const channelId = online ? 'online' : 'box';
  const tender = online ? 'Card' : rng() < 0.5 ? 'Card' : 'Cash';
  const seq = state.seq + 1;
  const sale = {
    id: `live-${seq}`, qty, typeId: type.id, typeName: type.name, channelId,
    place: online ? 'Online' : 'Box office', tender, amount: qty * type.price,
  };

  const sold = { ...state.sold, [type.id]: { ...state.sold[type.id], [channelId]: state.sold[type.id][channelId] + qty } };
  const tickets = totals(sold).tickets;
  const room = tickets - sum(state.scannedByGate);
  const scans = Math.min(Math.floor(rng() * 3), Math.max(0, room));
  const gate = pick(GATES, rng).id;
  const scannedByGate = { ...state.scannedByGate, [gate]: state.scannedByGate[gate] + scans };

  return { state: { sold, scannedByGate, feed: [sale, ...state.feed].slice(0, FEED_KEPT), seq }, sale };
}

export function snapshot(state, { feedSize = 3 } = {}) {
  const t = totals(state.sold);
  return {
    tickets: t.tickets,
    sales: t.sales,
    scanned: sum(state.scannedByGate),
    channels: t.byChannel.map(({ id, name, share }) => ({ id, name, share })),
    gates: GATES.map((g) => ({ id: g.id, name: g.name, scanned: state.scannedByGate[g.id] })),
    feed: state.feed.slice(0, feedSize),
  };
}
