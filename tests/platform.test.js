import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderAll, ROOT } from './helpers/pages.js';
import { pageByKey } from '../build/pages.js';
import { VIDEOS, videoById } from '../build/videos.js';

const { doc } = renderAll().find((r) => r.page.key === 'platform');
const main = doc.querySelector('main');

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const byText = (root, selector, wanted) => [...root.querySelectorAll(selector)].find((el) => text(el) === wanted) ?? null;
const block = (id) => doc.getElementById(id);

const BLOCK_IDS = ['online-sales', 'box-office', 'gate-scanning', 'rfid', 'live-dashboard', 'daily-reports', 'retail', 'guest-map', 'fair-services'];

/** [block id, heading selector, heading, [sentence, ...]] in page order. */
const COPY = [
  ['online-sales', 'h2', 'Online sales', ['Online sales and flash sales, on any phone. Buyers pick their tickets, pay and get a QR ticket.']],
  ['box-office', 'h2', 'Box office POS', [
    'Ring up a sale at the window. The register runs in a web browser on an iPad, so there is nothing to install. Tickets and the receipt print automatically.',
    'Opens the real register with sample data, so you can try it yourself.',
  ]],
  ['gate-scanning', 'h2', 'Gate scanning', ['Any gate, duplicates blocked. Barcode or QR.', 'A ticket gets in once. Scan it again and the gate sees it has already been used.']],
  ['rfid', 'h2', 'RFID wristbands', []], // the tag says "Later in 2027"; the line that repeated it is gone
  ['live-dashboard', 'h2', 'Live dashboard', [
    'Real-time validation. 24/7 dashboard. Watch tickets sold, scanned in and sales as they happen.',
    'Or watch the real board, recorded:',
  ]],
  ['daily-reports', 'h2', 'Daily reports', ["Sales by ticket type and by channel, scans by gate, and the day's totals."]],
  ['retail', 'h2', 'Retail stores', ['EMC is the exclusive event ticket partner of Walgreens.', '8,000+ retail locations', 'Same benefits at Circle K and Menards.']],
  ['guest-map', 'h2', 'Interactive fair map', ['Your grounds on every phone, with nothing to download.', "Search, walking directions, tonight's shows and find your car."]],
  ['fair-services', 'h2', 'Every guest, answered.', ["At the gate and on the phone, from your fair's own facts."]],
];

