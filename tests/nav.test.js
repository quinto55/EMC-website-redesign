import { describe, it, expect, beforeEach } from 'vitest';
import { applyNavScrollState, setNavActiveLink } from '../src/nav.js';

describe('applyNavScrollState', () => {
  let nav;
  beforeEach(() => {
    document.body.innerHTML = '<nav class="site-nav"></nav>';
    nav = document.querySelector('.site-nav');
  });

  it('adds is-scrolled when scrollY exceeds threshold', () => {
    applyNavScrollState(nav, 100, 80);
    expect(nav.classList.contains('is-scrolled')).toBe(true);
  });

  it('removes is-scrolled when scrollY is below threshold', () => {
    nav.classList.add('is-scrolled');
    applyNavScrollState(nav, 40, 80);
    expect(nav.classList.contains('is-scrolled')).toBe(false);
  });
});

describe('setNavActiveLink', () => {
  it('marks the link whose href matches the current path as active', () => {
    document.body.innerHTML = `
      <nav class="site-nav">
        <a href="/index.html">Home</a>
        <a href="/what-we-do.html">What</a>
      </nav>
    `;
    setNavActiveLink(document.querySelector('.site-nav'), '/what-we-do.html');
    const links = document.querySelectorAll('.site-nav a');
    expect(links[0].classList.contains('is-active')).toBe(false);
    expect(links[1].classList.contains('is-active')).toBe(true);
  });
});
