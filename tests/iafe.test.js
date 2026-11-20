import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from '../build/pages.js';
import { renderPage } from '../build/render.js';
import { ROOT } from './helpers/pages.js';
import { initAskForms } from '../src/form/ask-form.js';
import { initShowNotes } from '../src/show.js';
import { iafeVariant, applyIafeVariant, applyBoothHeading, applyCardSubject } from '../src/iafe/variant.js';
import { LEAD_EMAIL } from '../src/site-config.js';

const page = PAGES.find((p) => p.key === 'iafe');
const norm = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const WALGREENS_QUERY = '?utm_source=iafe&utm_medium=handout&utm_campaign=iafe2026&utm_content=walgreens-card';

function load() {
  const html = renderPage(readFileSync(join(ROOT, page.file), 'utf8'), page);
  document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
}
const lead = () => document.querySelector('[data-iafe-lead="walgreens"]');

beforeEach(load);

describe('the IAFE variant', () => {
  it('picks the Walgreens page only for the Walgreens card', () => {
    expect(iafeVariant(WALGREENS_QUERY)).toBe('walgreens');
    expect(iafeVariant('?utm_content=platform-card')).toBe('standard');
    expect(iafeVariant('?utm_content=business-card')).toBe('standard');
    expect(iafeVariant('')).toBe('standard');
    expect(iafeVariant('?utm_content=%20Walgreens-Card%20')).toBe('walgreens');
    expect(iafeVariant('?utm_content=x&utm_content=walgreens-card')).toBe('standard'); // the first value wins
  });

  it('the page as served is the standard page', () => {
    expect(lead().hasAttribute('hidden')).toBe(true);
    expect(document.querySelectorAll('h1').length).toBe(1);
    expect(norm(document.querySelector('h1'))).toBe('One system from first ticket to final report.');
    expect(norm(document.querySelector('[data-booth-line]'))).toBe('See us at Booth #410 in Louisville, Nov 30 to Dec 1');
    const hero = document.querySelector('h1').closest('section');
    const ask = document.querySelector('[data-ask]');
    expect(ask.id).toBe('talk');
    expect(ask.getAttribute('data-ask-variant')).toBe('talk');
    expect(document.querySelectorAll('[data-ask]').length).toBe(1);
    expect(hero.nextElementSibling).toBe(ask.closest('.wrap')); // the first section after the hero, at the top level of main
    expect(ask.closest('.wrap').parentElement.tagName).toBe('MAIN');
  });

  it('the Walgreens variant leads with the Walgreens story and asks for the mockup', () => {
    applyIafeVariant(document, 'walgreens');
    expect(lead().hasAttribute('hidden')).toBe(false);
    expect(norm(lead().querySelector('h2'))).toBe('Sell your fair tickets at Walgreens.');
    expect(lead().compareDocumentPosition(document.querySelector('h1')) & 4).toBeTruthy(); // the lead comes first
    expect(norm(document.querySelector('[data-ask-heading]'))).toBe('Get a free in-store mockup of your event.');
    expect(norm(document.querySelector('[data-ask-submit]'))).toBe('Request my mockup');
    expect(document.querySelector('[data-ask]').getAttribute('data-ask-variant')).toBe('mockup');
  });

  it('the standard variant changes nothing', () => {
    applyIafeVariant(document, 'standard');
    expect(lead().hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('[data-ask]').getAttribute('data-ask-variant')).toBe('talk');
  });

  it('the Walgreens lead has its own button to the form, right under its lede', () => {
    const links = [...lead().querySelectorAll('a[href="#talk"]')];
    expect(links).toHaveLength(1);
    expect(norm(links[0])).toBe('Request my mockup');
    expect(links[0].classList.contains('btn')).toBe(true);
    expect(links[0].hasAttribute('data-iafe-cta')).toBe(false); // only the lead shows it, so the switch leaves it alone
    const lede = lead().querySelector('.lede');
    expect(links[0].closest('p').previousElementSibling).toBe(lede);
  });

  it('the Walgreens lead carries the same story as the Retail partners page', () => {
    const retail = renderPage(readFileSync(join(ROOT, 'retail-partners/index.html'), 'utf8'), PAGES.find((p) => p.key === 'retail'));
    const r = new DOMParser().parseFromString(retail.replace(/<link rel="stylesheet"[^>]*>/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''), 'text/html');
    for (const sel of ['.figures', 'ol.steps', '.also']) {
      expect(norm(lead().querySelector(sel)), sel).toBe(norm(r.querySelector(sel)));
    }
    expect(norm(lead())).toContain('EMC is the exclusive event ticket partner of Walgreens.');
  });
});

