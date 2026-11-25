import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderAll, visibleText, ROOT } from './helpers/pages.js';
import { pageByKey, PAGES } from '../build/pages.js';
import { videoById } from '../build/videos.js';

const rendered = renderAll();
const { doc, html } = rendered.find((r) => r.page.key === 'home');
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
    const all = [...picture.querySelectorAll('source')];
    // phones first: one tall cut at the source's full resolution, in each format
    const tall = all.filter((s) => s.getAttribute('media') === '(max-width: 560px)');
    expect(tall.map((s) => s.getAttribute('type'))).toEqual(['image/avif', 'image/webp', null]);
    expect(all.slice(0, 3)).toEqual(tall);
    for (const s of tall) expect(publicFile(s.getAttribute('srcset')), s.getAttribute('srcset')).toBe(true);
    const sources = all.filter((s) => !s.hasAttribute('media'));
    expect(sources.map((s) => s.getAttribute('type'))).toEqual(['image/avif', 'image/webp']);

    const img = picture.querySelector('img');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('fetchpriority')).toBe('high');
    expect(img.hasAttribute('loading')).toBe(false);
    expect(img.getAttribute('sizes')).toBe('(max-width: 1000px) 1300px, max(100vw, 209vh)');
    expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    expect(publicFile(img.getAttribute('src')), img.getAttribute('src')).toBe(true);

    // Every candidate in every srcset is one of the built widths and exists.
    for (const el of [...sources, img]) {
      expect(el.getAttribute('sizes')).toBe('(max-width: 1000px) 1300px, max(100vw, 209vh)'); // drawn wider than the window: the box is as tall as the hero
      const candidates = el.getAttribute('srcset').split(',').map((c) => c.trim().split(/\s+/));
      expect(candidates.map(([, w]) => w)).toEqual(['800w', '1280w', '1760w']);
      for (const [url] of candidates) expect(publicFile(url), url).toBe(true);
    }
  });

  it('proof strip is exact', () => {
    const sentence = 'The Florida State Fair, South Carolina State Fair and Coastal Carolina Fair all run their retail ticketing through EMC.';
    // The fairs line is in the hero, under the buttons, so it is on the first screen; the strip keeps "40+" and the logos.
    const p = byText(main, 'p', sentence);
    expect(p).not.toBeNull();
    expect(p.matches('.hero-copy > p.hero-proof')).toBe(true);
    expect(p.previousElementSibling.matches('.cta')).toBe(true);
    const proof = main.querySelector('.proof');
    expect(proof.contains(p)).toBe(false);
    expect(byText(proof, '*', '40+')).not.toBeNull();
    expect(byText(proof, '*', 'years in the industry')).not.toBeNull();
    // The years claim leads (phones stack the strip in this order), then the logos.
    expect([...proof.children].map((el) => el.className)).toEqual(['yrs', 'logos']);

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
    expect(text(words)).toBe("Live dashboard Every ticket, as it happens. Real-time validation. 24/7 dashboard. Watch tickets sold, scanned in and sales as they happen. See the whole dashboard Let's talk about your fair");
    // Phones show the top of the board (home.css) and this link to the whole one on the Platform page.
    expect(last.previousElementSibling.matches('a.db-more[href="/platform/#live-dashboard"]')).toBe(true);

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

  it('brings the curtain on computers only by its stylesheet, its head script and its own footage folder', () => {
    expect(pageByKey('home').styles).toContain('/src/styles/curtain.css');
    for (const p of PAGES.filter((x) => x.key !== 'home')) expect(p.styles, p.file).not.toContain('/src/styles/curtain.css');
    // The head decides before the first paint; nothing about the footage is in the HTML.
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain("classList.add('curtain-pending')");
    expect(html).not.toMatch(/<video\b|fair-loop|fair-poster/);
    // The footage is not a product video: it has its own folder, both formats, a few megabytes at most.
    for (const f of ['fair-poster.jpg', 'fair-loop.webm', 'fair-loop.mp4']) {
      const file = resolve(ROOT, 'public/emc-site/curtain', f);
      expect(existsSync(file), f).toBe(true);
      expect(statSync(file).size, f).toBeLessThanOrEqual(3 * 1024 * 1024);
    }
    expect(existsSync(resolve(ROOT, 'public/emc-site/video/fair-loop.webm'))).toBe(false);
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
        ['Gate scanning', '/platform/#gate-scanning', 'Try it'],
      ]],
      ['03', 'Count', 'Every ticket, as it happens.', [
        ['Live dashboard', '/platform/#live-dashboard', 'Try it'],
        ['Daily reports', '/platform/#daily-reports', 'See one'],
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

  it('the Fair services band follows Sell. Scan. Count. and sends Pip and the call line to their page', () => {
    const band = doc.getElementById('fair-services');
    expect(band).not.toBeNull();
    const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(main.querySelector('.mods'), band)).toBe(true);
    expect(byText(band, '.kicker', 'Fair services')).not.toBeNull();
    expect(text(band.querySelector('h2'))).toBe('Every guest, answered.');
    expect(byText(band, 'p', "At the gate and on the phone, from your fair's own facts.")).not.toBeNull();
    expect(byText(band, 'a[href="/fair-services/"]', 'See fair services')).not.toBeNull();
    const TILES = [
      ['/fair-services/#pip', 'Pip', 'A talking AI clown for the front gate.', 'Meet Pip', 'pip'],
      ['/fair-services/#call-line', 'Ticket-buyer call line', 'Every call answered, in English y en español.', 'Hear a call', 'phone-line'],
    ];
    for (const [href, name, line, go, video] of TILES) {
      const a = band.querySelector(`a.tile[href="${href}"]`);
      expect(a, name).not.toBeNull();
      expect(text(a.querySelector('h3')), name).toBe(name);
      expect(byText(a, 'p', line), name).not.toBeNull();
      expect(text(a.querySelector('.arrow')), name).toBe(go);
      const still = a.querySelector('img');
      if (videoById(video).cleared) {
        expect(still.getAttribute('src'), name).toBe(`/emc-site/video/${videoById(video).poster}`);
        expect(still.getAttribute('loading'), name).toBe('lazy'); // far down the page: never part of the first load
      } else {
        expect(still, name).toBeNull();
      }
    }
    expect(main.querySelectorAll('video')).toHaveLength(0); // the home page shows stills only
  });

  it('retail stores and the fair map follow as a pair: retail goes to the retail page, the map to its video', () => {
    const sec = main.querySelector('section.reach');
    expect(sec).not.toBeNull();
    const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(doc.getElementById('fair-services'), sec)).toBe(true);
    expect(byText(sec, '.kicker', 'Retail stores and fair map')).not.toBeNull();
    expect(text(sec.querySelector('h2'))).toBe('In stores. On the grounds.');
    expect(byText(sec, 'p', 'Your tickets on sale in retail stores, and your grounds on every phone.')).not.toBeNull();
    const tiles = [...sec.querySelectorAll('a.tile')];
    expect(tiles.map((a) => a.getAttribute('href'))).toEqual(['/retail-partners/', '/platform/#guest-map']);

    const [retail, map] = tiles;
    expect(text(retail.querySelector('h3'))).toBe('Retail stores');
    expect(byText(retail, 'p', 'EMC is the exclusive event ticket partner of Walgreens.')).not.toBeNull();
    expect(byText(retail, '*', '8,000+ retail locations')).not.toBeNull();
    expect([...retail.querySelectorAll('img')].map((img) => img.getAttribute('alt'))).toEqual(['Walgreens', 'Circle K', 'Menards']);
    expect(text(retail.querySelector('.arrow'))).toBe('See how retail works');

    expect(text(map.querySelector('h3'))).toBe('Interactive fair map');
    expect(byText(map, 'p', 'Your grounds on every phone.')).not.toBeNull();
    expect(text(map.querySelector('.arrow'))).toBe('Watch it');
    if (videoById('fair-map').cleared) expect(map.querySelector('img').getAttribute('src')).toBe(`/emc-site/video/${videoById('fair-map').poster}`);
    else expect(map.querySelector('img')).toBeNull();
    for (const img of sec.querySelectorAll('img')) expect(img.getAttribute('loading')).toBe('lazy');
  });

  it("the retail page's offer sits under the pair and goes to that page's form", () => {
    const offer = main.querySelector('section.reach a.offer');
    expect(offer).not.toBeNull();
    expect(offer.getAttribute('href')).toBe('/retail-partners/#talk');
    expect(byText(offer, 'b', 'Get a free in-store mockup of your event.')).not.toBeNull();
    expect(byText(offer, 'span', 'See what your event looks like on a Walgreens counter.')).not.toBeNull();
    expect(text(offer.querySelector('.btn'))).toBe('Request my mockup');
    const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(main.querySelector('section.reach .pair'), offer)).toBe(true);
    // The same words as the retail page's own ask, which is where the link lands.
    const retail = rendered.find((r) => r.page.key === 'retail').doc;
    const ask = retail.getElementById('talk');
    expect(text(ask.querySelector('[data-ask-heading]'))).toBe('Get a free in-store mockup of your event.');
    expect(text(ask.querySelector('[data-ask-submit]'))).toBe('Request my mockup');
  });

  it("the proof strip's store logos are one link to the retail partners page", () => {
    const logos = main.querySelector('.proof .logos');
    expect(logos.tagName).toBe('A');
    expect(logos.getAttribute('href')).toBe('/retail-partners/');
    expect(text(logos)).toBe('Tickets on sale at'); // with the three logos' names, that is the link's name
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
    expect(main.querySelectorAll('.arrow').length).toBe(13); // the six card rows, the live dashboard's two links, and five in the two feature sections
  });
});
