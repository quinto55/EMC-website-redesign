import { describe, it, expect } from 'vitest';
import { renderAll } from './helpers/pages.js';
import { pageByKey } from '../build/pages.js';
import { VIDEOS, videoById } from '../build/videos.js';

const { doc } = renderAll().find((r) => r.page.key === 'platform');
const main = doc.querySelector('main');

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const byText = (root, selector, wanted) => [...root.querySelectorAll(selector)].find((el) => text(el) === wanted) ?? null;
const block = (id) => doc.getElementById(id);

const BLOCK_IDS = ['online-sales', 'box-office', 'retail', 'gate-scanning', 'rfid', 'live-dashboard', 'daily-reports', 'guests', 'guest-map', 'guest-pip', 'guest-call-line'];

/** [block id, heading selector, heading, [sentence, ...]] in page order. */
const COPY = [
  ['online-sales', 'h2', 'Online sales', ['Online sales and flash sales, on any phone. Buyers pick their tickets, pay and get a QR ticket.']],
  ['box-office', 'h2', 'Box office POS', [
    'Ring up a sale at the window. The register runs in a web browser on an iPad, so there is nothing to install. Tickets and the receipt print automatically.',
    'Opens the real register with sample data, so you can try it yourself.',
  ]],
  ['retail', 'h2', 'Retail stores', ['EMC is the exclusive event ticket partner of Walgreens.', '8,000+ retail locations', 'Same benefits at Circle K and Menards.']],
  ['gate-scanning', 'h2', 'Gate scanning', ['Any gate, duplicates blocked. Barcode or QR.', 'A ticket gets in once. Scan it again and the gate sees it has already been used.']],
  ['rfid', 'h2', 'RFID wristbands', ['RFID wristbands later in 2027.']],
  ['live-dashboard', 'h2', 'Live dashboard', [
    'Real-time validation. 24/7 dashboard. Watch tickets sold, scanned in and sales as they happen.',
    'Or watch the real board, recorded:',
  ]],
  ['daily-reports', 'h2', 'Daily reports', ["Sales by ticket type and by channel, scans by gate, and the day's totals."]],
  ['guests', 'h2', 'New for your guests', []],
  ['guest-map', 'h3', 'Interactive fair map', ['Your grounds on every phone.']],
  ['guest-pip', 'h3', 'Pip', [
    'A talking AI clown for the front gate.',
    "Fully customizable: Pip is one face. Yours can be a real person (with their permission), a made-up person or a character: anything that isn't trademarked.",
  ]],
  ['guest-call-line', 'h3', 'Ticket-buyer call line', ['Ticket answers by phone.']],
];

