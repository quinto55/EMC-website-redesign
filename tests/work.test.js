import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WORK_SETS, WORK_PUBLIC_DIR, WORK_SOURCE_DIR, workFiles, renderWorkHTML } from '../build/work.js';
import { GENERATORS } from '../build/render.js';
import { renderAll, ROOT } from './helpers/pages.js';

const rendered = renderAll();
const pageDoc = (key) => rendered.find((r) => r.page.key === key).doc;
const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const parse = (html) => new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
const allItems = Object.entries(WORK_SETS).flatMap(([setName, set]) => set.items.map((item) => ({ setName, item })));

describe('the work samples list (build/work.js)', () => {
  it('has four sets: eight ads and three sites for Marketing, four promotions for Retail, six ads for About', () => {
    expect(Object.fromEntries(Object.entries(WORK_SETS).map(([k, v]) => [k, v.items.length]))).toEqual({ ads: 8, sites: 3, retail: 4, about: 6 });
  });

  it('every sample has its original in assets-src/work, and no sample or original is used twice', () => {
    for (const { item } of allItems) expect(existsSync(resolve(ROOT, WORK_SOURCE_DIR, item.source)), item.source).toBe(true);
    const slugs = allItems.map(({ item }) => item.slug);
    const sources = allItems.map(({ item }) => item.source);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(sources).size).toBe(sources.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('every picture says what it is, in a sentence with no price or date in it', () => {
    for (const { item } of allItems) {
      expect(item.alt.length, item.slug).toBeGreaterThan(20);
      expect(item.alt, item.slug).toMatch(/^(Ad|Social media|The) /);
      expect(item.alt, item.slug).toMatch(/\.$|\?$/);
      expect(item.alt, item.slug).not.toMatch(/\d|\$|—/);
    }
  });

  it('the built pictures in the repo are exactly the ones the list names (run npm run work after changing the list)', () => {
    const wanted = allItems.flatMap(({ setName, item }) => workFiles(setName, item).flatMap((f) => [f.webp, f.jpg])).sort();
    expect(readdirSync(resolve(ROOT, WORK_PUBLIC_DIR)).sort()).toEqual(wanted);
  });

  it('ads are built square at two widths and sites wide at two widths', () => {
    expect(workFiles('ads', WORK_SETS.ads.items[0]).map((f) => [f.width, f.height])).toEqual([[280, 280], [560, 560]]);
    expect(workFiles('sites', WORK_SETS.sites.items[0]).map((f) => [f.width, f.height])).toEqual([[400, 250], [800, 500]]);
  });
});

describe('a set of work samples on a page', () => {
  it('is a list of pictures that load only when scrolled near: WebP first, a JPEG for browsers without it', () => {
    const d = parse(renderWorkHTML('ads'));
    const list = d.querySelector('ul.work-grid.work-ads');
    expect(list.children).toHaveLength(8);
    for (const [i, li] of [...list.children].entries()) {
      const item = WORK_SETS.ads.items[i];
      const source = li.querySelector('picture > source[type="image/webp"]');
      expect(source.getAttribute('srcset')).toBe(`/emc-site/work/${item.slug}-280.webp 280w, /emc-site/work/${item.slug}-560.webp 560w`);
      const img = li.querySelector('picture > img');
      expect(img.getAttribute('src')).toBe(`/emc-site/work/${item.slug}-560.jpg`);
      expect(img.getAttribute('alt')).toBe(item.alt);
      expect(img.getAttribute('loading')).toBe('lazy');
      expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['560', '560']); // its shape is known before it loads
      expect(img.getAttribute('sizes')).toBe(source.getAttribute('sizes'));
    }
  });

  it('an unknown set stops the build', () => {
    expect(() => renderWorkHTML('nope')).toThrow(/Unknown work set/);
  });

  it('each set has a page generator', () => {
    for (const setName of Object.keys(WORK_SETS)) expect(GENERATORS[`work-${setName}`]()).toBe(renderWorkHTML(setName));
  });
});

describe('where the work samples show', () => {
  const sets = (doc) => [...doc.querySelectorAll('ul.work-grid')].map((ul) => ul.className.replace('work-grid work-', ''));

  it('Marketing: ads and ticket sale sites under "Work we have made", after the four services and before the closing line', () => {
    const doc = pageDoc('marketing');
    expect(sets(doc)).toEqual(['ads', 'sites']);
    const sec = doc.getElementById('work');
    expect(text(sec.querySelector('h2'))).toBe('Work we have made');
    expect(text(sec.querySelector('.lede'))).toBe('Real ads and ticket sale sites we made for fairs, festivals and rodeos.');
    expect([...sec.querySelectorAll('h3')].map(text)).toEqual(['Ad graphics', 'Ticket sale sites']);
    const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(doc.querySelector('.services'), sec)).toBe(true);
    expect(text(sec.querySelector('.closing'))).toBe('Each event is unique. Tell us about yours.');
    expect(follows(sec.querySelector('.work-sites'), sec.querySelector('.closing'))).toBe(true);
  });

  it('Retail partners: four store promotions, in English and Spanish, after the Walgreens story', () => {
    const doc = pageDoc('retail');
    expect(sets(doc)).toEqual(['retail']);
    const sec = doc.querySelector('section.work');
    expect(text(sec.querySelector('h2'))).toBe('What the promotion looks like');
    expect(text(sec.querySelector('.lede'))).toBe('Ads we made to send ticket buyers to the store counter, in English and Spanish.');
    const alts = [...sec.querySelectorAll('img')].map((img) => img.getAttribute('alt'));
    expect(alts.filter((a) => /Walgreens/.test(a))).toHaveLength(3);
    expect(alts.filter((a) => /Circle K/.test(a))).toHaveLength(1);
    expect(alts.some((a) => /in Spanish/.test(a))).toBe(true);
    const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(doc.querySelector('.steps'), sec)).toBe(true);
    expect(follows(sec, doc.querySelector('.proof-fairs'))).toBe(true);
  });

  it('About: one row of six ads, with a link to the rest on the Marketing page', () => {
    const doc = pageDoc('about');
    expect(sets(doc)).toEqual(['about']);
    const sec = doc.querySelector('section.work-strip');
    expect(text(sec.querySelector('h2'))).toBe('Some of the ads we have made for fairs, festivals and rodeos');
    const link = sec.querySelector('a[href="/marketing/#work"]');
    expect(text(link)).toBe('See more of our work');
    expect(pageDoc('marketing').getElementById('work')).not.toBeNull();
  });

  it('no other page carries them: the home page and the IAFE page stay light', () => {
    for (const { page, doc } of rendered) {
      if (['marketing', 'retail', 'about'].includes(page.key)) continue;
      expect(doc.querySelectorAll('.work-grid, img[src^="/emc-site/work/"]').length, page.file).toBe(0);
    }
  });

  it('the small label wins over the section heading size on the About page', () => {
    const css = readFileSync(resolve(ROOT, 'src/styles/pages.css'), 'utf8');
    expect(css).toMatch(/\.work \.work-label \{[^}]*font: 500 13px/);
    expect(css).toMatch(/\.work h2 \{ font-size: 44px; \}/);
  });
});
