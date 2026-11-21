import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initPin, SCROLLED_AFTER } from '../src/pin.js';
import { renderAll, ROOT } from './helpers/pages.js';

const root = document.documentElement;

/** A window stand-in: scrollY can be set, and listeners can be fired by name. */
function fakeWindow({ resizeObserver = false } = {}) {
  const listeners = {};
  const win = {
    scrollY: 0,
    addEventListener: (type, fn, opts) => { (listeners[type] ??= []).push({ fn, opts }); },
    fire: (type) => { for (const { fn } of listeners[type] ?? []) fn(); },
    listeners,
    observed: [],
  };
  if (resizeObserver) {
    win.ResizeObserver = class {
      constructor(fn) { this.fn = fn; win.resized = () => fn(); }
      observe(el) { win.observed.push(el); }
    };
  }
  return win;
}

/** happy-dom lays nothing out: give the header's bar a height, as a browser would. */
function setHeaderHeight(px) {
  Object.defineProperty(document.querySelector('header.top .top-bar'), 'offsetHeight', { configurable: true, get: () => px });
}

beforeEach(() => {
  root.className = 'js nav-ready';
  root.removeAttribute('style');
  document.body.innerHTML = '<header class="top"><div class="top-bar"></div></header><main><h1>Page</h1></main>';
});

describe('initPin', () => {
  it("pins the bar: `pinned` on <html> and the bar's height in --top-h, for the header to keep as its room", () => {
    setHeaderHeight(88);
    expect(initPin(document, fakeWindow())).toBe(true);
    expect(root.classList.contains('pinned')).toBe(true);
    expect(root.style.getPropertyValue('--top-h')).toBe('88px');
  });

  it('leaves a bar with no height alone, so no header collapses and lets the page slide up under a fixed bar', () => {
    setHeaderHeight(0);
    const win = fakeWindow();
    expect(initPin(document, win)).toBe(false);
    expect(root.classList.contains('pinned')).toBe(false);
    expect(root.style.getPropertyValue('--top-h')).toBe('');
    expect(win.listeners.scroll).toBeUndefined();
  });

  it('does nothing until the menu works: a phone header showing every link laid out is too tall to pin', () => {
    root.className = 'js';
    setHeaderHeight(240);
    expect(initPin(document, fakeWindow())).toBe(false);
    expect(root.classList.contains('pinned')).toBe(false);
  });

  it('does nothing on a page without the header', () => {
    document.body.innerHTML = '<main><h1>Page</h1></main>';
    expect(initPin(document, fakeWindow())).toBe(false);
    expect(root.classList.contains('pinned')).toBe(false);
  });

  it('marks the page `scrolled` once it has moved past the threshold, and takes the mark off back at the top', () => {
    setHeaderHeight(88);
    const win = fakeWindow();
    initPin(document, win);
    expect(root.classList.contains('scrolled')).toBe(false);
    win.scrollY = SCROLLED_AFTER;
    win.fire('scroll');
    expect(root.classList.contains('scrolled')).toBe(false); // exactly at the threshold is still the top
    win.scrollY = SCROLLED_AFTER + 1;
    win.fire('scroll');
    expect(root.classList.contains('scrolled')).toBe(true);
    win.scrollY = 0;
    win.fire('scroll');
    expect(root.classList.contains('scrolled')).toBe(false);
  });

  it('a page that opens already scrolled (an #anchor address, the back button) is marked at once', () => {
    setHeaderHeight(88);
    const win = fakeWindow();
    win.scrollY = 900;
    initPin(document, win);
    expect(root.classList.contains('scrolled')).toBe(true);
  });

  it('listens to scrolling passively, so it can never hold the scroll up', () => {
    setHeaderHeight(88);
    const win = fakeWindow();
    initPin(document, win);
    expect(win.listeners.scroll).toHaveLength(1);
    expect(win.listeners.scroll[0].opts).toEqual({ passive: true });
  });

  it("follows the bar's height when the window changes: by watching the bar where the browser can", () => {
    setHeaderHeight(88);
    const win = fakeWindow({ resizeObserver: true });
    initPin(document, win);
    expect(win.observed).toEqual([document.querySelector('header.top .top-bar')]);
    expect(win.listeners.resize).toBeUndefined();
    setHeaderHeight(70); // the window narrowed to a phone's width
    win.resized();
    expect(root.style.getPropertyValue('--top-h')).toBe('70px');
  });

  it('and by the window resize event where it cannot', () => {
    setHeaderHeight(88);
    const win = fakeWindow();
    initPin(document, win);
    setHeaderHeight(70);
    win.fire('resize');
    expect(root.style.getPropertyValue('--top-h')).toBe('70px');
  });

  it('a moment with no height (the bar briefly not laid out) keeps the last good height', () => {
    setHeaderHeight(88);
    const win = fakeWindow();
    initPin(document, win);
    setHeaderHeight(0);
    win.fire('resize');
    expect(root.style.getPropertyValue('--top-h')).toBe('88px');
  });
});

