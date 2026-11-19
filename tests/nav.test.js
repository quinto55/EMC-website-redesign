import { describe, it, expect, beforeEach } from 'vitest';
import { initNav } from '../src/nav.js';

const MARKUP = `
  <header class="top">
    <a href="/">Home</a>
    <button type="button" data-menu-toggle aria-label="Menu" aria-expanded="false" aria-controls="site-menu"></button>
    <div id="site-menu" hidden>
      <a href="/platform/">Platform</a>
      <a href="/about/">About</a>
    </div>
  </header>
  <main><p>Page</p></main>`;

let toggle;
let menu;
beforeEach(() => {
  document.body.innerHTML = MARKUP;
  initNav(document);
  toggle = document.querySelector('[data-menu-toggle]');
  menu = document.getElementById('site-menu');
});

const pressEscape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

describe('initNav', () => {
  it('the toggle opens and closes the menu and reports it', () => {
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(menu.hidden).toBe(false);
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(menu.hidden).toBe(true);
  });

  it('Escape closes the menu and returns focus to the toggle', () => {
    toggle.click();
    menu.querySelector('a').focus();
    pressEscape();
    expect(menu.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('Escape does nothing while the menu is closed', () => {
    document.querySelector('main p').setAttribute('tabindex', '-1');
    document.querySelector('main p').focus();
    pressEscape();
    expect(document.activeElement).not.toBe(toggle);
  });

  it('a click on a link inside closes the menu', () => {
    toggle.click();
    const link = menu.querySelector('a[href="/about/"]');
    link.addEventListener('click', (e) => e.preventDefault());
    link.click();
    expect(menu.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('a click elsewhere on the page closes the menu', () => {
    toggle.click();
    document.querySelector('main p').click();
    expect(menu.hidden).toBe(true);
  });

  it('does not throw on a page with no toggle', () => {
    document.body.innerHTML = '<p>No menu here</p>';
    expect(() => initNav(document)).not.toThrow();
  });
});
