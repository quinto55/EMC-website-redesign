import { describe, it, expect } from 'vitest';
import { DAY_START_MIN, DAY_END_MIN, shareBy, paceSeries, forecast } from '../src/demo/pace.js';

const NOW = 18 * 60 + 42; // 6:42 PM

describe('the day curve', () => {
  it('opens at 9 AM and closes at 11 PM', () => {
    expect(DAY_START_MIN).toBe(540);
    expect(DAY_END_MIN).toBe(1380);
  });

  it('shareBy is 0 at open, 1 at close, never decreases, and clamps outside the day', () => {
    expect(shareBy(DAY_START_MIN)).toBe(0);
    expect(shareBy(DAY_END_MIN)).toBe(1);
    expect(shareBy(0)).toBe(0);
    expect(shareBy(DAY_START_MIN - 30)).toBe(0);
    expect(shareBy(DAY_END_MIN + 45)).toBe(1);
    expect(shareBy(2000)).toBe(1);
    let prev = 0;
    for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += 0.5) {
      const s = shareBy(m);
      expect(s, `minute ${m}`).toBeGreaterThanOrEqual(prev);
      expect(s).toBeLessThanOrEqual(1);
      prev = s;
    }
    // Something is sold in every hour of the day.
    for (let m = DAY_START_MIN; m < DAY_END_MIN; m += 60) expect(shareBy(m + 60)).toBeGreaterThan(shareBy(m));
  });
});

describe('the pace series', () => {
  it('never decreases and ends exactly at the tickets sold now', () => {
    const series = paceSeries(3947, NOW);
    expect(series[series.length - 1]).toEqual({ minute: 1122, tickets: 3947 });
    expect(series[0]).toEqual({ minute: DAY_START_MIN, tickets: 0 });
    for (let i = 1; i < series.length; i++) {
      expect(series[i].tickets).toBeGreaterThanOrEqual(series[i - 1].tickets);
      expect(series[i].minute).toBeGreaterThan(series[i - 1].minute);
    }
  });

  it('has one point per half hour from open to now, then now', () => {
    const minutes = paceSeries(3947, NOW).map((p) => p.minute);
    const halfHours = [];
    for (let m = DAY_START_MIN; m < NOW; m += 30) halfHours.push(m);
    expect(minutes).toEqual([...halfHours, NOW]);
    // On a half hour, the last half-hour point is now itself (no duplicate minute).
    expect(paceSeries(100, 600).map((p) => p.minute)).toEqual([540, 570, 600]);
  });
});

describe('the forecast', () => {
  it('projects the tickets sold now over the share of the day gone, to the nearest 10, with a range', () => {
    const f = forecast(3947, NOW);
    for (const v of [f.projected, f.low, f.high]) expect(v % 10, String(v)).toBe(0);
    expect(f.projected).toBe(Math.round(3947 / shareBy(NOW) / 10) * 10);
    expect(3947).toBeLessThanOrEqual(f.low);
    expect(f.low).toBeLessThanOrEqual(f.projected);
    expect(f.projected).toBeLessThanOrEqual(f.high);
    expect(f.high).toBeGreaterThan(f.low);
  });

  it('is never below what is already sold, even at closing time', () => {
    for (const [tickets, minute] of [[3944, DAY_END_MIN], [3944, DAY_END_MIN + 60], [12, DAY_START_MIN + 1], [0, NOW], [7, DAY_START_MIN]]) {
      const f = forecast(tickets, minute);
      expect(f.low, `${tickets} at ${minute}`).toBeGreaterThanOrEqual(tickets);
      expect(f.low).toBeLessThanOrEqual(f.projected);
      expect(f.projected).toBeLessThanOrEqual(f.high);
      for (const v of [f.projected, f.low, f.high]) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('narrows as the day goes on', () => {
    const width = (minute) => {
      const f = forecast(3000, minute);
      return (f.high - f.low) / f.projected;
    };
    expect(width(14 * 60)).toBeGreaterThan(width(21 * 60));
  });
});
