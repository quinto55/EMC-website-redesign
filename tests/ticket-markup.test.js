import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');
const cards = [...doc.querySelectorAll('.cards .card')];

describe('ticket card print detail', () => {
  it('has four ticket cards', () => {
    expect(cards).toHaveLength(4);
  });

  it('gives every card an engraved frame, two rails, and a serial row, all aria-hidden', () => {
    for (const card of cards) {
      expect(card.querySelector('.card__frame[aria-hidden="true"]')).not.toBeNull();
      expect(card.querySelectorAll('.card__rail[aria-hidden="true"]')).toHaveLength(2);
      expect(card.querySelector('.card__rail--l')).not.toBeNull();
      expect(card.querySelector('.card__rail--r')).not.toBeNull();
      expect(card.querySelector('.card__serial[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('prints a unique sequential serial on each ticket', () => {
    const serials = cards.map(
      (card) => card.querySelector('.card__serial span:last-child').textContent
    );
    expect(serials).toEqual(['№ 047291', '№ 047292', '№ 047293', '№ 047294']);
  });

  it('keeps the perforation and existing content on every card', () => {
    for (const card of cards) {
      expect(card.querySelector('.card__perf')).not.toBeNull();
      expect(card.querySelector('.card__icon')).not.toBeNull();
      expect(card.querySelector('.card__title')).not.toBeNull();
      expect(card.querySelector('.card__body')).not.toBeNull();
    }
  });
});
