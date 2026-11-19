import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './helpers/pages.js';
import { renderGateScanHTML } from '../src/demo/gate-scan.js';
import { mountGateScan } from '../src/demo/gate-scan-view.js';

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();

function served() {
  document.body.innerHTML = `<main><p>Before</p>${renderGateScanHTML()}<p>After</p></main>`;
  return document.querySelector('[data-demo="gate-scanning"]');
}
function mounted() {
  const el = served();
  const view = mountGateScan(el);
  const scan = el.querySelector('[data-gs-scan]');
  const reset = el.querySelector('[data-gs-reset]');
  const status = el.querySelector('[role="status"]');
  return { el, view, scan, reset, status };
}
/** The result as the visitor sees it: its kind, its icon, the words. */
function result(el) {
  const box = el.querySelector('[role="status"]');
  return {
    kind: box.getAttribute('data-result'),
    icon: box.querySelector('svg[aria-hidden="true"]') !== null,
    title: text(box.querySelector('.gs-result__title') ?? box),
    text: text(box),
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the gate scan demo', () => {
  it('mounting shows a phone frame with the sample ticket and a "Scan ticket" button', () => {
    const { el, scan, reset } = mounted();
    const phone = el.querySelector('.gs-phone');
    expect(phone).not.toBeNull();
    const img = phone.querySelector('img');
    expect(img.getAttribute('src')).toBe('/emc-site/img/sample-ticket-qr.svg');
    expect(img.getAttribute('alt')).toBeTruthy();
    for (const s of ['Demo County Fair', 'Adult admission', 'Sample ticket. Not valid for entry.']) expect(text(phone), s).toContain(s);
    expect(scan.hidden).toBe(false);
    expect(text(scan)).toBe('Scan ticket');
    expect(reset.hidden).toBe(true); // Start over appears only after the first scan
    expect(result(el).kind).toBeNull();
    expect(text(el.querySelector('[role="status"]'))).toBe('');
  });

  it('the first press admits the ticket: green, a check, "Admitted" and the answer the gate gets', () => {
    const { el, scan, reset } = mounted();
    scan.click();
    const r = result(el);
    expect(r.kind).toBe('admitted');
    expect(r.icon).toBe(true);
    expect(r.title).toBe('Admitted');
    expect(r.text).toContain('ADULT ADMISSION · FRI JUL 16 · #DCF-001234');
    expect(r.text).toContain('Main Gate · 2:14 PM');
    // What the status element reads out, word for word, in order.
    expect(el.querySelector('[role="status"]').textContent).toBe('Admitted ADULT ADMISSION · FRI JUL 16 · #DCF-001234 Main Gate · 2:14 PM');
    expect(text(scan)).toBe('Scan the same ticket again');
    expect(reset.hidden).toBe(false);
    expect(el.querySelector('[data-gs-note]').hidden).toBe(true);
  });

  it('the second press refuses it: red, a cross, "Duplicate", and when and where it was first used', () => {
    const { el, scan } = mounted();
    scan.click();
    scan.click();
    const r = result(el);
    expect(r.kind).toBe('refused');
    expect(r.icon).toBe(true);
    expect(r.title).toBe('Duplicate');
    expect(r.text).toContain('first used 2:14 PM at Main Gate');
    // This scan is at another gate, a few minutes later: a shared or copied ticket.
    expect(r.text).toContain('North Gate · 2:21 PM');
    expect(el.querySelector('[role="status"]').textContent).toBe('Duplicate first used 2:14 PM at Main Gate North Gate · 2:21 PM');
    expect(text(scan)).toBe('Scan the same ticket again');
    const note = el.querySelector('[data-gs-note]');
    expect(note.hidden).toBe(false);
    expect(text(note)).toContain('Fraud watch');
    expect(text(note)).toContain('Presented again');
  });

  it('every later press is refused again, a minute later each time, so each one reads (and is announced) as new', () => {
    const { el, scan } = mounted();
    scan.click();
    scan.click();
    scan.click();
    expect(result(el).kind).toBe('refused');
    expect(result(el).text).toContain('North Gate · 2:22 PM');
    expect(result(el).text).toContain('first used 2:14 PM at Main Gate');
    for (let i = 0; i < 50; i++) scan.click();
    expect(result(el).text).toContain('North Gate · 3:12 PM');
    expect(result(el).text).toContain('first used 2:14 PM at Main Gate');
  });

  it('"Start over" goes back to the start, and the ticket gets in once more', () => {
    const { el, scan, reset, status } = mounted();
    scan.click();
    scan.click();
    reset.focus();
    reset.click();
    expect(text(scan)).toBe('Scan ticket');
    expect(reset.hidden).toBe(true);
    expect(text(status)).toBe('');
    expect(status.hasAttribute('data-result')).toBe(false);
    expect(el.querySelector('[data-gs-note]').hidden).toBe(true);
    // The pressed button has gone, so focus moves to the scan button rather than being lost.
    expect(document.activeElement).toBe(scan);
    scan.click();
    expect(result(el).kind).toBe('admitted');
    expect(result(el).text).toContain('Main Gate · 2:14 PM');
  });

  it('focus stays on the scan button while it is pressed again and again', () => {
    const { scan } = mounted();
    scan.focus();
    scan.click();
    expect(document.activeElement).toBe(scan);
    scan.click();
    expect(document.activeElement).toBe(scan);
  });

  it('every control is a button', () => {
    const { el } = mounted();
    const buttons = [...el.querySelectorAll('button')];
    expect(buttons.map(text)).toEqual(['Scan ticket', 'Start over']);
    for (const b of buttons) expect(b.getAttribute('type')).toBe('button');
    expect(el.querySelectorAll('a, input, select, textarea, [tabindex], [role="button"], [onclick]')).toHaveLength(0);
  });

  it('results are announced through one status element that is there from the start', () => {
    const { el, scan, status } = mounted();
    const before = el.querySelectorAll('[role="status"]');
    expect(before).toHaveLength(1);
    scan.click();
    scan.click();
    const after = el.querySelectorAll('[role="status"]');
    expect(after).toHaveLength(1);
    expect(after[0]).toBe(status);
    expect(el.querySelectorAll('[aria-live]:not([role="status"]), [role="alert"]')).toHaveLength(0);
  });

  it('color is never the only signal: each result has a word and an icon, and the stylesheet colors them green and red', () => {
    const { el, scan } = mounted();
    scan.click();
    expect(result(el)).toMatchObject({ kind: 'admitted', icon: true, title: 'Admitted' });
    scan.click();
    expect(result(el)).toMatchObject({ kind: 'refused', icon: true, title: 'Duplicate' });
    const css = readFileSync(resolve(ROOT, 'src/styles/demo.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
    expect(css).toMatch(/\[data-result="admitted"\][^{]*\{[^}]*var\(--live/);
    expect(css).toMatch(/\[data-result="refused"\][^{]*\{[^}]*var\(--red/);
  });

  it('is sample data, and says so', () => {
    const { el } = mounted();
    expect(el.matches('[data-sample]')).toBe(true);
    expect(text(el)).toContain('Sample data');
  });

  it('builds the demo itself when it is given an empty element', () => {
    document.body.innerHTML = '<div data-demo="gate-scanning" data-sample></div>';
    const el = document.querySelector('[data-demo="gate-scanning"]');
    mountGateScan(el);
    el.querySelector('[data-gs-scan]').click();
    expect(result(el).title).toBe('Admitted');
  });

  it('after destroy() the buttons are gone and the demo is as it was served', () => {
    const { el, view, scan } = mounted();
    scan.click();
    view.destroy();
    for (const b of el.querySelectorAll('button')) expect(b.hidden).toBe(true);
    expect(text(el.querySelector('[role="status"]'))).toBe('');
    scan.click();
    expect(text(el.querySelector('[role="status"]'))).toBe('');
    view.destroy(); // twice is harmless
  });
});
