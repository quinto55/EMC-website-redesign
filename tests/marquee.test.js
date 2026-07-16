import { describe, it, expect } from 'vitest';
import { buildMarqueeTrack } from '../src/marquee.js';

function row() {
  document.body.innerHTML = `
    <div class="partners__row">
      <span class="partners__name">Circle K</span>
      <span class="partners__name">Walgreens</span>
      <span class="partners__name">Menards</span>
    </div>`;
  return document.querySelector('.partners__row');
}

describe('buildMarqueeTrack', () => {
  it('builds two identical halves for a seamless -50% loop', () => {
    const track = buildMarqueeTrack(row());
    const groups = track.querySelectorAll('.partners__group');
    expect(groups).toHaveLength(2);
    // copies=2 -> each half holds 6 names
    expect(groups[0].querySelectorAll('.partners__name')).toHaveLength(6);
    expect(groups[1].querySelectorAll('.partners__name')).toHaveLength(6);
    expect(groups[0].textContent).toBe(groups[1].textContent);
  });

  it('hides the duplicate half from assistive tech', () => {
    const track = buildMarqueeTrack(row());
    const groups = track.querySelectorAll('.partners__group');
    expect(groups[0].hasAttribute('aria-hidden')).toBe(false);
    expect(groups[1].getAttribute('aria-hidden')).toBe('true');
  });

  it('exposes each partner name to assistive tech exactly once', () => {
    const track = buildMarqueeTrack(row());
    const names = [...track.querySelectorAll('.partners__name')];
    const audible = names.filter(
      (n) => !n.hasAttribute('aria-hidden') && !n.closest('[aria-hidden="true"]')
    );
    expect(audible.map((n) => n.textContent)).toEqual(['Circle K', 'Walgreens', 'Menards']);
  });

  it('leaves the row containing only the track', () => {
    const r = row();
    const track = buildMarqueeTrack(r);
    expect(r.children).toHaveLength(1);
    expect(r.firstChild).toBe(track);
  });
});
