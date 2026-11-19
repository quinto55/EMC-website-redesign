import { describe, it, expect } from 'vitest';
import { renderAll } from './helpers/pages.js';

const rendered = renderAll();

const PAGE_LINKS = [
  ['Platform', '/platform/'],
  ['Retail partners', '/retail-partners/'],
  ['Marketing', '/marketing/'],
  ['About', '/about/'],
];
const UTILITY_LINKS = [
  ['Find my tickets', 'https://app.emctickets.com/recover'],
  ['Client login', 'https://app.emctickets.com/portal/login'],
];

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const hasLink = (root, label, href) =>
  [...root.querySelectorAll('a')].some((a) => text(a) === label && a.getAttribute('href') === href);

/** The header as seen on a computer: everything except the phone menu panel. */
function headerBar(doc) {
  const header = doc.querySelector('header.top').cloneNode(true);
  header.querySelector('#site-menu')?.remove();
  return header;
}

describe('header', () => {
  it('header carries the four pages, the two utilities and the talk button on every page', () => {
    for (const { page, doc } of rendered) {
      const bar = headerBar(doc);
      const primary = bar.querySelector('nav[aria-label="Primary"]');
      expect(primary, page.file).not.toBeNull();
      for (const [label, href] of PAGE_LINKS) expect(hasLink(primary, label, href), `${page.file} ${label}`).toBe(true);
      for (const [label, href] of [...UTILITY_LINKS, ["Let's talk", '#talk']]) {
        expect(hasLink(bar, label, href), `${page.file} ${label}`).toBe(true);
      }
      const logo = bar.querySelector('a[href="/"] img');
      expect(logo, page.file).not.toBeNull();
      expect(logo.getAttribute('alt')).toBe('EMC Tickets');
    }
  });

  it('the menu button controls #site-menu, which holds the four pages and both utilities', () => {
    for (const { page, doc } of rendered) {
      const toggle = doc.querySelector('header.top button[data-menu-toggle]');
      expect(toggle, page.file).not.toBeNull();
      expect(toggle.getAttribute('type')).toBe('button');
      expect(toggle.getAttribute('aria-label')).toBe('Menu');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(toggle.getAttribute('aria-controls')).toBe('site-menu');
      const menu = doc.getElementById('site-menu');
      expect(menu, page.file).not.toBeNull();
      expect(menu.hasAttribute('hidden'), page.file).toBe(true);
      for (const [label, href] of [...PAGE_LINKS, ...UTILITY_LINKS]) {
        expect(hasLink(menu, label, href), `${page.file} menu ${label}`).toBe(true);
      }
    }
  });

  it('marks the current page in the menus', () => {
    const platform = rendered.find((r) => r.page.key === 'platform').doc;
    const current = [...platform.querySelectorAll('header.top a[aria-current="page"]')];
    expect(current.length).toBeGreaterThan(0);
    for (const a of current) expect(a.getAttribute('href')).toBe('/platform/');
  });

  it('the home header is on the photo and every other header is on cream', () => {
    for (const { page, doc } of rendered) {
      const tone = doc.querySelector('header.top').getAttribute('data-tone');
      expect(tone, page.file).toBe(page.key === 'home' ? 'photo' : 'cream');
    }
  });

  it('only the home page header uses the on-dark logo file', () => {
    for (const { page, doc } of rendered) {
      const src = doc.querySelector('header.top a[href="/"] img').getAttribute('src');
      expect(src, page.file).toBe(
        page.key === 'home' ? '/emc-site/img/emc-logo-on-dark.png' : '/emc-site/img/emc-logo-on-light.png',
      );
    }
    // Elsewhere the white-word logo appears only on the dark screen of the sample dashboard, never on cream.
    for (const { page, doc } of rendered.filter((r) => r.page.key !== 'home')) {
      const onCream = [...doc.querySelectorAll('img[src*="on-dark"]')].filter((img) => !img.closest('[data-dashboard] .db-screen'));
      expect(onCream, page.file).toHaveLength(0);
    }
  });

  it('every image carries a width and a height', () => {
    for (const { page, doc } of rendered) {
      for (const img of doc.querySelectorAll('img')) {
        expect(img.getAttribute('width'), `${page.file} ${img.getAttribute('src')}`).toMatch(/^\d+$/);
        expect(img.getAttribute('height'), `${page.file} ${img.getAttribute('src')}`).toMatch(/^\d+$/);
      }
    }
  });
});

describe('footer', () => {
  it('footer carries the pages, utilities, address, email, toll-free number, Privacy, Terms and cookie settings', () => {
    for (const { page, doc } of rendered) {
      const footer = doc.querySelector('footer');
      expect(footer, page.file).not.toBeNull();
      for (const [label, href] of [...PAGE_LINKS, ...UTILITY_LINKS, ['Privacy', '/privacy/'], ['Terms', '/terms/']]) {
        expect(hasLink(footer, label, href), `${page.file} footer ${label}`).toBe(true);
      }
      const t = text(footer);
      for (const s of ['8409 Land O Lakes Blvd', 'Land O Lakes, FL 34638', 'anthony@emctickets.com', 'Toll free, 24/7', '800-290-2090']) {
        expect(t, `${page.file} footer`).toContain(s);
      }
      expect(footer.querySelector('a[href="mailto:anthony@emctickets.com"]'), page.file).not.toBeNull();
      expect(footer.querySelector('a[href="tel:+18002902090"]'), page.file).not.toBeNull();
      const settings = footer.querySelector('button[data-cookie-settings]');
      expect(settings, page.file).not.toBeNull();
      expect(settings.getAttribute('type')).toBe('button');
      expect(text(settings)).toBe('Cookie settings');
      expect(t).toContain(`© ${new Date().getFullYear()} EMC Tickets`);
      expect(footer.querySelector('img[src="/emc-site/img/emc-logo-on-light.png"]'), page.file).not.toBeNull();
    }
  });

  it("the footer's Pages list ends with Contact, so every page links to it", () => {
    for (const { page, doc } of rendered) {
      const pages = doc.querySelector('footer nav[aria-label="Footer"]');
      const links = [...pages.querySelectorAll('a')].map((a) => [text(a), a.getAttribute('href')]);
      expect(links, page.file).toEqual([...PAGE_LINKS, ['Contact', '/contact/']]);
    }
  });
});

