import { describe, it, expect, afterEach } from 'vitest';
import { SHOW, showPhase, boothLine, initShowNotes } from '../src/show.js';

const BEFORE = new Date('2026-11-18T15:00:00Z');
const DURING = new Date('2026-11-30T15:00:00Z');
const AFTER = new Date('2026-12-02T15:00:00Z');

describe('the trade show', () => {
  it('is IAFE in Louisville, Booth #410', () => {
    expect(SHOW).toEqual({ booth: '#410', city: 'Louisville', firstDay: '2026-11-30', lastDay: '2026-12-01', timeZone: 'America/New_York' });
  });

  it('is before the show until the end of Nov 29 in Louisville', () => {
    expect(showPhase(BEFORE)).toBe('before');
    expect(showPhase(new Date('2026-11-30T04:59:00Z'))).toBe('before'); // 11:59 PM Nov 29 Eastern
  });

  it('is during the show on Nov 30 and Dec 1 in Louisville', () => {
    expect(showPhase(new Date('2026-11-30T05:00:00Z'))).toBe('during'); // midnight Nov 30 Eastern
    expect(showPhase(new Date('2026-12-02T04:59:00Z'))).toBe('during'); // 11:59 PM Dec 1 Eastern
  });

  it('is after the show from Dec 2 in Louisville', () => {
    expect(showPhase(new Date('2026-12-02T05:00:00Z'))).toBe('after');
    expect(showPhase(new Date('2027-03-01T12:00:00Z'))).toBe('after');
  });

  it('gives the three lines exactly', () => {
    expect(boothLine(BEFORE)).toBe('See us at Booth #410 in Louisville, Nov 30 to Dec 1');
    expect(boothLine(DURING)).toBe("We're at Booth #410 today");
    expect(boothLine(AFTER)).toBe('Good to meet you in Louisville.');
  });
});

describe('initShowNotes', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  const page = () => {
    document.body.innerHTML = `
      <p class="booth-note" data-booth-note hidden>See it at Booth #410</p>
      <p class="booth-note" data-booth-note hidden>See it at Booth #410</p>
      <p data-booth-line></p>`;
    return [...document.querySelectorAll('[data-booth-note]')];
  };

  it('initShowNotes shows booth notes before and during the show and leaves them hidden after', () => {
    for (const [now, shown] of [[BEFORE, true], [DURING, true], [AFTER, false]]) {
      const notes = page();
      initShowNotes(document, now);
      for (const note of notes) expect(note.hidden, now.toISOString()).toBe(!shown);
      expect(document.querySelector('[data-booth-line]').textContent).toBe(boothLine(now));
    }
  });

  it('does nothing on a page without notes', () => {
    expect(() => initShowNotes(document, BEFORE)).not.toThrow();
  });
});