describe('the page body', () => {
  it('lists Sell, Scan, Count with the approved items and links to the demos', () => {
    const t = norm(document.querySelector('[data-iafe-summary]'));
    for (const s of ['Sell', 'Scan', 'Count', 'Online sales', 'Flash sales', 'Box office POS', 'Any gate, duplicates blocked', 'Barcode or QR',
      'RFID wristbands later in 2027', 'Real-time validation', 'Daily reports', '24/7 dashboard']) expect(t, s).toContain(s);
    const sum = document.querySelector('[data-iafe-summary]');
    expect(norm(sum.querySelector('a[href="/platform/#online-sales"]'))).toContain('Watch it');
    expect(norm(sum.querySelector('a[href="/platform/#live-dashboard"]'))).toContain('Try it');
    expect(norm(sum.querySelector('a[href="/platform/"]'))).toContain('See the whole platform');
    expect(sum.querySelectorAll('.arrow').length).toBeGreaterThanOrEqual(3);
  });

  it('lists the five booth demos', () => {
    const items = [...document.querySelectorAll('[data-booth-demos] li')].map(norm);
    expect(items).toEqual(['RFID wristbands', 'Box office POS', 'Interactive fair map', 'Our ticket-buyer call line', 'Pip, our talking AI clown for the front gate']);
  });

  it('the three demos with a video link to it: the map on the platform page, the call line and Pip on fair services', () => {
    const links = [...document.querySelectorAll('[data-booth-demos] li a')].map((a) => [norm(a), a.getAttribute('href')]);
    expect(links).toEqual([
      ['Interactive fair map', '/platform/#guest-map'],
      ['Our ticket-buyer call line', '/fair-services/#call-line'],
      ['Pip, our talking AI clown for the front gate', '/fair-services/#pip'],
    ]);
  });

  it('the booth heading follows the show', () => {
    const heading = () => norm(document.querySelector('[data-booth-heading]'));
    expect(heading()).toBe('See it live at Booth #410');
    for (const now of ['2026-11-19T12:00:00Z', '2026-12-01T12:00:00Z']) {
      applyBoothHeading(document, new Date(now));
      expect(heading(), now).toBe('See it live at Booth #410');
    }
    applyBoothHeading(document, new Date('2026-12-03T12:00:00Z'));
    expect(heading()).toBe('What we showed in Louisville');
  });

  it('the date line follows Louisville, not the device', () => {
    initShowNotes(document, new Date('2026-11-30T03:00:00Z')); // 22:00 on Nov 29 in Louisville
    expect(norm(document.querySelector('[data-booth-line]'))).toBe('See us at Booth #410 in Louisville, Nov 30 to Dec 1');
    initShowNotes(document, new Date('2026-11-30T15:00:00Z'));
    expect(norm(document.querySelector('[data-booth-line]'))).toBe("We're at Booth #410 today");
  });

  it('loads no video, no board and no hero photo', () => {
    expect(document.querySelector('video')).toBeNull();
    expect(document.querySelector('[data-board], [data-dashboard]')).toBeNull();
    expect(document.querySelector('picture')).toBeNull();
    expect([...document.querySelectorAll('main img')].every((i) => lead().contains(i))).toBe(true);
  });

  it('the closing strip links back to the form', () => {
    const booth = document.querySelector('[data-booth-demos]');
    const strip = document.querySelector('[data-iafe-closing]');
    expect(booth.compareDocumentPosition(strip) & 4).toBeTruthy();
    const talk = strip.querySelector('a[href="#talk"]');
    expect(norm(talk)).toBe("Let's talk about your fair");
    expect(strip.querySelector('a[href="mailto:anthony@emctickets.com"]')).not.toBeNull();
    expect(strip.querySelector('a[href="tel:+18002902090"]')).not.toBeNull();
    expect(strip.querySelector('form')).toBeNull();
  });

  it('the sections come in the planned order', () => {
    const order = ['[data-iafe-lead]', 'h1', '[data-ask]', '[data-iafe-summary]', '[data-booth-demos]', '[data-iafe-closing]'];
    const nodes = order.map((s) => document.querySelector(s));
    for (let i = 1; i < nodes.length; i++) expect(nodes[i - 1].compareDocumentPosition(nodes[i]) & 4, order[i]).toBeTruthy();
  });
});

