import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PAGES, SITE_URL, pageByFile } from '../build/pages.js';
import { renderAll, ROOT } from './helpers/pages.js';

const read = (f) => readFileSync(resolve(ROOT, f), 'utf8');
const rendered = renderAll();
const PUBLIC_PATHS = ['/', '/platform/', '/fair-services/', '/retail-partners/', '/marketing/', '/about/', '/contact/', '/privacy/', '/terms/'];

describe('site integrity', () => {
  it('every registry page has a source file', () => {
    for (const p of PAGES) {
      expect(existsSync(resolve(ROOT, p.file)), p.file).toBe(true);
      expect(pageByFile(p.file)).toBe(p);
    }
  });

  it('sitemap lists exactly the nine public pages', () => {
    const locs = [...read('public/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(PUBLIC_PATHS.map((p) => `${SITE_URL}${p}`));
    const lastmods = [...read('public/sitemap.xml').matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    expect(lastmods).toHaveLength(9);
    for (const d of lastmods) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/); // a real date, whichever day the sitemap was last touched
  });

  it('no page uses an id twice (partials shared by two pages bring their ids with them)', () => {
    for (const { page, doc } of rendered) {
      const ids = [...doc.querySelectorAll('[id]')].map((el) => el.id);
      const twice = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(twice, page.file).toEqual([]);
    }
  });

  it('every link to a place on another page of the site points at an id that page has', () => {
    const byPath = new Map(rendered.map((r) => [r.page.path, r.doc]));
    for (const { page, doc } of rendered) {
      for (const a of doc.querySelectorAll('a[href^="/"][href*="#"]')) {
        const [path, id] = a.getAttribute('href').split('#');
        const target = byPath.get(path);
        expect(target, `${page.file}: ${path} is not a page`).toBeTruthy();
        expect(target.getElementById(id), `${page.file}: ${path}#${id}`).not.toBeNull();
      }
    }
  });

  it('iafe and the not-found page are noindexed and out of the sitemap', () => {
    const sitemap = read('public/sitemap.xml');
    for (const key of ['iafe', 'notFound']) {
      const { page, html } = rendered.find((r) => r.page.key === key);
      expect(html, key).toContain('<meta name="robots" content="noindex">');
      expect(sitemap).not.toContain(page.path);
    }
  });

  it('robots.txt keeps the WordPress rules and names the sitemap', () => {
    expect(read('public/robots.txt')).toBe(
      'User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\n\nSitemap: https://emctickets.com/sitemap.xml\n',
    );
  });

  it('titles are unique', () => {
    const titles = PAGES.map((p) => p.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('every internal link points at a real page or public file', () => {
    const pagePaths = new Set(PAGES.map((p) => p.path));
    for (const { page, doc } of rendered) {
      for (const el of doc.querySelectorAll('[href], [src]')) {
        const raw = el.getAttribute('href') ?? el.getAttribute('src');
        if (!raw.startsWith('/') || raw.startsWith('//')) continue;
        const path = raw.split('#')[0].split('?')[0];
        if (path === '' || path.startsWith('/src/')) continue;
        const ok = pagePaths.has(path) || existsSync(resolve(ROOT, 'public', `.${path}`));
        expect(ok, `${page.file} links to ${raw}`).toBe(true);
      }
    }
  });

  it('every hash link to another page names an id that exists there', () => {
    const byPath = new Map(rendered.map((r) => [r.page.path, r.doc]));
    for (const { page, doc } of rendered) {
      for (const a of doc.querySelectorAll('a[href*="#"]')) {
        const href = a.getAttribute('href');
        const [path, hash] = href.split('#');
        if (!hash || !path.startsWith('/')) continue;
        const target = byPath.get(path);
        if (!target) continue;
        expect(target.getElementById(hash), `${page.file} -> ${href}`).not.toBeNull();
      }
    }
  });

  it('any target=_blank link carries rel noopener', () => {
    for (const { page, doc } of rendered) {
      for (const a of doc.querySelectorAll('a[target="_blank"]')) {
        expect(a.getAttribute('rel') ?? '', `${page.file} ${a.outerHTML}`).toMatch(/\bnoopener\b/);
      }
    }
  });

  it('no rendered page has a leftover placeholder or token', () => {
    for (const { page, html } of rendered) {
      expect(html, page.file).not.toContain('<!--site:');
      expect(html, page.file).not.toContain('{{');
    }
  });
});