describe('platform page', () => {
  it('loads its own styles and script', () => {
    const page = pageByKey('platform');
    expect(page.styles).toContain('/src/styles/platform.css');
    expect(page.styles).toContain('/src/styles/features.css'); // the Fair services band and its tiles
    expect(page.entry).toBe('/src/entry/platform.js');
  });

  it('the search and sharing description promises only what the page has', () => {
    const wanted = 'See the EMC ticketing platform work: online sales, the box office and a live dashboard you can try. No sign-up.';
    expect(pageByKey('platform').description).toBe(wanted);
    expect(doc.querySelector('meta[name="description"]').getAttribute('content')).toBe(wanted);
    expect(doc.querySelector('meta[property="og:description"]').getAttribute('content')).toBe(wanted);
  });

  it('the intro is the approved copy, with a jump link to every block', () => {
    const h1 = main.querySelector('h1');
    expect(text(h1)).toBe('Sell. Scan. Count.');
    expect(main.querySelectorAll('h1')).toHaveLength(1);
    const intro = h1.parentElement;
    expect(byText(intro, '.kicker', 'The platform')).not.toBeNull();
    expect(byText(intro, 'p', 'One system from first ticket to final report. Pick any tool and see it work. No sign-up.')).not.toBeNull();

    const jumps = [...intro.querySelectorAll('nav a[href^="#"]')].map((a) => a.getAttribute('href').slice(1));
    expect(jumps).toEqual(BLOCK_IDS);
    expect(intro.querySelector('nav').getAttribute('aria-label')).toBeTruthy();
  });

  it('every block is a section with its id, in order', () => {
    const els = BLOCK_IDS.map(block);
    els.forEach((el, i) => {
      expect(el, BLOCK_IDS[i]).not.toBeNull();
      expect(el.tagName, BLOCK_IDS[i]).toBe('SECTION');
      expect(main.contains(el), BLOCK_IDS[i]).toBe(true);
    });
    const order = [...main.querySelectorAll('section[id]')].map((s) => s.id).filter((id) => BLOCK_IDS.includes(id));
    expect(order).toEqual(BLOCK_IDS);
    // Links made before the fair services page existed still land on something: #guests holds retail, the map and
    // the Fair services band, and the band's two tiles keep the ids of the cards they replaced.
    for (const id of ['retail', 'guest-map', 'fair-services', 'guest-pip', 'guest-call-line']) expect(block('guests').contains(block(id)), id).toBe(true);
  });

  it('the blocks sit under the group labels 01 Sell, 02 Scan, 03 Count, then "In stores and on the grounds"', () => {
    const GROUPS = [['01', 'Sell', ''], ['02', 'Scan', 'teal'], ['03', 'Count', 'amber'], ['+', 'In stores and on the grounds', 'plus']];
    const labels = [...main.querySelectorAll('.group-label')];
    expect(labels.map((l) => text(l))).toEqual(GROUPS.map(([n, name]) => `${n} ${name}`));
    labels.forEach((label, i) => {
      const square = label.querySelector('.num-square');
      expect(text(square)).toBe(GROUPS[i][0]);
      if (GROUPS[i][2]) expect(square.classList.contains(GROUPS[i][2])).toBe(true);
    });
    expect(labels[3].querySelector('.num-square').getAttribute('aria-hidden')).toBe('true'); // the plus sign is decoration
    const groupOf = (id) => block(id).closest('.group');
    expect(groupOf('online-sales')).toBe(labels[0].closest('.group'));
    expect(groupOf('box-office')).toBe(labels[0].closest('.group'));
    expect(groupOf('gate-scanning')).toBe(labels[1].closest('.group'));
    expect(groupOf('rfid')).toBe(labels[1].closest('.group'));
    expect(groupOf('live-dashboard')).toBe(labels[2].closest('.group'));
    expect(groupOf('daily-reports')).toBe(labels[2].closest('.group'));
    expect(groupOf('retail')).toBe(labels[3].closest('.group'));
    expect(groupOf('guest-map')).toBe(labels[3].closest('.group'));
    expect(groupOf('fair-services')).toBeNull(); // the band stands on its own after the groups
  });

  it('the fair map block reads: its words, the video, three points, then the booth note and the link to the ask', () => {
    const el = block('guest-map');
    const kind = (child) => {
      if (child.matches('.block-text')) return 'words';
      if (child.matches('.block-media')) return child.querySelector('[data-video="fair-map"]') ? 'video fair-map' : 'no video';
      if (child.matches('ul.points')) return 'points';
      if (child.matches('.block-act')) return 'act';
      return child.tagName;
    };
    expect([...el.children].map(kind)).toEqual(['words', videoById('fair-map').cleared ? 'video fair-map' : 'no video', 'points', 'act']);
    const points = [...el.querySelectorAll('ul.points li')].map((li) => [text(li.querySelector('b')), text(li.querySelector('span'))]);
    expect(points).toEqual([
      ['Search for the food', "People type funnel cake, not a vendor's name. The map finds it and walks them there."],
      ['Find the car at closing', 'They save the spot when they park. The map walks them back.'],
      ['A report for you', "Map opens, top searches and sponsor views, ready for next year's sponsors."],
    ]);
    const act = el.querySelector('.block-act');
    expect(act.querySelectorAll('[data-booth-note]')).toHaveLength(1);
    expect(byText(act, 'a[href="#talk"]', "Let's talk about your fair")).not.toBeNull();
  });

  it('the Fair services band sends Pip and the call line to their own page', () => {
    const band = block('fair-services');
    expect(byText(band, '.kicker', 'Fair services')).not.toBeNull();
    expect(byText(band, 'a[href="/fair-services/"]', 'See fair services')).not.toBeNull();
    const TILES = [
      ['guest-pip', '/fair-services/#pip', 'Pip', 'A talking AI clown for the front gate.', 'Meet Pip', 'pip'],
      ['guest-call-line', '/fair-services/#call-line', 'Ticket-buyer call line', 'Every call answered, in English y en español.', 'Hear a call', 'phone-line'],
    ];
    for (const [id, href, name, line, go, video] of TILES) {
      const a = block(id);
      expect(a.tagName, id).toBe('A');
      expect(a.getAttribute('href'), id).toBe(href);
      expect(text(a.querySelector('h3')), id).toBe(name);
      expect(byText(a, 'p', line), id).not.toBeNull();
      expect(text(a.querySelector('.arrow')), id).toBe(go);
      // The tile shows the video's still, never a player: the video plays on the fair services page.
      expect(a.querySelectorAll('video, [data-video]'), id).toHaveLength(0);
      const still = a.querySelector('img');
      if (videoById(video).cleared) {
        expect(still.getAttribute('src'), id).toBe(`/emc-site/video/${videoById(video).poster}`);
        expect(still.getAttribute('alt'), id).toBe('');
        expect(still.getAttribute('loading'), id).toBe('lazy');
      } else {
        expect(still, id).toBeNull();
      }
    }
    expect(band.querySelectorAll('a.tile')).toHaveLength(2);
  });

  it('the copy is the approved copy, exactly', () => {
    for (const [id, tag, heading, sentences] of COPY) {
      const el = block(id);
      const h = el.querySelector(tag);
      expect(text(h), id).toBe(heading);
      for (const s of sentences) expect(byText(el, 'p', s), `${id}: ${s}`).not.toBeNull();
    }
  });

  it('each block holds its video exactly when the manifest clears it (build/videos.js)', () => {
    const VIDEO_OF = {
      'online-sales': 'online-ordering', 'box-office': 'box-office', 'live-dashboard': 'live-board', 'guest-map': 'fair-map',
    };
    // Pip's and the call line's videos play on the fair services page (tests/services.test.js); every other video in
    // the manifest has its block here.
    expect(Object.values(VIDEO_OF).sort()).toEqual(VIDEOS.map((v) => v.id).filter((id) => !['pip', 'phone-line'].includes(id)).sort());
    for (const [id, video] of Object.entries(VIDEO_OF)) {
      const figures = block(id).querySelectorAll('[data-video]');
      if (!videoById(video).cleared) {
        expect(figures.length, `${id}: not cleared, so no video`).toBe(0);
        continue;
      }
      expect(figures.length, id).toBe(1);
      expect(figures[0].getAttribute('data-video'), id).toBe(video);
      expect(figures[0].querySelector('video[controls]'), id).not.toBeNull();
    }
    const cleared = Object.values(VIDEO_OF).filter((id) => videoById(id).cleared).length;
    expect(main.querySelectorAll('[data-video]')).toHaveLength(cleared);
    expect(doc.querySelectorAll('video')).toHaveLength(cleared);
    expect(main.querySelectorAll('video[autoplay], video[muted]')).toHaveLength(0);
  });

  it('the live dashboard block holds the sample board, between its words and the recording', () => {
    expect(text(main)).not.toContain('Demo coming to this page.');
    const el = block('live-dashboard');
    expect(el.querySelector('[data-demo]')).toBeNull();
    const boards = el.querySelectorAll('[data-dashboard]');
    expect(boards).toHaveLength(1);
    const board = boards[0];
    expect(board.matches('[data-sample]')).toBe(true);
    expect(main.querySelectorAll('[data-dashboard]')).toHaveLength(1);
    const words = byText(el, 'p', 'Real-time validation. 24/7 dashboard. Watch tickets sold, scanned in and sales as they happen.');
    const lead = byText(el, 'p', 'Or watch the real board, recorded:');
    const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(el.querySelector('h2'), board)).toBe(true);
    expect(follows(words, board)).toBe(true);
    expect(follows(board, lead)).toBe(true);
    if (videoById('live-board').cleared) expect(follows(lead, el.querySelector('[data-video]'))).toBe(true);
    else expect(el.querySelector('[data-video]')).toBeNull();
    // The board's panels sit under the block's h2, so they are h3s.
    expect(board.querySelectorAll('h1, h2')).toHaveLength(0);
    expect(board.querySelectorAll('h3').length).toBeGreaterThanOrEqual(7);
  });

  it('the page loads the dashboard styles and the demo styles', () => {
    expect(pageByKey('platform').styles).toContain('/src/styles/dashboard.css');
    expect(pageByKey('platform').styles).toContain('/src/styles/demo.css');
  });

  it('the gate scanning block holds the scan demo, after its sentences and before its link to the ask', () => {
    const el = block('gate-scanning');
    const demos = el.querySelectorAll('[data-demo="gate-scanning"]');
    expect(demos).toHaveLength(1);
    const demo = demos[0];
    expect(demo.matches('[data-sample]')).toBe(true);
    expect([...main.querySelectorAll('[data-demo]')]).toEqual([demo]); // the page's only click-through demo
    const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const say = byText(el, 'p', 'A ticket gets in once. Scan it again and the gate sees it has already been used.');
    const talk = byText(el, 'a[href="#talk"]', "Let's talk about your fair");
    expect(follows(say, demo)).toBe(true);
    expect(follows(demo, talk)).toBe(true);
    expect(demo.querySelectorAll('h1, h2')).toHaveLength(0);
  });

  it('the daily reports block holds the sample report, after its sentence and before its link to the ask', () => {
    const el = block('daily-reports');
    const reports = el.querySelectorAll('[data-day-report]');
    expect(reports).toHaveLength(1);
    const report = reports[0];
    expect(report.matches('[data-sample]')).toBe(true);
    expect(main.querySelectorAll('[data-day-report]')).toHaveLength(1);
    const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const say = byText(el, 'p', "Sales by ticket type and by channel, scans by gate, and the day's totals.");
    const talk = byText(el, 'a[href="#talk"]', "Let's talk about your fair");
    expect(follows(say, report)).toBe(true);
    expect(follows(report, talk)).toBe(true);
    // The report sits under the block's h2: its title is an h3 and its sections h4s.
    expect(report.querySelectorAll('h1, h2')).toHaveLength(0);
    expect(report.querySelectorAll('h3')).toHaveLength(1);
    expect([...report.querySelectorAll('h4')].map(text)).toEqual(['By ticket type', 'By channel', 'At the gates']);
  });

  it('the box office tour opens the real register in a new tab, and says so to a screen reader', () => {
    const a = block('box-office').querySelector('a[href="https://app.emctickets.com/pos/tour"]');
    expect(a).not.toBeNull();
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toMatch(/\bnoopener\b/);
    expect(text(a)).toMatch(/^Take the full box office tour\b/);
    const hidden = a.querySelector('.visually-hidden');
    expect(hidden).not.toBeNull();
    expect(text(hidden)).toMatch(/opens in a new tab/i);
    expect(a.querySelector('[aria-hidden="true"]')?.textContent.trim() ?? '').toBe(''); // any icon is silent
  });

  it('the whole retail card goes to the retail partners page, through its one link', () => {
    const links = [...block('retail').querySelectorAll('a')];
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/retail-partners/');
    expect(text(links[0])).toBe('See how retail works');
    expect(links[0].classList.contains('card-link')).toBe(true); // platform.css stretches this link over the card
    const css = readFileSync(resolve(ROOT, 'src/styles/platform.css'), 'utf8').replace(/\s+/g, ' ');
    expect(css).toMatch(/\.retail \{ position: relative;/);
    expect(css).toMatch(/\.card-link::after \{ content: ""; position: absolute; inset: 0;/);
  });

  it('RFID wristbands has no link and says "Later in 2027"', () => {
    const el = block('rfid');
    expect(el.querySelectorAll('a')).toHaveLength(0);
    expect(byText(el, '.tag', 'Later in 2027')).not.toBeNull();
  });

  it('the two booth notes are hidden in the HTML and name the show, the place and the dates', () => {
    const notes = [...main.querySelectorAll('[data-booth-note]')];
    expect(notes).toHaveLength(2);
    for (const note of notes) {
      expect(note.hasAttribute('hidden')).toBe(true);
      expect(text(note)).toBe('See it at IAFE Booth #410, Louisville, Nov 30 to Dec 1');
    }
    for (const id of ['rfid', 'guest-map']) {
      expect(block(id).querySelectorAll('[data-booth-note]').length, id).toBe(1);
    }
  });

  it("the five product blocks end with a link to the ask, reading \"Let's talk about your fair\"", () => {
    for (const id of ['online-sales', 'box-office', 'gate-scanning', 'live-dashboard', 'daily-reports']) {
      const links = [...block(id).querySelectorAll('a')];
      const last = links[links.length - 1];
      expect(last.getAttribute('href'), id).toBe('#talk');
      expect(text(last), id).toBe("Let's talk about your fair");
    }
    expect(doc.getElementById('talk')).not.toBeNull();
  });

  it("the dashboard's bar keeps its computer-width height from dashboard.css, so no page shifts when the script takes over", () => {
    const strip = (f) => readFileSync(resolve(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
    const dashboard = strip('src/styles/dashboard.css');
    // On the bar itself, in the dashboard's own variables, not on every .db wrapper (the scan demo's panel has no bar).
    expect(dashboard).toMatch(/@media \(min-width: 1001px\) \{ \.js \.db \.db-bar \{ min-height: calc\(40px \+ var\(--db-pad\) \* 1\.4 \+ 1px\); \} \}/);
    expect(strip('src/styles/home.css')).not.toMatch(/db-bar/);
  });
});
