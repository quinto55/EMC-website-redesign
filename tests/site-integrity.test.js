import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const read = (f) => readFileSync(resolve(root, f), 'utf8');

const SITE = 'https://emctickets.com';
const EXPECTED_URLS = [
  `${SITE}/`,
  `${SITE}/what-we-do.html`,
  `${SITE}/sell-onsite.html`,
  `${SITE}/sell-online.html`,
  `${SITE}/sell-social.html`,
  `${SITE}/contact.html`,
  `${SITE}/privacy.html`,
  `${SITE}/terms.html`,
];
const urlToFile = (url) => {
  const path = url.slice(SITE.length);
  return path === '/' ? 'index.html' : path.slice(1);
};

describe('sitemap', () => {
  const locs = [...read('public/sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

  it('lists exactly the eight canonical pages', () => {
    expect(locs.sort()).toEqual([...EXPECTED_URLS].sort());
  });

  it('maps every URL to an existing file', () => {
    for (const url of locs) {
      expect(existsSync(resolve(root, urlToFile(url))), url).toBe(true);
    }
  });
});

describe('robots.txt', () => {
  it('allows crawling and names the sitemap', () => {
    const robots = read('public/robots.txt');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });
});

describe('per-page head meta', () => {
  const pages = EXPECTED_URLS.map((url) => ({ url, file: urlToFile(url), html: read(urlToFile(url)) }));

  it('every page has canonical, OG, and twitter tags', () => {
    for (const { url, file, html } of pages) {
      expect(html, file).toContain(`<link rel="canonical" href="${url}">`);
      expect(html, file).toContain(`<meta property="og:url" content="${url}">`);
      expect(html, file).toContain('<meta property="og:title" content="');
      expect(html, file).toContain('<meta property="og:description" content="');
      expect(html, file).toContain(`<meta property="og:image" content="${SITE}/og-image.png">`);
      expect(html, file).toContain('<meta name="twitter:card" content="summary_large_image">');
      expect(html, file).toContain('<meta name="theme-color" content="#07090f">');
    }
  });

  it('titles are unique across pages', () => {
    const titles = pages.map(({ html }) => html.match(/<title>(.*?)<\/title>/)[1]);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('footer legal links present on every chrome page', () => {
    for (const { file, html } of pages) {
      expect(html, file).toContain('href="/privacy.html"');
      expect(html, file).toContain('href="/terms.html"');
    }
  });

  it('experience.html is noindexed and out of the sitemap', () => {
    expect(read('experience.html')).toContain('<meta name="robots" content="noindex">');
    expect(read('public/sitemap.xml')).not.toContain('experience');
  });

  it('any target=_blank link carries rel noopener', () => {
    for (const { file, html } of pages) {
      for (const m of html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)) {
        expect(m[0], `${file}: ${m[0]}`).toContain('noopener');
      }
    }
  });

  it('homepage carries Organization JSON-LD', () => {
    const html = read('index.html');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type": "Organization"');
    expect(html).toContain('"email": "info@emctickets.com"');
  });
});
