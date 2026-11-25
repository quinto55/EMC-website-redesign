import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderAll, ROOT } from './helpers/pages.js';
import { pageByKey } from '../build/pages.js';
import { VIDEOS, videoById } from '../build/videos.js';
import { initShowNotes } from '../src/show.js';

const rendered = renderAll();
const { doc, html } = rendered.find((r) => r.page.key === 'services');
const main = doc.querySelector('main');

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const byText = (root, selector, wanted) => [...root.querySelectorAll(selector)].find((el) => text(el) === wanted) ?? null;
const block = (id) => doc.getElementById(id);

/** [id, kicker, heading, lead, video, [[point, sentence], ...]] in page order. The words are the videos' own. */
const SERVICES = [
  ['pip', 'Pip, the gate helper', 'Meet Pip. She works the gate.',
    'A talking AI clown on a kiosk at your entrance. Visitors tap, ask out loud, and she answers.', 'pip', [
      ['She answers the gate questions', "Hours, parking, prices, where things are. In English and Spanish, from your fair's facts."],
      ['Lost tickets? She helps', 'She walks people through finding them and can look up the order.'],
      ['Your staff get time back', 'The everyday questions go to Pip. She calls a person when one is needed.'],
      ['Fully customizable', "Pip is one face. Yours can be a real person (with their permission), a made-up person or a character: anything that isn't trademarked."],
    ]],
  ['call-line', 'Ticket-buyer call line', 'Every call answered, in English y en español.',
    'An AI phone line for your fair that answers the questions people call about, at any hour.', 'phone-line', [
      ['It picks up right away', 'Nights, weekends, the busiest Saturday of the fair. Nobody waits on hold.'],
      ["It answers from your fair's facts", 'Hours, prices, rides, parking, what you can bring. Your answers, not guesses.'],
      ['It speaks Spanish too', 'The caller just starts talking. The line answers in the same language.'],
    ]],
];

