// The made-up fair every demo shares. Pure data and arithmetic: no browser globals,
// because the page generator imports this at build time.

export const FAIR = { name: 'Demo County Fair', day: 'Friday' };

/**
 * Each type has a kind, as on the real board (EMC-Ticketing-Platform: app/lib/commerce/ticket-kinds.ts). Admission
 * tickets are what the boards count as tickets and what the gates admit; the ride wristband and the parking pass are
 * add-ons, listed beside the tickets and counted in the money and the orders only.
 */
export const TICKET_TYPES = [
  { id: 'adult', name: 'Adult admission', price: 12, kind: 'admission' },
  { id: 'child', name: 'Child admission', price: 6, kind: 'admission' },
  { id: 'wristband', name: 'Ride wristband', price: 30, kind: 'rides' },
  { id: 'family', name: 'Family 4-pack', price: 40, kind: 'admission' },
  { id: 'parking', name: 'Parking pass', price: 10, kind: 'parking' },
];

/** Each kind's label, word for word as the real board prints it after a ticket type's name (`TICKET_KIND_LABEL`). */
export const TICKET_KIND_LABEL = { admission: 'Admission', parking: 'Parking', rides: 'Rides', other: 'Other' };
/** The add-on kinds, in the order the real board names them (`ADD_ON_KINDS`). */
const ADD_ON_KINDS = ['parking', 'rides', 'other'];
/** Each add-on kind's words for one and for more, as the real board writes them (`ADD_ON_WORDS`). */
const ADD_ON_WORDS = { parking: ['parking', 'parking'], rides: ['ride', 'rides'], other: ['other add-on', 'other add-ons'] };

// Two channels only, as in the real dashboard. Store sales are never shown live.
export const CHANNELS = [
  { id: 'online', name: 'Online' },
  { id: 'box', name: 'Box office' },
];

export const GATES = [
  { id: 'main', name: 'Main Gate' },
  { id: 'north', name: 'North Gate' },
  { id: 'midway', name: 'Midway Gate' },
];

/** Where the boards open: 2,880 tickets plus 279 parking and 788 rides, $61,284, 2,618 scanned. */
export const LIVE_BASELINE = {
  sold: {
    adult: { online: 1183, box: 726 },
    child: { online: 490, box: 301 },
    wristband: { online: 489, box: 299 },
    family: { online: 112, box: 68 },
    parking: { online: 173, box: 106 },
  },
  scannedByGate: { main: 1412, north: 731, midway: 475 },
};

/**
 * One closed day for the sample daily report: Thursday, about one and a half times the boards' opening figures. 5,918
 * sold (4,321 Admission tickets, 419 parking, 1,178 rides), $91,854; 3,927 admitted (Admission tickets only, so never
 * more than the 4,321 Admission tickets sold).
 */
export const DAY_REPORT = {
  day: 'Thursday',
  sold: {
    adult: { online: 1768, box: 1096 },
    child: { online: 734, box: 452 },
    wristband: { online: 731, box: 447 },
    family: { online: 168, box: 103 },
    parking: { online: 262, box: 157 },
  },
  scannedByGate: { main: 2118, north: 1097, midway: 712 },
};

/**
 * Whole percents of `values` that always sum to exactly 100 (largest-remainder rounding).
 * An all-zero input gives all zeros.
 */
export function wholePercents(values) {
  const sum = values.reduce((a, v) => a + v, 0);
  if (!sum) return values.map(() => 0);
  const raw = values.map((v) => (v * 100) / sum);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, v) => a + v, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

/**
 * The line under Tickets today, word for word as the real board writes it (`addOnsLine`): "plus 279 parking and 788
 * rides", or null when no add-on has sold.
 */
export function addOnsLine(addOns) {
  if (addOns.length === 0) return null;
  const items = addOns.map((a) => `${a.sold.toLocaleString('en-US')} ${ADD_ON_WORDS[a.kind][a.sold === 1 ? 0 : 1]}`);
  return `plus ${items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`}`;
}

/**
 * Totals for a `sold` table ({ typeId: { channelId: qty } }), counted as the real board counts them: `tickets` are the
 * Admission tickets only; `addOns` names each add-on kind that has sold ({ kind, sold }, in the real board's order);
 * `sales`, `byType` (each type's own count and sales) and `byChannel` count every type. Channel share is of sales, in
 * whole percents.
 */
export function totals(sold) {
  const qty = (typeId, channelId) => sold[typeId]?.[channelId] ?? 0;
  const byType = TICKET_TYPES.map((t) => {
    const tickets = CHANNELS.reduce((a, c) => a + qty(t.id, c.id), 0);
    return { id: t.id, name: t.name, kind: t.kind, tickets, sales: tickets * t.price };
  });
  const channels = CHANNELS.map((c) => {
    const tickets = TICKET_TYPES.reduce((a, t) => a + qty(t.id, c.id), 0);
    const sales = TICKET_TYPES.reduce((a, t) => a + qty(t.id, c.id) * t.price, 0);
    return { id: c.id, name: c.name, tickets, sales };
  });
  const shares = wholePercents(channels.map((c) => c.sales));
  const ofKind = (kind) => byType.reduce((a, t) => a + (t.kind === kind ? t.tickets : 0), 0);
  return {
    tickets: ofKind('admission'),
    addOns: ADD_ON_KINDS.map((kind) => ({ kind, sold: ofKind(kind) })).filter((a) => a.sold > 0),
    sales: byType.reduce((a, t) => a + t.sales, 0),
    byType,
    byChannel: channels.map((c, i) => ({ ...c, share: shares[i] })),
  };
}