describe('platform page', () => {
  it('loads its own styles and script', () => {
    const page = pageByKey('platform');
    expect(page.styles).toContain('/src/styles/platform.css');
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
    expect(jumps).toEqual(['online-sales', 'box-office', 'retail', 'gate-scanning', 'rfid', 'live-dashboard', 'daily-reports', 'guests']);
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
    for (const id of ['guest-map', 'guest-pip', 'guest-call-line']) expect(block('guests').contains(block(id)), id).toBe(true);
  });

  it('the blocks sit under the numbered group labels 01 Sell, 02 Scan, 03 Count', () => {
    const GROUPS = [['01', 'Sell', ''], ['02', 'Scan', 'teal'], ['03', 'Count', 'amber']];
    const labels = [...main.querySelectorAll('.group-label')];
    expect(labels.map((l) => text(l))).toEqual(GROUPS.map(([n, name]) => `${n} ${name}`));
    labels.forEach((label, i) => {
      const square = label.querySelector('.num-square');
      expect(text(square)).toBe(GROUPS[i][0]);
      if (GROUPS[i][2]) expect(square.classList.contains(GROUPS[i][2])).toBe(true);
    });
    const groupOf = (id) => block(id).closest('.group');
    expect(groupOf('online-sales')).toBe(labels[0].closest('.group'));
    expect(groupOf('box-office')).toBe(labels[0].closest('.group'));
    expect(groupOf('retail')).toBe(labels[0].closest('.group'));
    expect(groupOf('gate-scanning')).toBe(labels[1].closest('.group'));
    expect(groupOf('rfid')).toBe(labels[1].closest('.group'));
    expect(groupOf('live-dashboard')).toBe(labels[2].closest('.group'));
    expect(groupOf('daily-reports')).toBe(labels[2].closest('.group'));
  });

  it('every guest card reads the same way: heading, line, video, (Pip only) one more sentence, booth note', () => {
    const CARDS = [
      ['guest-map', 'fair-map', 'Your grounds on every phone.', []],
      ['guest-pip', 'pip', 'A talking AI clown for the front gate.',
        ["Fully customizable: Pip is one face. Yours can be a real person (with their permission), a made-up person or a character: anything that isn't trademarked."]],
      ['guest-call-line', 'phone-line', 'Ticket answers by phone.', []],
    ];
    const kind = (el) => {
      if (el.matches('h3')) return 'heading';
      if (el.matches('[data-video]')) return `video ${el.getAttribute('data-video')}`;
      if (el.matches('[data-booth-note]')) return 'booth note';
      if (el.matches('p')) return text(el);
      return el.tagName;
    };
    for (const [id, video, line, more] of CARDS) {
      const expected = ['heading', line, ...(videoById(video).cleared ? [`video ${video}`] : []), ...more, 'booth note'];
      expect([...block(id).children].map(kind), id).toEqual(expected);
    }
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
      'online-sales': 'online-ordering', 'box-office': 'box-office', 'live-dashboard': 'live-board',
      'guest-map': 'fair-map', 'guest-call-line': 'phone-line', 'guest-pip': 'pip',
    };
    expect(Object.values(VIDEO_OF).sort()).toEqual(VIDEOS.map((v) => v.id).sort()); // every video in the manifest has its block
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
    const cleared = VIDEOS.filter((v) => v.cleared).length;
    expect(main.querySelectorAll('[data-video]')).toHaveLength(cleared);
    expect(doc.querySelectorAll('video')).toHaveLength(cleared);
    expect(main.querySelectorAll('video[autoplay], video[muted]')).toHaveLength(0);
  });

  it('the live dashboard block holds the sample board, between its words and the recording', () => {
    expect(text(main)).not.toContain('Demo coming to this page.');
    expect(main.querySelector('[data-demo]')).toBeNull();
    const el = block('live-dashboard');
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

  it('the page loads the dashboard styles', () => {
    expect(pageByKey('platform').styles).toContain('/src/styles/dashboard.css');
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

  it('retail links to the retail partners page', () => {
    expect(byText(block('retail'), 'a[href="/retail-partners/"]', 'See how retail works')).not.toBeNull();
  });

  it('RFID wristbands has no link and says "Later in 2027"', () => {
    const el = block('rfid');
    expect(el.querySelectorAll('a')).toHaveLength(0);
    expect(byText(el, '.tag', 'Later in 2027')).not.toBeNull();
  });

  it('the four booth notes are hidden in the HTML and read "See it at Booth #410"', () => {
    const notes = [...main.querySelectorAll('[data-booth-note]')];
    expect(notes).toHaveLength(4);
    for (const note of notes) {
      expect(note.hasAttribute('hidden')).toBe(true);
      expect(text(note)).toBe('See it at Booth #410');
    }
    for (const id of ['rfid', 'guest-map', 'guest-pip', 'guest-call-line']) {
      expect(block(id).querySelectorAll('[data-booth-note]').length, id).toBe(1);
    }
  });

  it("the three product blocks end with a link to the ask, reading \"Let's talk about your fair\"", () => {
    for (const id of ['online-sales', 'box-office', 'live-dashboard']) {
      const links = [...block(id).querySelectorAll('a')];
      const last = links[links.length - 1];
      expect(last.getAttribute('href'), id).toBe('#talk');
      expect(text(last), id).toBe("Let's talk about your fair");
    }
    expect(doc.getElementById('talk')).not.toBeNull();
  });
});