describe('fair services page', () => {
  it('is a public page at /fair-services/, in the top menu, with its own styles and script', () => {
    const page = pageByKey('services');
    expect(page.path).toBe('/fair-services/');
    expect(page.file).toBe('fair-services/index.html');
    expect(page.nav).toBe('services');
    expect(page.indexable).toBe(true);
    expect(page.title).toBe('Fair services | EMC Tickets');
    expect(page.styles).toEqual(['/src/styles/site.css', '/src/styles/platform.css', '/src/styles/features.css', '/src/styles/services.css']);
    expect(page.entry).toBe('/src/entry/services.js');
    expect(html).not.toContain('<meta name="robots" content="noindex">');
    const current = [...doc.querySelectorAll('header.top nav[aria-label="Primary"] a[aria-current="page"]')];
    expect(current.map(text)).toEqual(['Fair services']);
  });

  it('the search and sharing description names both services', () => {
    const wanted = "Pip, a talking AI clown for your front gate, and a phone line that answers every call in English and Spanish, from your fair's own facts.";
    expect(pageByKey('services').description).toBe(wanted);
    expect(doc.querySelector('meta[name="description"]').getAttribute('content')).toBe(wanted);
  });

  it('the intro says what the page is, with a jump link to each service', () => {
    const h1 = main.querySelector('h1');
    expect(text(h1)).toBe('Every guest, answered.');
    expect(main.querySelectorAll('h1')).toHaveLength(1);
    const intro = h1.parentElement;
    expect(byText(intro, '.kicker', 'Fair services')).not.toBeNull();
    expect(byText(intro, 'p', "At the gate and on the phone, your guests get answers from your fair's own facts, in English and Spanish.")).not.toBeNull();
    const jumps = [...intro.querySelectorAll('nav a[href^="#"]')].map((a) => [a.getAttribute('href'), text(a)]);
    expect(jumps).toEqual([['#pip', 'Pip, the gate helper'], ['#call-line', 'Ticket-buyer call line']]);
    expect(intro.querySelector('nav').getAttribute('aria-label')).toBeTruthy();
  });

  it('each service reads: its name, the heading, one sentence, the video, its points, then the booth note and the ask', () => {
    for (const [id, kicker, heading, lead, video, points] of SERVICES) {
      const el = block(id);
      expect(el.tagName, id).toBe('SECTION');
      const kind = (child) => {
        if (child.matches('.svc-kicker')) return `name: ${text(child)}`;
        if (child.matches('h2')) return `heading: ${text(child)}`;
        if (child.matches('p.say')) return `lead: ${text(child)}`;
        if (child.matches('[data-video]')) return `video ${child.getAttribute('data-video')}`;
        if (child.matches('ul.points')) return 'points';
        if (child.matches('.svc-foot')) return 'foot';
        return child.tagName;
      };
      expect([...el.children].map(kind), id).toEqual([
        `name: ${kicker}`, `heading: ${heading}`, `lead: ${lead}`,
        ...(videoById(video).cleared ? [`video ${video}`] : []), 'points', 'foot',
      ]);
      expect(el.getAttribute('aria-labelledby'), id).toBe(el.querySelector('h2').id);
      expect([...el.querySelectorAll('ul.points li')].map((li) => [text(li.querySelector('b')), text(li.querySelector('span'))]), id).toEqual(points);
      const foot = el.querySelector('.svc-foot');
      const note = foot.querySelector('[data-booth-note]');
      expect(note.hasAttribute('hidden'), id).toBe(true);
      expect(text(note), id).toBe('See it at IAFE Booth #410, Louisville, Nov 30 to Dec 1');
      expect(byText(foot, 'a[href="#talk"]', "Let's talk about your fair"), id).not.toBeNull();
    }
    expect([...main.querySelectorAll('section.svc')].map((s) => s.id)).toEqual(SERVICES.map(([id]) => id));
    expect(doc.getElementById('talk')).not.toBeNull();
  });

  it('Pip is "she" everywhere on the page', () => {
    const pip = text(block('pip'));
    expect(pip).toMatch(/\bShe\b/);
    expect(pip).not.toMatch(/\b(he|him|his|it answers|its voice)\b/i);
  });

  it('each video is the native player: nothing loads or plays until the visitor presses play', () => {
    const cleared = SERVICES.map(([, , , , video]) => video).filter((id) => videoById(id).cleared);
    const figures = [...main.querySelectorAll('[data-video]')];
    expect(figures.map((f) => f.getAttribute('data-video'))).toEqual(cleared);
    for (const f of figures) {
      const v = f.querySelector('video');
      expect(v.hasAttribute('controls')).toBe(true);
      expect(v.getAttribute('preload')).toBe('none');
      expect(v.hasAttribute('autoplay')).toBe(false);
    }
    expect(doc.querySelectorAll('video')).toHaveLength(cleared.length);
  });

  it('with the platform page, it shows every video in the manifest exactly once', () => {
    const platform = rendered.find((r) => r.page.key === 'platform').doc;
    const shown = [...platform.querySelectorAll('[data-video]'), ...doc.querySelectorAll('[data-video]')].map((f) => f.getAttribute('data-video'));
    expect(shown.sort()).toEqual(VIDEOS.filter((v) => v.cleared).map((v) => v.id).sort());
  });

  it('never shows a client fair\'s name: only the name-blinded video files are used', () => {
    for (const src of [...doc.querySelectorAll('video source, video, img')].map((el) => el.getAttribute('src') ?? el.getAttribute('poster') ?? '')) {
      if (src.includes('/emc-site/video/')) expect(src).toMatch(/-web(-poster)?\.(mp4|jpg)$/);
    }
    expect(text(main)).not.toMatch(/Coastal Carolina|Exchange Club/);
  });

  it('points to the fair map, which lives on the platform page', () => {
    const also = main.querySelector('section.also');
    expect(text(also.querySelector('h2'))).toBe('Also for your guests');
    const a = also.querySelector('a');
    expect(a.getAttribute('href')).toBe('/platform/#guest-map');
    expect(byText(a, 'b', 'Interactive fair map')).not.toBeNull();
    expect(byText(a, 'span', 'Your grounds on every phone, with nothing to download.')).not.toBeNull();
    expect(text(a.querySelector('.arrow'))).toBe('Watch it');
    const platform = rendered.find((r) => r.page.key === 'platform').doc;
    expect(platform.getElementById('guest-map')).not.toBeNull(); // the address it points to exists
  });

  it('the booth notes show before and during the trade show, and not after', () => {
    const fresh = () => new DOMParser().parseFromString(doc.documentElement.outerHTML, 'text/html');
    const during = fresh();
    initShowNotes(during, new Date('2026-11-30T15:00:00Z'));
    expect([...during.querySelectorAll('[data-booth-note]')].every((n) => !n.hidden)).toBe(true);
    const after = fresh();
    initShowNotes(after, new Date('2026-12-05T15:00:00Z'));
    expect([...after.querySelectorAll('[data-booth-note]')].every((n) => n.hidden)).toBe(true);
  });

  it("the page's script starts the booth notes and the videos, on top of every page's script", () => {
    const src = readFileSync(resolve(ROOT, 'src/entry/services.js'), 'utf8');
    expect(src).toMatch(/import '\.\/site\.js';/);
    expect(src).toMatch(/initShowNotes\(\)/);
    expect(src).toMatch(/initVideos\(\)/);
  });

  it('every address the other pages use for it exists on it', () => {
    for (const { page, doc: other } of rendered) {
      for (const a of other.querySelectorAll('a[href^="/fair-services/#"]')) {
        const id = a.getAttribute('href').split('#')[1];
        expect(doc.getElementById(id), `${page.file} links to #${id}`).not.toBeNull();
      }
    }
  });
});
