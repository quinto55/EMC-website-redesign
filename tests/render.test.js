import { describe, it, expect } from 'vitest';
import { renderPage, GENERATORS, buildVars } from '../build/render.js';
import { pageByKey } from '../build/pages.js';

const page = (over = {}) => ({ ...pageByKey('platform'), ...over });
const read = (name) => ({
  header: '<a href="/platform/" data-nav="platform">Platform</a><a href="/about/" data-nav="about">About</a>',
  footer: '<footer>{{TOLL_FREE}}</footer>',
  ask: '<section id="talk"></section>',
}[name]);

describe('renderPage', () => {
  it('fills the head from the registry', () => {
    const html = renderPage('<head><!--site:head--></head>', page(), { read });
    expect(html).toContain('<title>The platform | EMC Tickets</title>');
    expect(html).toContain('<link rel="canonical" href="https://emctickets.com/platform/">');
    expect(html).toContain('<meta property="og:url" content="https://emctickets.com/platform/">');
    expect(html).toContain('<meta property="og:image" content="https://emctickets.com/emc-site/og-image.png">');
    expect(html).toContain('<meta name="theme-color" content="#fff8ec">');
    expect(html).toContain('<link rel="stylesheet" href="/src/styles/site.css">');
    expect(html).toContain('<link rel="stylesheet" href="/src/styles/platform.css">');
    expect(html).toContain('<script type="module" src="/src/entry/platform.js"></script>');
    expect(html).not.toContain('name="robots"');
  });

  it('preloads the heading and text fonts before the stylesheet', () => {
    const html = renderPage('<!--site:head-->', page(), { read });
    for (const file of ['bricolage-grotesque-var.woff2', 'figtree-var.woff2']) {
      const tag = `<link rel="preload" href="/emc-site/fonts/${file}" as="font" type="font/woff2" crossorigin>`;
      expect(html).toContain(tag);
      expect(html.indexOf(tag)).toBeLessThan(html.indexOf('rel="stylesheet"'));
    }
  });

  it('escapes quotes and ampersands in head text', () => {
    const html = renderPage('<!--site:head-->', page({ title: 'A "B" & C' }), { read });
    expect(html).toContain('<title>A &quot;B&quot; &amp; C</title>');
    expect(html).toContain('<meta property="og:title" content="A &quot;B&quot; &amp; C">');
    expect(html).not.toContain('A "B" & C');
  });

  it('noindexes a page that is not indexable, and every page on staging', () => {
    expect(renderPage('<!--site:head-->', pageByKey('iafe'), { read })).toContain('<meta name="robots" content="noindex">');
    expect(renderPage('<!--site:head-->', page(), { read, staging: true })).toContain('<meta name="robots" content="noindex">');
  });

  it('leaves the canonical link off the not-found page', () => {
    const html = renderPage('<!--site:head-->', pageByKey('notFound'), { read });
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('name="description"');
  });

  it('includes partials and marks the current menu item', () => {
    const html = renderPage('<!--site:header-->', page(), { read });
    expect(html).toContain('data-nav="platform" aria-current="page"');
    expect(html).not.toContain('data-nav="about" aria-current');
  });

  it('substitutes config tokens', () => {
    const html = renderPage('<!--site:footer-->', page(), { read });
    expect(html).toContain('800-290-2090');
    expect(html).not.toContain('{{');
  });

  it('exposes page values through buildVars', () => {
    const vars = buildVars(page());
    expect(vars.TONE).toBe('cream');
    expect(vars.PAGE_PATH).toBe('/platform/');
    expect(vars.ASK_VARIANT).toBe('talk');
    expect(vars.TOLL_FREE_TEL).toBe('+18002902090');
    expect(vars.YEAR).toBe(String(new Date().getFullYear()));
  });

  it('gives each page its ask wording and the logo for its header tone', () => {
    expect(buildVars(page())).toMatchObject({
      ASK_HEADING: "Let's talk about your fair.",
      ASK_BUTTON: 'Send to Anthony',
      LOGO_SRC: '/emc-site/img/emc-logo-on-light.png',
    });
    expect(buildVars(pageByKey('retail'))).toMatchObject({
      ASK_HEADING: 'Get a free <span class="nowrap">in-store</span> mockup of your event.',
      ASK_BUTTON: 'Request my mockup',
    });
    expect(buildVars(pageByKey('home')).LOGO_SRC).toBe('/emc-site/img/emc-logo-on-dark.png');
  });

  it('throws on an unknown ask variant', () => {
    expect(() => buildVars(page({ ask: 'nope' }))).toThrow(/nope/);
  });

  it('throws on an unknown placeholder or token', () => {
    expect(() => renderPage('<!--site:nope-->', page(), { read: () => undefined })).toThrow(/nope/);
    expect(() => renderPage('{{NOPE}}', page(), { read })).toThrow(/NOPE/);
  });

  it('uses a generator before a partial of the same name', () => {
    GENERATORS.header = () => 'G';
    try {
      expect(renderPage('<!--site:header-->', page(), { read })).toBe('G');
    } finally {
      delete GENERATORS.header;
    }
  });
});
