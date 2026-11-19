import { describe, it, expect } from 'vitest';
import { renderAll, visibleText } from './helpers/pages.js';

const byKey = Object.fromEntries(renderAll().map((r) => [r.page.key, r]));
const text = (key) => visibleText(byKey[key].doc);
const norm = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const THREE_FAIRS = 'The Florida State Fair, South Carolina State Fair and Coastal Carolina Fair all run their retail ticketing through EMC.';

const SENTENCES = {
  retail: [
    'Sell your fair tickets at Walgreens.',
    'EMC is the exclusive event ticket partner of Walgreens.',
    '8,000+', 'retail locations', '78%', 'of Americans live within 5 miles of a Walgreens', 'Source: Walgreens.',
    'How it works',
    'You set the tickets.', 'You get free in-store posters, counter displays and signage.',
    'Walgreens sells them.', 'Advance-sale promotions catch impulse buyers at the counter.',
    'Your revenue is locked in before the weather.', 'Tickets are pre-sold and non-refundable.',
    'You get paid within 30 days of your event.', 'No chargebacks. No credit card fees.',
    'Same benefits at', THREE_FAIRS,
  ],
  marketing: [
    'Marketing', 'Marketing for your event.',
    'Media buying, promotions, ad production and social media, from a team with 40+ years in the industry.',
    'Media buying', 'Radio, TV, billboards, web and mobile. We plan and place the media for your event.',
    'Promotions', 'Special promotions with local partners, built around your event.',
    'Ad production', 'Ad graphics and video for your campaigns.',
    'Social media', "We manage your social media posts and answer your guests' questions and comments in a timely manner.",
    'Each event is unique. Tell us about yours.',
  ],
  about: [
    'About EMC', '40+', 'years in the industry',
    'EMC treats every event as a partner. We take ownership of each fair and festival we work for, because we want you to succeed.',
    'Every event is different, with its own goals and its own way of working. So we build the program your event needs, instead of handing you a one-size system.',
    'Our customer service line is answered 24/7.',
    'With EMC everyone wins: the event, the guests and EMC. If one of them is not winning, the program is not working.',
    THREE_FAIRS,
  ],
  privacy: [
    'Last updated: November 2026',
    'Contact form. When you send the form on this site we collect your name, your fair or event, your email address and any message you add. We also record the page you sent it from and, if you arrived from one of our printed cards or emails, the campaign tag in that link.',
    'Email and phone. If you email or call us, we keep what you send us.',
    'Cookies and tracking. This site does not load analytics or advertising trackers today. If we add them (we may use PostHog, Microsoft Clarity, the LinkedIn Insight Tag and the Meta Pixel), a banner will ask first, and nothing loads unless you choose Accept.',
    'We share it only with the services that run this site for us, including Web3Forms, which delivers the contact form to our email, with professional advisers where required, or where the law requires disclosure.',
    'You can change your cookie choice at any time with the Cookie settings link at the bottom of every page.',
  ],
  terms: ['Last updated: November 2026'],
  notFound: ["This page isn't here.", 'The page may have moved. Try one of these.', 'Home', 'The platform', 'Find my tickets'],
};

describe('content pages: approved wording', () => {
  for (const [key, sentences] of Object.entries(SENTENCES)) {
    it(`${key} carries its copy exactly`, () => {
      const t = text(key);
      for (const s of sentences) expect(t, `${key}: ${s}`).toContain(s);
    });
  }

  it('each page has one h1 and its headline', () => {
    const heads = { retail: 'Sell your fair tickets at Walgreens.', marketing: 'Marketing for your event.', about: '40+ years in the industry',
      privacy: 'Privacy Policy', terms: 'Terms of Service', notFound: "This page isn't here." };
    for (const [key, h] of Object.entries(heads)) {
      const h1s = byKey[key].doc.querySelectorAll('main h1');
      expect(h1s.length, key).toBe(1);
      expect(norm(h1s[0]), key).toBe(h);
    }
  });

  it('every new page loads pages.css', () => {
    for (const key of Object.keys(heads())) expect(byKey[key].html, key).toContain('/src/styles/pages.css');
    function heads() { return SENTENCES; }
  });
});

describe('retail partners', () => {
  const { doc } = byKey.retail;
  it('the two figures sit next to "Source: Walgreens."', () => {
    const fig = doc.querySelector('.figures');
    expect(fig).not.toBeNull();
    const t = norm(fig);
    expect(t).toContain('8,000+');
    expect(t).toContain('78%');
    expect(t).toContain('Source: Walgreens.');
  });
  it('the steps are an ordered sequence of four with a heading and a body each', () => {
    const steps = doc.querySelectorAll('ol.steps > li');
    expect(steps.length).toBe(4);
    steps.forEach((li) => {
      expect(li.querySelector('.num-square')).not.toBeNull();
      expect(li.querySelector('h3')).not.toBeNull();
      expect(li.querySelector('p')).not.toBeNull();
    });
  });
  it('shows the Circle K and Menards logos after "Same benefits at"', () => {
    const label = [...doc.querySelectorAll('main *')].find((e) => e.children.length === 0 && norm(e) === 'Same benefits at');
    expect(label).not.toBeNull();
    const imgs = [...label.parentElement.querySelectorAll('img')];
    expect(imgs.map((i) => i.getAttribute('alt'))).toEqual(['Circle K', 'Menards']);
    for (const img of imgs) {
      expect(label.compareDocumentPosition(img) & 4).toBeTruthy(); // follows the label
    }
  });
  it('every image has width, height and alt', () => {
    for (const img of doc.querySelectorAll('main img')) {
      expect(img.getAttribute('width')).toBeTruthy();
      expect(img.getAttribute('height')).toBeTruthy();
      expect(img.getAttribute('alt')).toBeTruthy();
    }
    expect([...doc.querySelectorAll('main img')].map((i) => i.getAttribute('alt'))).toContain('Walgreens');
  });
  it('the ask band is the mockup variant', () => {
    expect(norm(doc.querySelector('#talk'))).toContain('Get a free in-store mockup of your event.');
  });
});

describe('marketing and about', () => {
  it('marketing has four cards', () => {
    expect(byKey.marketing.doc.querySelectorAll('main .card').length).toBe(4);
  });
  it('about sets 40+ apart inside the headline', () => {
    const h1 = byKey.about.doc.querySelector('main h1');
    expect(norm(h1.querySelector('b, .big'))).toBe('40+');
  });
});

describe('legal pages', () => {
  for (const key of ['privacy', 'terms']) {
    it(`${key} has the update line, numbered sections and the info@ mailto`, () => {
      const { doc } = byKey[key];
      expect(norm(doc.querySelector('main .legal__updated'))).toBe('Last updated: November 2026');
      const h2s = [...doc.querySelectorAll('main .legal h2')].map(norm);
      expect(h2s.length).toBe(key === 'privacy' ? 10 : 9);
      h2s.forEach((h, i) => expect(h.startsWith(`${i + 1}. `), h).toBe(true));
      expect(doc.querySelector('main a[href="mailto:info@emctickets.com"]')).not.toBeNull();
    });
  }
  it('privacy no longer promises a cookie banner choice that is gone', () => {
    const t = text('privacy');
    expect(t).not.toMatch(/clearing this site's browsing data/);
    expect(t).not.toMatch(/Usage data/);
  });
});

describe('not found', () => {
  it('links to home, the platform and ticket recovery', () => {
    const hrefs = [...byKey.notFound.doc.querySelectorAll('main a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/', '/platform/', 'https://app.emctickets.com/recover']));
  });
});
