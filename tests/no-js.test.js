import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderAll, ROOT } from './helpers/pages.js';
import { LEAD_EMAIL } from '../src/site-config.js';

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

/** Every rule of a stylesheet, inside @media blocks too, as { selectors, decls }, and its @keyframes bodies by name. */
function cssRules(file) {
  const css = readFileSync(resolve(ROOT, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
  const rules = [];
  const keyframes = {};
  const walk = (text) => {
    for (let i = 0; i < text.length; ) {
      const open = text.indexOf('{', i);
      if (open < 0) break;
      const head = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      for (; j < text.length && depth; j++) depth += text[j] === '{' ? 1 : text[j] === '}' ? -1 : 0;
      const body = text.slice(open + 1, j - 1);
      if (/^@(media|supports)/.test(head)) walk(body);
      else if (head.startsWith('@keyframes')) keyframes[head.split(' ')[1]] = body;
      else rules.push({ selectors: head.split(',').map((s) => s.trim()), decls: body.trim() });
      i = j;
    }
  };
  walk(css);
  return { rules, keyframes };
}

describe('with JavaScript off', () => {
  it('every page shows the email and phone fallback and keeps the form hidden', () => {
    for (const { page, doc } of rendered) {
      const fallback = doc.querySelector('[data-ask] [data-ask-fallback]');
      expect(fallback, page.file).not.toBeNull();
      expect(fallback.hasAttribute('hidden'), page.file).toBe(false);
      expect(fallback.closest('[hidden]'), page.file).toBeNull();
      // "Email Anthony" opens an email that already says what it is about, with no script.
      expect(fallback.querySelector('a.ask-button').getAttribute('href'), page.file).toBe(`mailto:${LEAD_EMAIL}?subject=Website%20inquiry`);
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

  it('on phones the menu button shows only once initNav has marked the page, and until then the links are laid out in the header', () => {
    // CSS is not applied in happy-dom, so this checks the rules the phone header relies on.
    const rules = phoneRules('src/styles/chrome.css');
    expect(declsFor(rules, '.menu'), 'the button is laid out on phones').toMatch(/display: block/);
    expect(declsFor(rules, 'html:not(.js) .menu'), 'no dead button without JavaScript').toMatch(/display: none/);
    // JavaScript on but the script not (yet) running: the button keeps its place and cannot be seen or used.
    expect(declsFor(rules, 'html.js:not(.nav-ready) .menu'), 'no dead button before initNav').toMatch(/visibility: hidden/);
    // The links are laid out whenever initNav has not run, whether the head marked JavaScript or not.
    const panel = declsFor(rules, 'html:not(.nav-ready) #site-menu[hidden]');
    expect(panel, 'the menu shows until initNav has run, beating [hidden]').toMatch(/display: block !important/);
    expect(panel, 'in the flow of the header, not over the page').toMatch(/position: static/);
    for (const sel of ['.menu-card', '.menu-pages', '.menu-pages a']) {
      expect(declsFor(rules, `html:not(.nav-ready) ${sel}`), sel).not.toBe('');
    }
    // Nothing of the phone menu is keyed on the head's early `js` mark any more, except hiding the dead button itself.
    const css = readFileSync(resolve(ROOT, 'src/styles/chrome.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const keyedOnJs = [...css.matchAll(/html:not\(\.js\)[^{,]*/g)].map((m) => m[0].trim());
    expect(keyedOnJs.filter((s) => !/\.menu$|data-cookie-settings/.test(s))).toEqual([]);
  });

  it('on a normal load the header does not jump: the links wait two seconds for the script before they show, even under reduced motion', () => {
    const { rules, keyframes } = cssRules('src/styles/chrome.css');
    const late = rules.filter((r) => r.selectors.includes('html.js:not(.nav-ready) #site-menu[hidden]')).map((r) => r.decls).join('; ');
    expect(late).toMatch(/animation: menu-late 0s 2s both !important/); // !important: base.css switches decorative animation off for reduced motion
    expect(keyframes['menu-late']).toMatch(/from ?\{[^}]*max-height: 0/);
    expect(keyframes['menu-late']).toMatch(/to ?\{[^}]*max-height: 100vh/);
  });

  it('the header and footer links are plain links in the HTML', () => {
    for (const { page, doc } of rendered) {
      expect(doc.querySelectorAll('header.top nav[aria-label="Primary"] a[href]').length, page.file).toBe(5);
      expect(doc.querySelectorAll('footer a[href]').length, page.file).toBeGreaterThanOrEqual(10);
    }
  });

  it('the home page already carries the whole sample board', () => {
    const home = rendered.find((r) => r.page.key === 'home');
    const board = home.doc.querySelector('[data-board][data-sample]');
    expect(board).not.toBeNull();
    for (const s of ['2,880', '2,618', '$61,284', 'Sample data', 'Demo County Fair']) expect(board.textContent, s).toContain(s);
    expect(board.querySelectorAll('.feed li').length).toBe(3);
  });

  it('the home page also carries the whole sample dashboard, on the same figures as the hero board', () => {
    const home = rendered.find((r) => r.page.key === 'home');
    const dash = home.doc.querySelector('#live-board [data-dashboard][data-sample]');
    const board = home.doc.querySelector('.hero [data-board][data-sample]');
    expect(dash).not.toBeNull();
    expect(board).not.toBeNull();
    for (const s of ['2,880', '2,618', '$61,284']) {
      expect(dash.textContent, s).toContain(s);
      expect(board.textContent, s).toContain(s);
    }
    expect(dash.querySelector('[data-tile="tickets"] [data-f="tickets-sub"]').textContent).toBe('plus 279 parking and 788 rides');
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
    expect(proof.textContent).toContain('years in the industry');
    const fairs = home.doc.querySelector('main .hero-proof'); // the fairs line sits in the hero, shown as served
    for (const s of ['Florida State Fair', 'all run their retail ticketing through EMC.']) expect(fairs.textContent, s).toContain(s);
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

  it('the home page shows the hero with no cover over it when the script has not run', () => {
    const home = rendered.find((r) => r.page.key === 'home');
    // Only the head script puts the class the cover needs on <html>; with JavaScript off it never runs.
    expect(home.html).not.toMatch(/<html[^>]*\bclass=/);
    expect(home.doc.documentElement.className).toBe('');
    expect(home.doc.querySelector('[class*="curtain"]')).toBeNull();
    expect(home.doc.querySelector('main .hero h1')).not.toBeNull();

    // CSS is not applied in happy-dom, so this checks the curtain's rules.
    const { rules, keyframes } = cssRules('src/styles/curtain.css');
    expect(rules.length).toBeGreaterThan(0);
    // Everything in it that hides, covers or moves something belongs to a class only script sets: the head's mark
    // (curtain-pending), the module's closed state (curtain-closed) or the module's own elements (.curtain...).
    const SCRIPT_SET = /^(html\.curtain-pending |html\.curtain-closed |\.curtain[\s.:-]|\.curtain$)/;
    const covering = rules.filter((r) => /opacity: ?0(?![.\d%])|visibility: ?hidden|display: ?none|position: ?(fixed|absolute)|url\(|transform: ?[a-z]/.test(r.decls));
    expect(covering.length).toBeGreaterThan(0);
    for (const r of covering) for (const sel of r.selectors) expect(sel, r.decls).toMatch(SCRIPT_SET);
    // Nothing keys off the early `js` class.
    for (const r of rules) for (const sel of r.selectors) expect(sel).not.toMatch(/\.js\b/);

    // The head's cover: the still, over the first screen only (absolute, not fixed, so a visitor whose script
    // failed can still scroll past it), and it takes itself away after 8 seconds by a CSS animation.
    const cover = rules.filter((r) => r.selectors.includes('html.curtain-pending body::before')).map((r) => r.decls).join('; ');
    expect(cover, 'the head cover rules').not.toBe('');
    expect(cover).toMatch(/position: ?absolute/);
    expect(cover).not.toMatch(/position: ?fixed/);
    expect(cover).toMatch(/fair-poster\.jpg/);
    const anim = cover.match(/animation: ?([\w-]+) [^;]*?\b8s\b[^;]*forwards/);
    expect(anim, cover).not.toBeNull();
    const last = keyframes[anim[1]].match(/(?:to|100%) ?\{([^}]*)\}/)[1];
    expect(last).toMatch(/visibility: ?hidden/);
    expect(last).toMatch(/opacity: ?0(?![.\d])/);
    // Scrolling is never locked in CSS (the module does that, only while it is alive).
    for (const r of rules) {
      if (r.selectors.some((s) => /^(html|body)\b/.test(s))) expect(r.decls, r.selectors.join()).not.toMatch(/overflow|touch-action|overscroll/);
    }
  });

  it('the platform page already carries the whole sample dashboard', () => {
    const platform = rendered.find((r) => r.page.key === 'platform');
    const board = platform.doc.querySelector('#live-dashboard [data-dashboard][data-sample]');
    expect(board).not.toBeNull();
    for (const s of ['2,880', 'plus 279 parking and 788 rides', '$61,284', '2,618', 'Sample data', 'Demo County Fair', 'Latest sales', 'AI brief']) expect(board.textContent, s).toContain(s);
    expect(board.querySelectorAll('[data-panel="feed"] li').length).toBe(4);
    expect(board.querySelector('[data-panel="pace"] svg path')).not.toBeNull();
    // The one control waits for JavaScript.
    expect(board.querySelector('button').hasAttribute('hidden')).toBe(true);
  });
});

describe('the platform page\'s gate scan and sample report with JavaScript off', () => {
  const platform = rendered.find((r) => r.page.key === 'platform');
  const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();

  it('shows the whole sample report, as served', () => {
    const report = platform.doc.querySelector('#daily-reports [data-day-report][data-sample]');
    expect(report).not.toBeNull();
    expect(report.closest('[hidden]')).toBeNull();
    expect(report.querySelector('[hidden]')).toBeNull();
    const t = text(report);
    for (const s of ['Demo County Fair, Thursday', 'Sample data', 'By ticket type', 'By channel', 'At the gates',
      'Adult admission', 'Child admission', 'Ride wristband', 'Family 4-pack', 'Parking pass', 'Online', 'Box office',
      'Main Gate', 'North Gate', 'Midway Gate', '5,918', '3,663', '2,255', '$91,854', '3,927',
      'Tickets sold counts add-ons too. Admitted counts admission tickets only.']) expect(t, s).toContain(s);
    expect(t).not.toMatch(/\bplus\b/);
    expect(report.querySelectorAll('table')).toHaveLength(3);
    expect(report.querySelectorAll('tbody tr')).toHaveLength(5 + 2 + 3);
  });

  it('the gate scanning block shows its sentences and the sample ticket, and no button that would do nothing', () => {
    const block = platform.doc.getElementById('gate-scanning');
    const t = text(block);
    for (const s of ['Any gate, duplicates blocked. Barcode or QR.', 'A ticket gets in once. Scan it again and the gate sees it has already been used.',
      'Demo County Fair', 'Adult admission', 'Sample ticket. Not valid for entry.', 'Sample data']) expect(t, s).toContain(s);
    const demo = block.querySelector('[data-demo="gate-scanning"]');
    const img = demo.querySelector('img[src="/emc-site/img/sample-ticket-qr.svg"]');
    expect(img).not.toBeNull();
    expect(img.closest('[hidden]')).toBeNull();
    // The buttons wait for the script; the result area is empty; no result is shown as if a scan had happened.
    const buttons = [...demo.querySelectorAll('button')];
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) expect(b.hasAttribute('hidden'), text(b)).toBe(true);
    expect(text(demo.querySelector('[role="status"]'))).toBe('');
    expect(t).not.toMatch(/Admitted|Duplicate/);
    expect(demo.querySelector('[data-gs-board]').hasAttribute('hidden')).toBe(true);
    expect(demo.querySelector('[data-gs-rest]').hasAttribute('hidden')).toBe(true);
  });
});

describe('the IAFE page with JavaScript off', () => {
  it('shows the standard lead and the email fallback', () => {
    const { doc } = rendered.find((r) => r.page.key === 'iafe');
    expect(doc.querySelector('[data-iafe-lead="walgreens"]').hasAttribute('hidden')).toBe(true);
    expect(doc.querySelector('#iafe-heading').textContent).toBe('One system from first ticket to final report.');
    expect(doc.querySelector('[data-booth-line]').textContent).toContain('See us at Booth #410');
    expect(doc.querySelector('[data-ask]').getAttribute('data-ask-variant')).toBe('talk');
    expect(doc.querySelector('[data-ask] [data-ask-fallback] a[href^="mailto:anthony@emctickets.com"]')).not.toBeNull();
    expect(doc.querySelector('[data-iafe-closing] a[href="#talk"]')).not.toBeNull();
  });
});