describe('the card variant is all or nothing', () => {
  const ctas = () => [...document.querySelectorAll('[data-iafe-cta]')].map(norm);

  it('as served, the hero button and the closing link both read the standard ask', () => {
    expect(ctas()).toEqual(["Let's talk about your fair", "Let's talk about your fair"]);
    for (const a of document.querySelectorAll('[data-iafe-cta]')) expect(a.getAttribute('href')).toBe('#talk');
  });

  it('the Walgreens switch changes the form, both links and the lead together', () => {
    applyIafeVariant(document, 'walgreens');
    expect(norm(document.querySelector('[data-ask-heading]'))).toBe('Get a free in-store mockup of your event.');
    expect(norm(document.querySelector('[data-ask-submit]'))).toBe('Request my mockup');
    expect(ctas()).toEqual(['Request my mockup', 'Request my mockup']);
    expect(document.querySelector('[data-ask]').getAttribute('data-ask-variant')).toBe('mockup');
    expect(lead().hidden).toBe(false);
  });

  it('the standard switch changes nothing', () => {
    applyIafeVariant(document, 'standard');
    expect(ctas()).toEqual(["Let's talk about your fair", "Let's talk about your fair"]);
  });

  it('a step that fails leaves the whole page standard with the lead hidden', () => {
    const second = document.querySelectorAll('[data-iafe-cta]')[1];
    Object.defineProperty(second, 'textContent', { set() { throw new Error('boom'); }, get: () => "Let's talk about your fair" });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => applyIafeVariant(document, 'walgreens')).not.toThrow();
    err.mockRestore();
    expect(lead().hidden).toBe(true);
    expect(document.querySelector('[data-ask]').getAttribute('data-ask-variant')).toBe('talk');
    expect(norm(document.querySelector('[data-ask-heading]'))).toBe("Let's talk about your fair.");
    expect(norm(document.querySelector('[data-ask-submit]'))).toBe('Send to Anthony');
    expect(norm(document.querySelectorAll('[data-iafe-cta]')[0])).toBe("Let's talk about your fair");
  });

  it('does nothing, without throwing, when the lead is missing', () => {
    lead().remove();
    expect(() => applyIafeVariant(document, 'walgreens')).not.toThrow();
    expect(document.querySelector('[data-ask]').getAttribute('data-ask-variant')).toBe('talk');
    expect(ctas()).toEqual(["Let's talk about your fair", "Let's talk about your fair"]);
  });

  it('a malformed query string is the standard page', () => {
    expect(iafeVariant('?utm_content=%E0%A4%A')).toBe('standard');
  });

  it('a lead sent from the switched page carries the mockup request type', async () => {
    applyIafeVariant(document, 'walgreens');
    const send = vi.fn(async () => ({ ok: true }));
    initAskForms(document, { mode: 'simulate', send, track: vi.fn() });
    const form = document.querySelector('[data-ask-form]');
    for (const [k, v] of Object.entries({ name: 'Pat Smith', event: 'Demo County Fair', email: 'pat@example.org', message: '' })) form.elements[k].value = v;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].request).toBe('In-store mockup'); // the lead's label for the mockup ask
  });
});

describe('"Email Anthony" says which card was scanned', () => {
  const mail = () => document.querySelector('[data-ask-fallback] a.ask-button');
  const SERVED = `mailto:${LEAD_EMAIL}?subject=Website%20inquiry`;

  it('as served the link opens an email with the subject "Website inquiry"', () => {
    expect(mail().getAttribute('href')).toBe(SERVED);
  });

  it('with a card tag the subject becomes "Website inquiry (<tag>)", encoded, to the same address', () => {
    applyCardSubject(document, { utm_content: 'walgreens-card' });
    expect(mail().getAttribute('href')).toBe(`mailto:${LEAD_EMAIL}?subject=Website%20inquiry%20(walgreens-card)`);
    const subject = new URL(mail().getAttribute('href')).searchParams.get('subject');
    expect(subject).toBe('Website inquiry (walgreens-card)');
    applyCardSubject(document, { utm_content: 'x'.repeat(24) });
    expect(new URL(mail().getAttribute('href')).searchParams.get('subject')).toBe(`Website inquiry (${'x'.repeat(24)})`);
  });

  it('reads the card tag the page already captured when none is passed in', () => {
    sessionStorage.setItem('emc-utm', JSON.stringify({ utm_source: 'iafe', utm_medium: 'handout', utm_campaign: 'iafe2026', utm_content: 'platform-card' }));
    try {
      applyCardSubject(document);
      expect(mail().getAttribute('href')).toBe(`mailto:${LEAD_EMAIL}?subject=Website%20inquiry%20(platform-card)`);
    } finally {
      sessionStorage.clear();
    }
  });

  it('leaves the served subject alone for no tag, a tag that is not letters, digits and hyphens, or one over 24 characters', () => {
    for (const utm_content of [undefined, '', 'a b', 'a_b', 'a.b', '<script>', 'a&body=x', 'x'.repeat(25), '../x', 'a%20b']) {
      applyCardSubject(document, { utm_content });
      expect(mail().getAttribute('href'), String(utm_content)).toBe(SERVED);
    }
    applyCardSubject(document, {});
    expect(mail().getAttribute('href')).toBe(SERVED);
  });

  it('never carries anything else from the address bar into the link', () => {
    applyCardSubject(document, { utm_source: 'iafe', utm_medium: 'handout', utm_campaign: 'iafe2026', utm_content: 'walgreens-card' });
    const href = mail().getAttribute('href');
    expect(href).toBe(`mailto:${LEAD_EMAIL}?subject=Website%20inquiry%20(walgreens-card)`);
    for (const word of ['iafe', 'handout', 'utm_']) expect(href).not.toContain(word);
  });

  it('changes only the ask band\'s email button, not the closing strip\'s link', () => {
    const strip = document.querySelector('[data-iafe-closing] a[href^="mailto:"]');
    const before = strip.getAttribute('href');
    applyCardSubject(document, { utm_content: 'walgreens-card' });
    expect(strip.getAttribute('href')).toBe(before);
  });

  it('does nothing, without throwing, when the page has no email button', () => {
    document.querySelector('[data-ask-fallback]').remove();
    expect(() => applyCardSubject(document, { utm_content: 'walgreens-card' })).not.toThrow();
  });
});