describe('ask band', () => {
  it('the ask band uses the page variant', () => {
    for (const { page, doc } of rendered) {
      const band = doc.querySelector('[data-ask]');
      expect(band, page.file).not.toBeNull();
      expect(band.id).toBe('talk');
      const retail = page.key === 'retail';
      expect(band.getAttribute('data-ask-variant')).toBe(retail ? 'mockup' : 'talk');
      expect(text(band.querySelector('[data-ask-heading]')), page.file).toBe(
        retail ? 'Get a free in-store mockup of your event.' : "Let's talk about your fair.",
      );
      expect(text(band.querySelector('[data-ask-submit]')), page.file).toBe(retail ? 'Request my mockup' : 'Send to Anthony');
    }
  });

  it('the ask band names Anthony, his email and the toll-free line', () => {
    for (const { page, doc } of rendered) {
      const band = doc.querySelector('[data-ask]');
      const t = text(band);
      expect(t, page.file).toContain('Anthony Quintana');
      expect(t, page.file).toContain('Toll free, 24/7');
      expect(band.querySelector('a[href="mailto:anthony@emctickets.com"]'), page.file).not.toBeNull();
      expect(band.querySelector('a[href="tel:+18002902090"]'), page.file).not.toBeNull();
    }
  });

  it('the form has the four labelled fields, the trap and the privacy line', () => {
    for (const { page, doc } of rendered) {
      const form = doc.querySelector('[data-ask] form[data-ask-form]');
      expect(form, page.file).not.toBeNull();
      const field = (name) => form.querySelector(`[name="${name}"]`);
      const labelOf = (el) => text(el.closest('label') ?? doc.querySelector(`label[for="${el.id}"]`));
      expect(labelOf(field('name'))).toContain('Your name');
      expect(labelOf(field('event'))).toContain('Fair or event');
      expect(labelOf(field('email'))).toContain('Email');
      expect(labelOf(field('message'))).toContain('Anything we should know?');
      expect(labelOf(field('message'))).toMatch(/optional/i);
      expect(field('name').getAttribute('autocomplete')).toBe('name');
      expect(field('event').getAttribute('autocomplete')).toBe('organization');
      expect(field('email').getAttribute('autocomplete')).toBe('email');
      expect(field('email').getAttribute('type')).toBe('email');
      expect(field('message').tagName).toBe('TEXTAREA');
      for (const n of ['name', 'event', 'email']) expect(field(n).hasAttribute('required'), n).toBe(true);
      expect(field('message').hasAttribute('required')).toBe(false);

      const trap = field('botcheck');
      expect(trap.getAttribute('type')).toBe('checkbox');
      expect(trap.getAttribute('tabindex')).toBe('-1');
      expect(trap.getAttribute('autocomplete')).toBe('off');
      expect(trap.closest('[aria-hidden="true"]'), 'trap is hidden from screen readers').not.toBeNull();
      expect(trap.closest('.visually-hidden'), 'trap is visually hidden').not.toBeNull();

      expect(form.querySelector('[data-ask-submit]').getAttribute('type')).toBe('submit');
      expect(text(form)).toContain('We only use this to reply to you. See our Privacy Policy.');
      expect(form.querySelector('a[href="/privacy/"]')).not.toBeNull();
      expect(form.querySelector('[data-ask-status]').getAttribute('role')).toBe('alert');
      const thanks = doc.querySelector('[data-ask] [data-ask-thanks]');
      expect(thanks, page.file).not.toBeNull();
      expect(thanks.hasAttribute('hidden')).toBe(true);
    }
  });
});

describe('contact page', () => {
  const contact = rendered.find((r) => r.page.key === 'contact');
  it('shows the lead, the address, the email and the number in main', () => {
    const main = contact.doc.querySelector('main');
    const t = text(main);
    expect(text(main.querySelector('h1'))).toBe('Contact EMC Tickets');
    expect(t).toContain('Tell us about your fair and Anthony will get back to you.');
    expect(t).toContain('Anthony Quintana');
    expect(t).toContain('8409 Land O Lakes Blvd');
    expect(t).toContain('Land O Lakes, FL 34638');
    expect(t).toContain('Toll free, 24/7');
    expect(main.querySelector('a[href="mailto:anthony@emctickets.com"]')).not.toBeNull();
    expect(main.querySelector('a[href="tel:+18002902090"]')).not.toBeNull();
  });
  it('the retail ask heading keeps "in-store" on one line', () => {
    const retail = rendered.find((r) => r.page.key === 'retail');
    expect(retail.doc.querySelector('[data-ask-heading] .nowrap').textContent).toBe('in-store');
  });
});
