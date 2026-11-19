import { describe, it, expect } from 'vitest';
import { FAIR, TICKET_TYPES, CHANNELS, GATES, LIVE_BASELINE, totals, addOnsLine } from '../src/demo/sample-fair.js';

describe('the sample fair', () => {
  it('the live baseline adds up to the board in the approved mockup', () => {
    const t = totals(LIVE_BASELINE.sold);
    expect(t.sales).toBe(61284);
    expect(t.byChannel.map((c) => [c.name, c.share])).toEqual([['Online', 62], ['Box office', 38]]);
    expect(Object.values(LIVE_BASELINE.scannedByGate).reduce((a, b) => a + b)).toBe(2618);
  });

  it('tickets are Admission tickets only; wristbands and parking are add-ons', () => {
    const t = totals(LIVE_BASELINE.sold);
    expect(t.tickets).toBe(2880);
    expect(t.sales).toBe(61284);
    expect(t.addOns).toEqual([{ kind: 'parking', sold: 279 }, { kind: 'rides', sold: 788 }]);
    expect(addOnsLine(t.addOns)).toBe('plus 279 parking and 788 rides');
    // Adult, Child and the Family 4-pack are Admission; the wristband is Rides, the pass Parking (the real board's kinds).
    expect(TICKET_TYPES.map((x) => [x.id, x.kind])).toEqual([
      ['adult', 'admission'], ['child', 'admission'], ['wristband', 'rides'], ['family', 'admission'], ['parking', 'parking'],
    ]);
  });

  it('writes the add-ons line as the real board does', () => {
    expect(addOnsLine([])).toBeNull();
    expect(addOnsLine([{ kind: 'rides', sold: 1 }])).toBe('plus 1 ride');
    expect(addOnsLine([{ kind: 'parking', sold: 1 }])).toBe('plus 1 parking');
    expect(addOnsLine([{ kind: 'parking', sold: 1356 }, { kind: 'rides', sold: 1700 }])).toBe('plus 1,356 parking and 1,700 rides');
    expect(addOnsLine([{ kind: 'parking', sold: 2 }, { kind: 'rides', sold: 3 }, { kind: 'other', sold: 40 }])).toBe('plus 2 parking, 3 rides and 40 other add-ons');
    expect(addOnsLine([{ kind: 'other', sold: 1 }])).toBe('plus 1 other add-on');
  });

  it('names only the add-on kinds that have sold, in the real board\'s order', () => {
    expect(totals({ adult: { online: 5, box: 0 } }).addOns).toEqual([]);
    expect(totals({ wristband: { online: 2, box: 1 } })).toMatchObject({ tickets: 0, sales: 90, addOns: [{ kind: 'rides', sold: 3 }] });
    expect(totals({ wristband: { online: 1, box: 0 }, parking: { online: 0, box: 4 } }).addOns).toEqual([{ kind: 'parking', sold: 4 }, { kind: 'rides', sold: 1 }]);
  });

  it('sales by type and by channel both sum to the total; tickets and add-ons are every type between them', () => {
    const t = totals(LIVE_BASELINE.sold);
    expect(t.byType.reduce((a, x) => a + x.sales, 0)).toBe(t.sales);
    expect(t.byChannel.reduce((a, x) => a + x.sales, 0)).toBe(t.sales);
    const admission = t.byType.filter((x) => x.kind === 'admission');
    expect(admission.map((x) => x.id)).toEqual(['adult', 'child', 'family']);
    expect(admission.reduce((a, x) => a + x.tickets, 0)).toBe(t.tickets);
    const all = t.byType.reduce((a, x) => a + x.tickets, 0);
    expect(all).toBe(t.tickets + t.addOns.reduce((a, x) => a + x.sold, 0));
    expect(t.byChannel.reduce((a, x) => a + x.tickets, 0)).toBe(all);
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
