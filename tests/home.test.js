import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderAll, visibleText, ROOT } from './helpers/pages.js';
import { pageByKey } from '../build/pages.js';

const { doc, html } = renderAll().find((r) => r.page.key === 'home');
const main = doc.querySelector('main');

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const byText = (root, selector, wanted) => [...root.querySelectorAll(selector)].find((el) => text(el) === wanted) ?? null;
const publicFile = (url) => existsSync(resolve(ROOT, 'public', `.${url}`));

describe('home page', () => {
  it('hero copy is the approved copy', () => {
    expect(main).not.toBeNull();
    const h1 = main.querySelector('h1');
    expect(text(h1)).toBe('One system from first ticket to final report.');
    expect([...h1.querySelectorAll('span')].map(text)).toEqual(['first ticket', 'final report']);

    const hero = h1.closest('section');
    expect(byText(hero, 'p, div, span', 'Ticketing for fairs and festivals')).not.toBeNull();
    expect(byText(hero, 'p', 'Sell everywhere, scan at any gate and watch every ticket count as it happens.')).not.toBeNull();
    expect(byText(hero, 'a[href="#talk"]', "Let's talk about your fair")).not.toBeNull();
    expect(byText(hero, 'a[href="/platform/"]', 'See it work')).not.toBeNull();

    // The live sample board sits in the hero with its chip.
    expect(byText(hero, 'p, span', 'Running right now')).not.toBeNull();
    expect(hero.querySelector('[data-board][data-sample]')).not.toBeNull();
  });

  it('the hero photo is a real image the browser can find early', () => {
    const picture = doc.querySelector('picture');
    expect(picture).not.toBeNull();
    const sources = [...picture.querySelectorAll('source')];
    expect(sources.map((s) => s.getAttribute('type'))).toEqual(['image/avif', 'image/webp']);

    const img = picture.querySelector('img');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('fetchpriority')).toBe('high');
    expect(img.hasAttribute('loading')).toBe(false);
    expect(img.getAttribute('sizes')).toBe('100vw');
    expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    expect(publicFile(img.getAttribute('src')), img.getAttribute('src')).toBe(true);

    // Every candidate in every srcset is one of the built widths and exists.
    for (const el of [...sources, img]) {
      expect(el.getAttribute('sizes')).toBe('100vw');
      const candidates = el.getAttribute('srcset').split(',').map((c) => c.trim().split(/\s+/));
      expect(candidates.map(([, w]) => w)).toEqual(['800w', '1280w', '1760w']);
      for (const [url] of candidates) expect(publicFile(url), url).toBe(true);
    }
  });

  it('proof strip is exact', () => {
    const sentence = 'The Florida State Fair, South Carolina State Fair and Coastal Carolina Fair all run their retail ticketing through EMC.';
    const p = byText(main, 'p', sentence);
    expect(p).not.toBeNull();
    const proof = p.closest('.proof');
    expect(proof).not.toBeNull();
    expect(byText(proof, '*', '40+')).not.toBeNull();
    expect(byText(proof, '*', 'years in the industry')).not.toBeNull();
    // The years claim leads (phones stack the strip in this order), then the fairs line, then the logos.
    expect([...proof.children].map((el) => el.className)).toEqual(['yrs', 'proof-line', 'logos']);

    const label = [...proof.querySelectorAll('*')].find((el) => !el.children.length && text(el) === 'Tickets on sale at');
    expect(label).toBeTruthy();
    expect(label.classList.contains('visually-hidden')).toBe(true);
    const logos = [...proof.querySelectorAll('img')];
    expect(logos.map((img) => img.getAttribute('alt'))).toEqual(['Walgreens', 'Circle K', 'Menards']);
    for (const img of logos) {
      expect(Number(img.getAttribute('width')), img.getAttribute('alt')).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), img.getAttribute('alt')).toBeGreaterThan(0);
    }
  });

  it('shows the full dashboard in its own section under the proof strip', () => {
    const section = main.querySelector('section#live-board');
    expect(section).not.toBeNull();
    expect(section.matches('.sec.live-board')).toBe(true);
    expect(section.getAttribute('aria-labelledby')).toBe('live-board-h');

    // In <main>: the hero, the proof strip, this section, then Sell. Scan. Count.
    const hero = main.querySelector('h1').closest('section');
    const proof = main.querySelector('.proof');
    const tools = byText(main, 'h2', 'Sell. Scan. Count.').closest('section');
    const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(hero, proof)).toBe(true);
    expect(proof.nextElementSibling).toBe(section);
    expect(section.nextElementSibling).toBe(tools);

    expect(text(section.querySelector('.kicker'))).toBe('Live dashboard');
    const h2 = section.querySelector('h2');
    expect(h2.id).toBe('live-board-h');
    expect(text(h2)).toBe('Every ticket, as it happens.');
    expect(byText(section, 'p.lede', 'Real-time validation. 24/7 dashboard. Watch tickets sold, scanned in and sales as they happen.')).not.toBeNull();

    const dash = section.querySelectorAll('[data-dashboard]');
    expect(dash).toHaveLength(1);
    expect(dash[0].matches('[data-sample]')).toBe(true);
    expect(main.querySelectorAll('[data-dashboard]')).toHaveLength(1);
    // Its panels sit under the section's h2, so they are h3s.
    expect(dash[0].querySelectorAll('h1, h2')).toHaveLength(0);

    const last = section.lastElementChild;
    expect(last.matches('a[href="#talk"]')).toBe(true);
    expect(text(last)).toBe("Let's talk about your fair");
    expect(last.querySelector('.arrow')).not.toBeNull();

    // No words but the approved ones around the board.
    const words = section.cloneNode(true);
    words.querySelector('[data-dashboard]').remove();
    expect(text(words)).toBe("Live dashboard Every ticket, as it happens. Real-time validation. 24/7 dashboard. Watch tickets sold, scanned in and sales as they happen. Let's talk about your fair");

    // The hero keeps its compact board and chip; each board keeps its own name; nothing is announced as it ticks.
    expect(hero.querySelector('[data-board]')).not.toBeNull();
    expect(hero.querySelector('[data-dashboard]')).toBeNull();
    expect(byText(hero, 'p', 'Running right now')).not.toBeNull();
    const board = hero.querySelector('[data-board]');
    expect([board.getAttribute('role'), board.getAttribute('aria-label')]).toEqual(['group', 'Sample live sales board']);
    expect([dash[0].getAttribute('role'), dash[0].getAttribute('aria-label')]).toEqual(['group', 'Sample live board']);
    expect(html).not.toContain('aria-live');
  });

  it('loads the dashboard styles and script, and the hero photo still comes first', () => {
    expect(pageByKey('home').styles).toContain('/src/styles/dashboard.css');
    expect(pageByKey('home').entry).toBe('/src/entry/home.js');
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="[^"]*"[^>]*>/g)].map((m) => m[0]);
    expect(scripts.length).toBeGreaterThan(0);
    for (const s of scripts) expect(s).toContain('type="module"');
    expect(doc.querySelector('picture img').getAttribute('fetchpriority')).toBe('high');
  });

  it('Sell, Scan, Count cards link to the right places', () => {
    const h2 = byText(main, 'h2', 'Sell. Scan. Count.');
    expect(h2).not.toBeNull();
    const section = h2.closest('section');
    expect(byText(section, 'p', 'Pick any tool and see it work. No sign-up.')).not.toBeNull();

    const CARDS = [
      ['01', 'Sell', 'Online, at the window and in stores.', [
        ['Online sales', '/platform/#online-sales', 'Watch it'],
        ['Box office POS', '/platform/#box-office', 'Watch it'],
        ['Retail stores', '/retail-partners/', 'See how'],
      ]],
      ['02', 'Scan', 'Any gate. Duplicates blocked.', [
        ['Gate scanning', '/platform/#gate-scanning', 'See how'],
      ]],
      ['03', 'Count', 'Every ticket, as it happens.', [
        ['Live dashboard', '/platform/#live-dashboard', 'Try it'],
        ['Daily reports', '/platform/#daily-reports', 'See how'],
      ]],
    ];
    for (const [num, name, line, rows] of CARDS) {
      const card = byText(section, 'h3', name)?.closest('.mod');
      expect(card, name).toBeTruthy();
      expect(text(card.querySelector('.num-square')), name).toBe(num);
      expect(byText(card, 'p', line), name).not.toBeNull();
      const links = [...card.querySelectorAll('a')].map((a) => [
        text(a).replace(text(a.querySelector('.arrow')), '').trim(),
        a.getAttribute('href'),
        text(a.querySelector('.arrow')),
      ]);
      expect(links, name).toEqual(rows);
    }

    // RFID wristbands: tagged "Later in 2027", and not a link.
    const scan = byText(section, 'h3', 'Scan').closest('.mod');
    const rfid = [...scan.querySelectorAll('*')].find((el) => text(el) === 'RFID wristbands Later in 2027');
    expect(rfid).toBeTruthy();
    expect(rfid.closest('a')).toBeNull();
    expect(rfid.querySelector('a')).toBeNull();
    expect(byText(rfid, '*', 'Later in 2027')).not.toBeNull();
  });

  it('guest cards link to their blocks', () => {
    const label = byText(main, 'h3', 'New for your guests');
    expect(label).not.toBeNull();
    const GUESTS = [
      ['Interactive fair map', 'Your grounds on every phone.', '/platform/#guest-map'],
      ['Pip', 'A talking AI clown for the front gate.', '/platform/#guest-pip'],
      ['Ticket-buyer call line', 'Ticket answers by phone.', '/platform/#guest-call-line'],
    ];
    for (const [name, line, href] of GUESTS) {
      const a = main.querySelector(`a[href="${href}"]`);
      expect(a, name).not.toBeNull();
      expect(byText(a, '*', name), name).not.toBeNull();
      expect(byText(a, '*', line), name).not.toBeNull();
    }
  });

  it('carries Organization JSON-LD with the toll-free number and address, and no email', () => {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    expect(blocks).toHaveLength(1);
    const raw = blocks[0][1];
    const org = JSON.parse(raw);
    expect(org['@context']).toBe('https://schema.org');
    expect(org['@type']).toBe('Organization');
    expect(org.name).toBe('EMC Tickets');
    expect(org.url).toBe('https://emctickets.com/');
    expect(org.telephone).toBe('+1-800-290-2090');
    expect(org.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '8409 Land O Lakes Blvd',
      addressLocality: 'Land O Lakes',
      addressRegion: 'FL',
      postalCode: '34638',
      addressCountry: 'US',
    });
    expect(raw).not.toMatch(/@[a-z0-9-]+\.[a-z]/i); // no email address anywhere in it
    expect(org).not.toHaveProperty('email');
  });

  it('draws its arrows instead of typing them (the self-hosted fonts have no arrow glyph)', () => {
    expect(visibleText(doc)).not.toMatch(/[←-⇿⟰-⟿⤀-⥿]/);
    expect(main.querySelectorAll('.arrow').length).toBe(7); // the six card rows and the live dashboard's link
  });
});
