import { describe, it, expect } from 'vitest';
import { FAIR, TICKET_TYPES, CHANNELS, GATES, LIVE_BASELINE, totals } from '../src/demo/sample-fair.js';

describe('the sample fair', () => {
  it('the live baseline adds up to the board in the approved mockup', () => {
    const t = totals(LIVE_BASELINE.sold);
    expect(t.tickets).toBe(3947);
    expect(t.sales).toBe(61284);
    expect(t.byChannel.map((c) => [c.name, c.share])).toEqual([['Online', 62], ['Box office', 38]]);
    expect(Object.values(LIVE_BASELINE.scannedByGate).reduce((a, b) => a + b)).toBe(2618);
  });

  it('sales by type and by channel both sum to the total', () => {
    const t = totals(LIVE_BASELINE.sold);
    expect(t.byType.reduce((a, x) => a + x.sales, 0)).toBe(t.sales);
    expect(t.byChannel.reduce((a, x) => a + x.sales, 0)).toBe(t.sales);
    expect(t.byType.reduce((a, x) => a + x.tickets, 0)).toBe(t.tickets);
    expect(t.byChannel.reduce((a, x) => a + x.tickets, 0)).toBe(t.tickets);
    expect(t.byType.map((x) => x.id)).toEqual(TICKET_TYPES.map((x) => x.id));
  });

  it('channel shares are whole percents that always sum to 100', () => {
    for (const online of [1, 2, 3, 7, 333, 999]) {
      const sold = { adult: { online, box: 1000 - online }, child: { online: 0, box: 0 } };
      const t = totals(sold);
      expect(t.byChannel.reduce((a, c) => a + c.share, 0)).toBe(100);
    }
  });

  it('there are exactly two channels: Online and Box office', () => {
    expect(CHANNELS.map((c) => c.name)).toEqual(['Online', 'Box office']);
  });

  it('names the fair, its day and three gates', () => {
    expect(FAIR).toEqual({ name: 'Demo County Fair', day: 'Friday' });
    expect(GATES.map((g) => g.name)).toEqual(['Main Gate', 'North Gate', 'Midway Gate']);
  });
});