describe('the pinned header on the pages', () => {
  const rendered = renderAll();
  const css = (f) => readFileSync(resolve(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
  const chrome = css('src/styles/chrome.css');
  const home = css('src/styles/home.css');

  it("every page's script pins the header after the menu is ready", () => {
    const src = readFileSync(resolve(ROOT, 'src/entry/site.js'), 'utf8');
    expect(src).toMatch(/import \{ initPin \} from '\.\.\/pin\.js';/);
    expect(src.indexOf('attempt(initNav)')).toBeGreaterThan(-1);
    expect(src.indexOf('initPin()')).toBeGreaterThan(src.indexOf('attempt(initNav)'));
  });

  it('the header stays in the page as the room its bar had; only the bar and the phone menu are fixed to the window', () => {
    for (const { page, doc } of rendered) {
      const top = doc.querySelector('header.top');
      expect([...top.children].map((el) => el.className), page.file).toEqual(['wrap top-bar', 'menu-panel']);
    }
    const pinned = chrome.match(/@media \(min-height: 481px\) \{((?:[^{}]*\{[^{}]*\})*)\s*\}/)[1];
    expect(pinned).toContain('html.pinned .top { height: var(--top-h); }');
    expect(pinned).toContain('html.pinned .top-bar { position: fixed; top: 0; left: 0; right: 0; }');
    expect(pinned).toContain('html.pinned .menu-panel { position: fixed; top: var(--top-h); }');
  });

  it('pinning changes no other box: no rule under `pinned` touches the page, <main> or the home page\'s stage', () => {
    // Moving <main> or the body when the bar pins shows up as a layout shift in page-quality measurements even
    // when nothing visibly moves. The header keeps its own room instead.
    for (const sheet of [chrome, home]) {
      for (const m of sheet.matchAll(/([^{}]*html\.pinned[^{}]*)\{/g)) {
        expect(m[1]).not.toMatch(/\bbody\b|\bmain\b|\.stage\b/);
      }
    }
  });

  it('is fixed only where the script has pinned it and the window is tall enough; nothing is fixed with JavaScript off', () => {
    expect(chrome).toContain('.top { position: relative; z-index: 30; }');
    // every rule that fixes part of the header needs the script's mark, inside the tall-enough window rule
    const outside = chrome.replace(/@media \(min-height: 481px\) \{(?:[^{}]*\{[^{}]*\})*\s*\}/, '');
    expect(outside).not.toMatch(/\.(top|top-bar|menu-panel)[^{}]*\{[^{}]*position: fixed/);
    for (const m of chrome.matchAll(/([^{}]+)\{[^{}]*position: fixed[^{}]*\}/g)) {
      if (/\.(top|top-bar|menu-panel)\b/.test(m[1])) expect(m[1]).toContain('html.pinned');
    }
    expect(chrome).toContain('@media print { html.pinned .top-bar { position: absolute; } }');
  });

  it('a jump to a place on the page lands below the bar, even before the script has measured it', () => {
    expect(chrome).toMatch(/@media \(min-height: 481px\) \{[^@]*html\.js \{ scroll-padding-top: var\(--top-h, 88px\); \}/);
    expect(chrome).toContain('@media (max-width: 1000px) and (min-height: 481px) { html.js { scroll-padding-top: var(--top-h, 70px); } }');
  });

  it("floating changes nothing's size: the card is painted behind the bar and the logo is scaled", () => {
    const card = chrome.match(/\.top-bar::before \{([^}]*)\}/)[1];
    expect(card).toMatch(/position: absolute;/);
    expect(card).toMatch(/opacity: 0;/);
    expect(card).toMatch(/pointer-events: none;/);
    expect(chrome).toMatch(/html\.scrolled \.top-bar::before \{ opacity: 1; \}/);
    expect(chrome).toMatch(/html\.scrolled \.top \.logo \{ transform: scale\(\.84\); \}/);
    // no rule for the floating state may change a box's size
    for (const m of chrome.matchAll(/(html\.scrolled[^{}]*)\{([^{}]*)\}/g)) {
      expect(m[2], m[1]).not.toMatch(/(^|[ ;])(height|min-height|max-height|padding[a-z-]*|margin[a-z-]*|font-size|line-height|border-width|gap): /);
    }
  });

  it("the home page carries a second, navy logo for the floating card: hidden until then, silent, and the footer's file", () => {
    for (const { page, doc } of rendered) {
      const logos = [...doc.querySelectorAll('header.top .top-logo img')];
      if (page.key !== 'home') {
        expect(logos, page.file).toHaveLength(1);
        continue;
      }
      expect(logos).toHaveLength(2);
      expect(logos[0].getAttribute('alt')).toBe('EMC Tickets');
      expect(logos[0].getAttribute('src')).toBe('/emc-site/img/emc-logo-on-dark.png');
      expect(logos[1].classList.contains('logo-pinned')).toBe(true);
      expect(logos[1].getAttribute('alt')).toBe('');
      expect(logos[1].getAttribute('src')).toBe(doc.querySelector('footer .foot-logo img').getAttribute('src'));
    }
    expect(chrome).toContain('.logo-pinned { display: none; }');
    expect(chrome).toContain('html.scrolled .top[data-tone="photo"] .logo:not(.logo-pinned) { display: none; }');
    expect(chrome).toContain('html.scrolled .top[data-tone="photo"] .logo-pinned { display: block; }');
  });
});
