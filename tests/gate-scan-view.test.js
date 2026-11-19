import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './helpers/pages.js';
import { renderGateScanHTML } from '../src/demo/gate-scan.js';
import { mountGateScan } from '../src/demo/gate-scan-view.js';

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
/** What the eye reads: the text without the parts drawn only for screen readers. */
function seen(el) {
  const copy = el.cloneNode(true);
  copy.querySelectorAll('.visually-hidden').forEach((n) => n.remove());
  return text(copy);
}

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
  const board = el.querySelector('[data-gs-board]');
  const phone = el.querySelector('.gs-phone');
  return { el, view, scan, reset, status, board, phone };
}
/** The result in the phone as the visitor sees it: its kind, its icon, the words. */
function result(el) {
  const box = el.querySelector('[data-gs-result]');
  return {
    kind: box.getAttribute('data-result'),
    icon: box.querySelector('svg[aria-hidden="true"]') !== null,
    title: text(box.querySelector('.gs-result__title') ?? box),
    text: text(box),
  };
}
/** The Fraud watch panel's words, as the board writes them. */
function boardRead(board) {
  return {
    title: text(board.querySelector('.db-panel__title')),
    tag: text(board.querySelector('.gs-board__tag')),
    counts: [...board.querySelectorAll('.db-fraud__counts li')].map(text),
    rows: [...board.querySelectorAll('.db-try')].map((li) => [seen(li.querySelector('.db-try__line')), seen(li.querySelector('.db-try__first'))]),
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the gate scan demo', () => {
  it('mounting shows a phone frame with the sample ticket and a "Scan ticket" button', () => {
    const { el, scan, reset, status, board } = mounted();
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
    expect(text(status)).toBe('');
    expect(board.hidden).toBe(true);
  });

  it('before a scan the result\'s place shows a quiet resting line, outside the status element, gone once a result shows', () => {
    const { el, scan, reset, status } = mounted();
    const rest = el.querySelector('[data-gs-rest]');
    const box = el.querySelector('[data-gs-result]');
    expect(rest).not.toBeNull();
    expect(rest.hidden).toBe(false);
    expect(text(rest)).toBe('Ready to scan');
    expect(rest.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(status.contains(rest)).toBe(false);
    expect(rest.contains(status)).toBe(false);
    expect(text(status)).toBe('');
    // It sits in the phone, in the result's place.
    expect(rest.closest('.gs-screen')).toBe(box.closest('.gs-screen'));
    expect(rest.parentElement).toBe(box.parentElement);
    scan.click();
    expect(rest.hidden).toBe(true);
    scan.click();
    expect(rest.hidden).toBe(true);
    reset.click();
    expect(rest.hidden).toBe(false);
    expect(text(status)).toBe('');
  });

  it('the first press admits the ticket: green, a check, "Admitted" and the answer the gate gets', () => {
    const { el, scan, reset, status, board } = mounted();
    scan.click();
    const r = result(el);
    expect(r.kind).toBe('admitted');
    expect(r.icon).toBe(true);
    expect(r.title).toBe('Admitted');
    expect(r.text).toBe('Admitted ADULT ADMISSION · FRI JUL 16 · #DCF-001234 Main Gate · 2:14 PM');
    expect(status.textContent).toBe('Admitted. ADULT ADMISSION · FRI JUL 16 · #DCF-001234. Main Gate, 2:14 PM.');
    expect(text(scan)).toBe('Scan the same ticket again');
    expect(reset.hidden).toBe(false);
    expect(board.hidden).toBe(true);
  });

  it('the second press: the phone shows only what the gate gets, Duplicate and where and when this scan was', () => {
    const { el, scan, phone } = mounted();
    scan.click();
    scan.click();
    const r = result(el);
    expect(r.kind).toBe('refused');
    expect(r.icon).toBe(true);
    expect(r.title).toBe('Duplicate');
    // This scan is at another gate, a few minutes later: a shared or copied ticket. Nothing else on the phone.
    expect(r.text).toBe('Duplicate North Gate · 2:21 PM');
    expect(text(phone)).not.toContain('first used');
    expect(text(scan)).toBe('Scan the same ticket again');
  });

  it('the second press shows, beside the phone, the live board\'s Fraud watch row: where and when the ticket was first used', () => {
    const { el, scan, board, phone } = mounted();
    scan.click();
    scan.click();
    expect(board.hidden).toBe(false);
    expect(phone.contains(board)).toBe(false);
    expect(board.closest('[data-sample]')).toBe(el);
    expect(board.closest('.gs-controls')).not.toBeNull(); // under the buttons, where the old sentence was
    expect(boardRead(board)).toEqual({
      title: 'Fraud watch',
      tag: 'Live board',
      counts: ['1 Presented again'],
      // The board's two lines; the ticket's code shown as the board shows a barcode, its last six characters.
      rows: [['…TICKET tried again at North Gate', 'first used 2:14 PM at Main Gate']],
    });
    // Read as one sentence by a screen reader, as on the real board.
    expect(text(board.querySelector('.db-try__what'))).toBe('…TICKET tried again at North Gate · first used 2:14 PM at Main Gate');
    // It is not a second live region.
    expect(board.querySelectorAll('[role="status"], [role="alert"], [aria-live]')).toHaveLength(0);
    expect(board.matches('[role="status"], [role="alert"], [aria-live]')).toBe(false);
    expect(el.textContent).not.toContain('This also shows on the live board');
  });

  it('what a screen reader hears on each press, once each', () => {
    const { scan, reset, status } = mounted();
    const heard = [];
    scan.click(); heard.push(status.textContent);
    scan.click(); heard.push(status.textContent);
    scan.click(); heard.push(status.textContent);
    reset.click(); heard.push(status.textContent);
    scan.click(); heard.push(status.textContent);
    scan.click(); heard.push(status.textContent);
    expect(heard).toEqual([
      'Admitted. ADULT ADMISSION · FRI JUL 16 · #DCF-001234. Main Gate, 2:14 PM.',
      "Duplicate. North Gate, 2:21 PM. The live board's Fraud watch shows it was first used 2:14 PM at Main Gate.",
      'Duplicate. North Gate, 2:22 PM.',
      '',
      'Admitted. ADULT ADMISSION · FRI JUL 16 · #DCF-001234. Main Gate, 2:14 PM.',
      "Duplicate. North Gate, 2:21 PM. The live board's Fraud watch shows it was first used 2:14 PM at Main Gate.",
    ]);
  });

  it('the status element is the only live region, outside the phone, and not drawn', () => {
    const { el, status, phone } = mounted();
    expect(phone.contains(status)).toBe(false);
    expect(status.classList.contains('visually-hidden')).toBe(true);
    expect(el.querySelector('[data-gs-result]').matches('[role], [aria-live]')).toBe(false);
  });

  it('every later press is refused again, a minute later each time, and the board row keeps saying the same thing', () => {
    const { el, scan, board, phone } = mounted();
    scan.click();
    scan.click();
    const row = boardRead(board).rows;
    scan.click();
    expect(result(el).text).toBe('Duplicate North Gate · 2:22 PM');
    expect(boardRead(board).rows).toEqual(row);
    expect(boardRead(board).counts).toEqual(['2 Presented again']); // the board counts each time it was presented again
    for (let i = 0; i < 50; i++) scan.click();
    expect(result(el).text).toBe('Duplicate North Gate · 3:12 PM');
    expect(boardRead(board).rows).toEqual(row);
    expect(boardRead(board).counts).toEqual(['52 Presented again']);
    expect(text(phone)).not.toContain('first used');
  });

  it('no "first used" inside the phone in any state', () => {
    const { scan, reset, phone } = mounted();
    const states = [text(phone)];
    scan.click(); states.push(text(phone));
    scan.click(); states.push(text(phone));
    scan.click(); states.push(text(phone));
    reset.click(); states.push(text(phone));
    for (const s of states) expect(s).not.toContain('first used');
  });

  it('"Start over" goes back to the start, and the ticket gets in once more', () => {
    const { el, scan, reset, status, board } = mounted();
    scan.click();
    scan.click();
    reset.focus();
    reset.click();
    expect(text(scan)).toBe('Scan ticket');
    expect(reset.hidden).toBe(true);
    expect(text(status)).toBe('');
    expect(el.querySelector('[data-gs-result]').hasAttribute('data-result')).toBe(false);
    expect(board.hidden).toBe(true);
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
    const { el, view, scan, board } = mounted();
    scan.click();
    scan.click();
    view.destroy();
    for (const b of el.querySelectorAll('button')) expect(b.hidden).toBe(true);
    expect(text(el.querySelector('[role="status"]'))).toBe('');
    expect(text(el.querySelector('[data-gs-result]'))).toBe('');
    expect(el.querySelector('[data-gs-rest]').hidden).toBe(true);
    expect(board.hidden).toBe(true);
    scan.click();
    expect(text(el.querySelector('[role="status"]'))).toBe('');
    view.destroy(); // twice is harmless
  });
});
