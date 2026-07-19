import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGES = [
  { file: 'index.html', container: '.cards', mini: false, rollClass: null,
    railText: 'ADMIT ONE ★',
    serials: ['№ 047291', '№ 047292', '№ 047293', '№ 047294'] },
  { file: 'what-we-do.html', container: '.feature-grid', mini: true, rollClass: 'roll-amber',
    railText: 'ALL ACCESS ★',
    serials: ['№ 047295', '№ 047296', '№ 047297', '№ 047298'] },
  { file: 'sell-onsite.html', container: '.feature-grid', mini: true, rollClass: 'roll-blue',
    railText: 'GATE PASS ★',
    serials: ['№ 047299', '№ 047300', '№ 047301', '№ 047302'] },
  { file: 'sell-online.html', container: '.feature-grid', mini: true, rollClass: 'roll-teal',
    railText: 'E-TICKET ★',
    serials: ['№ 047303', '№ 047304', '№ 047305', '№ 047306'] },
  { file: 'sell-social.html', container: '.feature-grid', mini: true, rollClass: 'roll-magenta',
    railText: 'VIP PASS ★',
    serials: ['№ 047307', '№ 047308', '№ 047309', '№ 047310'] },
];

const docs = PAGES.map((page) => {
  const filePath = resolve(__dirname, '..', page.file);
  const html = readFileSync(filePath, 'utf8');
  return { ...page, doc: new DOMParser().parseFromString(html, 'text/html') };
});

describe('ticket anatomy site-wide', () => {
  for (const { file, container, doc } of docs) {
    it(`${file}: four ticket cards, full print detail, aria-hidden`, () => {
      const cards = [...doc.querySelectorAll(`${container} .card`)];
      expect(cards).toHaveLength(4);
      for (const card of cards) {
        expect(card.querySelector('.card__frame[aria-hidden="true"]')).not.toBeNull();
        expect(card.querySelectorAll('.card__rail[aria-hidden="true"]')).toHaveLength(2);
        expect(card.querySelector('.card__rail--l')).not.toBeNull();
        expect(card.querySelector('.card__rail--r')).not.toBeNull();
        expect(card.querySelector('.card__serial[aria-hidden="true"]')).not.toBeNull();
        expect(card.querySelector('.card__perf[aria-hidden="true"]')).not.toBeNull();
        expect(card.querySelector('.card__icon')).not.toBeNull();
        expect(card.querySelector('.card__title')).not.toBeNull();
        expect(card.querySelector('.card__body')).not.toBeNull();
      }
    });

    it(`${file}: serials continue the roll in document order`, () => {
      const found = [...doc.querySelectorAll(`${container} .card__serial span:last-child`)]
        .map((s) => s.textContent);
      expect(found).toEqual(docs.find((d) => d.file === file).serials);
    });
  }
});

describe('sub-page tiles are mini tickets', () => {
  for (const { file, container, doc } of docs.filter((d) => d.mini)) {
    it(`${file}: tiles carry card--mini, data-hotspot, data-reveal`, () => {
      for (const card of doc.querySelectorAll(`${container} .card`)) {
        expect(card.classList.contains('card--mini')).toBe(true);
        expect(card.hasAttribute('data-hotspot')).toBe(true);
        expect(card.hasAttribute('data-reveal')).toBe(true);
      }
    });

    it(`${file}: no legacy .feature tiles remain`, () => {
      expect(doc.querySelector('.feature')).toBeNull();
      expect(doc.querySelector('.feature__icon, .feature__title, .feature__body')).toBeNull();
    });
  }
});

describe('the roll', () => {
  it('all 20 serials are unique site-wide', () => {
    const all = docs.flatMap(({ doc }) =>
      [...doc.querySelectorAll('.card__serial span:last-child')].map((s) => s.textContent));
    expect(all).toHaveLength(20);
    expect(new Set(all).size).toBe(20);
  });
});

describe('roll stocks', () => {
  for (const { file, doc, rollClass, railText, container } of docs) {
    it(`${file}: body carries ${rollClass ?? 'no roll class'}`, () => {
      const classes = Array.from(doc.body.classList);
      if (rollClass) {
        expect(classes.filter((c) => c.startsWith('roll-'))).toEqual([rollClass]);
      } else {
        expect(classes.filter((c) => c.startsWith('roll-'))).toEqual([]);
      }
    });

    it(`${file}: all rails read the page's ticket type`, () => {
      const rails = [...doc.querySelectorAll(`${container} .card__rail`)];
      expect(rails).toHaveLength(8);
      for (const rail of rails) {
        expect(rail.textContent).toBe(railText);
      }
    });
  }
});
