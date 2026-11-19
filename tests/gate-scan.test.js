import { describe, it, expect } from 'vitest';
import { initialScanState, scanReduce, scanResult, SAMPLE_TICKET, dayLabel, responseLine, renderGateScanHTML } from '../src/demo/gate-scan.js';
import { FAIR, TICKET_TYPES } from '../src/demo/sample-fair.js';

const MAIN = { type: 'scan', at: '2:14 PM', gate: 'Main Gate' };
const NORTH = { type: 'scan', at: '2:21 PM', gate: 'North Gate' };
const MIDWAY = { type: 'scan', at: '2:22 PM', gate: 'Midway Gate' };
const run = (...actions) => actions.reduce(scanReduce, initialScanState());

describe('the gate scan', () => {
  it('starts ready, with nothing scanned and no result', () => {
    const s = initialScanState();
    expect(s).toEqual({ step: 'ready', scans: 0, firstScan: null });
    expect(scanResult(s)).toBeNull();
  });

  it('admits the first scan and records when and where it was', () => {
    const s = run(MAIN);
    expect(s).toEqual({ step: 'admitted', scans: 1, firstScan: { at: '2:14 PM', gate: 'Main Gate' } });
    const r = scanResult(s);
    expect(r.ok).toBe(true);
    expect(r.title).toBe('Admitted');
    // The answer a good ticket gets: the type in capitals, the day, the order number (the real desiredState).
    expect(r.detail).toBe('ADULT ADMISSION · FRI JUL 16 · #DCF-001234');
  });

  it('refuses the same ticket the second time, naming the first scan', () => {
    const s = run(MAIN, NORTH);
    expect(s).toEqual({ step: 'refused', scans: 2, firstScan: { at: '2:14 PM', gate: 'Main Gate' } });
    expect(scanResult(s)).toEqual({ ok: false, title: 'Duplicate', detail: 'first used 2:14 PM at Main Gate' });
  });

  it('refuses it a third time too, and the first scan never changes', () => {
    const s = run(MAIN, NORTH, MIDWAY);
    expect(s.step).toBe('refused');
    expect(s.scans).toBe(3);
    expect(s.firstScan).toEqual({ at: '2:14 PM', gate: 'Main Gate' });
    expect(scanResult(s).detail).toBe('first used 2:14 PM at Main Gate');
    const many = run(MAIN, ...Array.from({ length: 20 }, () => NORTH));
    expect(many.scans).toBe(21);
    expect(scanResult(many)).toEqual(scanResult(s));
  });

  it('starts over from any step', () => {
    for (const s of [run(), run(MAIN), run(MAIN, NORTH), run(MAIN, NORTH, MIDWAY)]) {
      const back = scanReduce(s, { type: 'reset' });
      expect(back).toEqual(initialScanState());
      expect(scanResult(back)).toBeNull();
    }
    // After a restart the ticket gets in once more, wherever it is scanned first.
    const again = run(MAIN, NORTH, { type: 'reset' }, NORTH);
    expect(again).toEqual({ step: 'admitted', scans: 1, firstScan: { at: '2:21 PM', gate: 'North Gate' } });
  });

  it('ignores an action it does not know, or a scan that says nowhere or no time', () => {
    for (const s of [run(), run(MAIN), run(MAIN, NORTH)]) {
      expect(scanReduce(s, { type: 'void' })).toBe(s);
      expect(scanReduce(s, {})).toBe(s);
      expect(scanReduce(s, undefined)).toBe(s);
      expect(scanReduce(s, { type: 'scan' })).toBe(s);
      expect(scanReduce(s, { type: 'scan', at: '2:14 PM' })).toBe(s);
    }
  });

  it('never changes the state it is given', () => {
    const s = run(MAIN);
    const copy = structuredClone(s);
    scanReduce(s, NORTH);
    scanReduce(s, { type: 'reset' });
    expect(s).toEqual(copy);
  });
});

describe('the sample ticket', () => {
  it('is an Adult admission at the sample fair, for the sample fair day', () => {
    expect(SAMPLE_TICKET.fair).toBe(FAIR.name);
    expect(SAMPLE_TICKET.typeName).toBe(TICKET_TYPES.find((t) => t.id === 'adult').name);
    expect(SAMPLE_TICKET.orderNumber).toMatch(/^DCF-\d{6}$/); // the real order number format: prefix and six digits
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' }).format(new Date(SAMPLE_TICKET.day));
    expect(weekday).toBe(FAIR.day);
  });

  it('writes the day and the response the way the real product does', () => {
    expect(dayLabel('2027-07-16')).toBe('FRI JUL 16');
    expect(dayLabel('2026-11-05')).toBe('THU NOV 5');
    expect(responseLine(SAMPLE_TICKET)).toBe('ADULT ADMISSION · FRI JUL 16 · #DCF-001234');
  });

  it('starts as the ticket, a hidden button and an empty result: complete without script', () => {
    document.body.innerHTML = renderGateScanHTML();
    const root = document.querySelector('[data-demo="gate-scanning"]');
    expect(root.matches('[data-sample]')).toBe(true);
    const img = root.querySelector('img');
    expect(img.getAttribute('src')).toBe('/emc-site/img/sample-ticket-qr.svg');
    expect(img.getAttribute('alt')).toBe('QR code for the sample ticket');
    expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
    expect(img.getAttribute('height')).toBe(img.getAttribute('width'));
    const t = root.textContent.replace(/\s+/g, ' ');
    for (const s of ['Sample data', 'Demo County Fair', 'Adult admission · Fri, Jul 16, 2027', 'Order DCF-001234', 'Sample ticket. Not valid for entry.']) expect(t, s).toContain(s);
    for (const b of root.querySelectorAll('button')) expect(b.hasAttribute('hidden'), b.textContent).toBe(true);
    expect(root.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(root.querySelector('[role="status"]').textContent.trim()).toBe('');
    expect(root.querySelector('[data-gs-rest]').hasAttribute('hidden')).toBe(true); // the resting line waits for the script too
    document.body.innerHTML = '';
  });
});
