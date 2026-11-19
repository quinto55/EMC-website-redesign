import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderAll, ROOT } from './helpers/pages.js';

// renderAll strips every script, so these documents are what a visitor with JavaScript off gets.
const rendered = renderAll();

/**
 * The rules inside every `@media (max-width: 1000px)` block of a stylesheet, as
 * { selectors: [...], decls: 'prop: value; ...' }. Comments are dropped and whitespace collapsed.
 */
function phoneRules(file) {
  const css = readFileSync(resolve(ROOT, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
  const rules = [];
  const opener = /@media \(max-width: ?1000px\) ?\{/g;
  for (let m; (m = opener.exec(css)); ) {
    let depth = 1;
    let i = opener.lastIndex;
    for (; i < css.length && depth; i++) depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0;
    const body = css.slice(opener.lastIndex, i - 1);
    for (const [, sel, decls] of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      rules.push({ selectors: sel.split(',').map((s) => s.trim()), decls: decls.trim() });
    }
  }
  return rules;
}
const declsFor = (rules, selector) =>
  rules.filter((r) => r.selectors.includes(selector)).map((r) => r.decls).join('; ');

describe('with JavaScript off', () => {
  it('every page shows the email and phone fallback and keeps the form hidden', () => {
    for (const { page, doc } of rendered) {
      const fallback = doc.querySelector('[data-ask] [data-ask-fallback]');
      expect(fallback, page.file).not.toBeNull();
      expect(fallback.hasAttribute('hidden'), page.file).toBe(false);
      expect(fallback.closest('[hidden]'), page.file).toBeNull();
      expect(fallback.querySelector('a[href="mailto:anthony@emctickets.com"]'), page.file).not.toBeNull();
      expect(fallback.textContent, page.file).toContain('800-290-2090');
      expect(fallback.querySelector('a[href="tel:+18002902090"]'), page.file).not.toBeNull();
      expect(doc.querySelector('[data-ask] form[data-ask-form]').hasAttribute('hidden'), page.file).toBe(true);
    }
  });

  it('the head marks JavaScript as on before any stylesheet, so the CSS can tell', () => {
    for (const { page, html } of rendered) {
      const mark = html.indexOf("document.documentElement.classList.add('js')");
      expect(mark, page.file).toBeGreaterThan(-1);
      expect(mark, page.file).toBeLessThan(html.indexOf('rel="stylesheet"'));
    }
  });

  it('on phones the menu button gives way to the menu laid out in the header', () => {
    // CSS is not applied in happy-dom, so this checks the rules the phone header relies on.
    const rules = phoneRules('src/styles/chrome.css');
    expect(declsFor(rules, '.menu'), 'the button shows on phones when JavaScript is on').toMatch(/display: block/);
    expect(declsFor(rules, 'html:not(.js) .menu'), 'no dead button without JavaScript').toMatch(/display: none/);
    const panel = declsFor(rules, 'html:not(.js) #site-menu[hidden]');
    expect(panel, 'the menu shows without JavaScript, beating [hidden]').toMatch(/display: block !important/);
    expect(panel, 'in the flow of the header, not over the page').toMatch(/position: static/);
  });

  it('the header and footer links are plain links in the HTML', () => {
    for (const { page, doc } of rendered) {
      expect(doc.querySelectorAll('header.top nav[aria-label="Primary"] a[href]').length, page.file).toBe(4);
      expect(doc.querySelectorAll('footer a[href]').length, page.file).toBeGreaterThanOrEqual(10);
    }
  });

  it('the home page already carries the whole sample board', () => {
    const home = rendered.find((r) => r.page.key === 'home');
    const board = home.doc.querySelector('[data-board][data-sample]');
    expect(board).not.toBeNull();
    for (const s of ['3,947', '2,618', '$61,284', 'Sample data', 'Demo County Fair']) expect(board.textContent, s).toContain(s);
    expect(board.querySelectorAll('.feed li').length).toBe(3);
  });

  it('the home page also carries the whole sample dashboard, on the same figures as the hero board', () => {
    const home = rendered.find((r) => r.page.key === 'home');
    const dash = home.doc.querySelector('#live-board [data-dashboard][data-sample]');
    const board = home.doc.querySelector('.hero [data-board][data-sample]');
    expect(dash).not.toBeNull();
    expect(board).not.toBeNull();
    for (const s of ['3,947', '$61,284']) {
      expect(dash.textContent, s).toContain(s);
      expect(board.textContent, s).toContain(s);
    }
    for (const s of ['Sample data', 'Demo County Fair', 'Latest sales', 'AI brief']) expect(dash.textContent, s).toContain(s);
    // The two shares agree too: Online = Online card, Box office = Box-office card + Cash, and the bars follow them.
    const pct = (el) => Number(el.textContent.replace('%', ''));
    const shown = [...board.querySelectorAll('.ch em')].map(pct);
    const tender = (id) => pct(dash.querySelector(`[data-f="tender-${id}-share"]`));
    expect(shown).toEqual([62, 38]);
    expect(shown).toEqual([tender('card_online'), tender('card_present') + tender('cash')]);
    expect([...board.querySelectorAll('.ch i')].map((i) => i.getAttribute('style'))).toEqual(['--w:62%', '--w:38%']);
    expect(dash.querySelectorAll('[data-panel="feed"] li').length).toBe(4);
    expect(dash.querySelector('[data-panel="pace"] svg path')).not.toBeNull();
    expect(dash.querySelector('button').hasAttribute('hidden')).toBe(true);
    // The section's link to the ask is a plain link.
    expect(home.doc.querySelector('#live-board > a[href="#talk"]')).not.toBeNull();
  });

  it('the home page shows "40+" in the proof strip with nothing in the strip hidden', () => {
    const home = rendered.find((r) => r.page.key === 'home');
    const proof = home.doc.querySelector('main .proof');
    expect(proof).not.toBeNull();
    expect(proof.querySelector('.yrs-num').textContent).toBe('40+');
    for (const s of ['years in the industry', 'Florida State Fair', 'all run their retail ticketing through EMC.']) expect(proof.textContent, s).toContain(s);
    expect(proof.querySelectorAll('.logos img')).toHaveLength(3);
    expect(proof.querySelector('[hidden]')).toBeNull();
    expect(proof.querySelector('[style]')).toBeNull();
    expect(proof.className).toBe('proof');

    // CSS is not applied in happy-dom, so this checks the rules: only the starting state the script sets while it
    // plays (.is-armed) hides anything in the strip, and nothing hides it on the strength of the early `js` class.
    const css = readFileSync(resolve(ROOT, 'src/styles/home.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
    const hiding = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, , decls]) => /opacity: ?0(?![.\d%])|scale(?:X|Y)?\(0\)|visibility: ?hidden|display: ?none/.test(decls))
      .flatMap(([, sel]) => sel.split(',').map((s) => s.trim()))
      .filter((s) => /proof|yrs|logos/.test(s));
    expect(hiding.length).toBeGreaterThan(0);
    for (const sel of hiding) expect(sel).toMatch(/^\.proof\.is-armed |::before$/);
    expect(hiding.filter((s) => !s.startsWith('.proof.is-armed '))).toEqual(['.yrs-digits::before']); // the invisible "40" that holds the figures' width
    // A keyframe that starts hidden (the fades that run while the number counts) is used only by the starting state.
    const hidingFrames = [...css.matchAll(/@keyframes ([\w-]+) ?\{((?: ?[^{}]+\{[^{}]*\})+) ?\}/g)]
      .filter(([, , body]) => /opacity: ?0(?![.\d%])|scale(?:X|Y)?\(0\)|visibility: ?hidden/.test(body))
      .map(([, name]) => name);
    expect(hidingFrames.length).toBeGreaterThan(0);
    for (const name of hidingFrames) {
      const users = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter(([, , decls]) => new RegExp(`animation(?:-name)?: ?[^;]*\\b${name}\\b`).test(decls))
        .flatMap(([, sel]) => sel.split(',').map((s) => s.trim()));
      expect(users.length, name).toBeGreaterThan(0);
      for (const sel of users) expect(sel, name).toMatch(/^\.proof\.is-armed /);
    }
    expect(css).not.toMatch(/\.js[^\w-][^{}]*(proof|yrs|logos)/);
  });

  it('the platform page already carries the whole sample dashboard', () => {
    const platform = rendered.find((r) => r.page.key === 'platform');
    const board = platform.doc.querySelector('#live-dashboard [data-dashboard][data-sample]');
    expect(board).not.toBeNull();
    for (const s of ['3,947', '$61,284', '2,618', 'Sample data', 'Demo County Fair', 'Latest sales', 'AI brief']) expect(board.textContent, s).toContain(s);
    expect(board.querySelectorAll('[data-panel="feed"] li').length).toBe(4);
    expect(board.querySelector('[data-panel="pace"] svg path')).not.toBeNull();
    // The one control waits for JavaScript.
    expect(board.querySelector('button').hasAttribute('hidden')).toBe(true);
  });
});

describe('the IAFE page with JavaScript off', () => {
  it('shows the standard lead and the email fallback', () => {
    const { doc } = rendered.find((r) => r.page.key === 'iafe');
    expect(doc.querySelector('[data-iafe-lead="walgreens"]').hasAttribute('hidden')).toBe(true);
    expect(doc.querySelector('h1').textContent).toBe('One system from first ticket to final report.');
    expect(doc.querySelector('[data-booth-line]').textContent).toContain('See us at Booth #410');
    expect(doc.querySelector('[data-ask]').getAttribute('data-ask-variant')).toBe('talk');
    expect(doc.querySelector('[data-ask] [data-ask-fallback] a[href="mailto:anthony@emctickets.com"]')).not.toBeNull();
    expect(doc.querySelector('[data-iafe-closing] a[href="#talk"]')).not.toBeNull();
  });
});
