// The made-up fair every demo shares. Pure data and arithmetic: no browser globals,
// because the page generator imports this at build time.

export const FAIR = { name: 'Demo County Fair', day: 'Friday' };

export const TICKET_TYPES = [
  { id: 'adult', name: 'Adult admission', price: 12 },
  { id: 'child', name: 'Child admission', price: 6 },
  { id: 'wristband', name: 'Ride wristband', price: 30 },
  { id: 'family', name: 'Family 4-pack', price: 40 },
  { id: 'parking', name: 'Parking pass', price: 10 },
];

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

/** Where the live board and the dashboard open: 3,947 tickets, $61,284, 2,618 scanned. */
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

/** Totals for a `sold` table ({ typeId: { channelId: qty } }). Channel share is of sales, in whole percents. */
export function totals(sold) {
  const qty = (typeId, channelId) => sold[typeId]?.[channelId] ?? 0;
  const byType = TICKET_TYPES.map((t) => {
    const tickets = CHANNELS.reduce((a, c) => a + qty(t.id, c.id), 0);
    return { id: t.id, name: t.name, tickets, sales: tickets * t.price };
  });
  const channels = CHANNELS.map((c) => {
    const tickets = TICKET_TYPES.reduce((a, t) => a + qty(t.id, c.id), 0);
    const sales = TICKET_TYPES.reduce((a, t) => a + qty(t.id, c.id) * t.price, 0);
    return { id: c.id, name: c.name, tickets, sales };
  });
  const shares = wholePercents(channels.map((c) => c.sales));
  return {
    tickets: byType.reduce((a, t) => a + t.tickets, 0),
    sales: byType.reduce((a, t) => a + t.sales, 0),
    byType,
    byChannel: channels.map((c, i) => ({ ...c, share: shares[i] })),
  };
}
