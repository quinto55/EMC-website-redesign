# Production Finishing Touches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consent-gated analytics installed dark (PostHog/Clarity/LinkedIn/Meta), cookie banner, legal pages, full SEO/social head set, robots/sitemap, icons/manifest, branded 404, and a11y polish — per `docs/superpowers/specs/2026-07-19-production-finishing-touches-design.md`.

**Architecture:** Three new vanilla-JS modules (`site-config.js` → constants/IDs, `consent.js` → localStorage state + banner, `analytics.js` → per-vendor lazy loaders gated on prod-host AND consent AND non-empty ID), wired into both page entries. Static additions everywhere else: two legal pages + 404 on the existing chrome, head-meta blocks per page, `public/` assets, one `sharp` script for icons. Tests: consent/analytics unit tests plus a site-integrity test (sitemap↔file mapping, per-page meta, footer legal links).

**Tech Stack:** Static HTML + vanilla JS (ES modules), Vite MPA build, Vitest + happy-dom, `sharp` (devDependency, icons only).

## Global Constraints

- **All analytics IDs ship as empty strings** in `src/site-config.js` — no vendor SDK may load with an empty ID, and none of Ashley.ai's IDs may appear anywhere.
- **Gating is pre-load:** a vendor script tag may be injected only when `PROD_HOSTNAMES` contains the hostname AND consent === `'accepted'` AND that vendor's ID is non-empty. No `<noscript>` fallback pixels (cannot be consent-gated).
- **Constants:** `SITE_URL = 'https://emctickets.com'`, `PROD_HOSTNAMES = ['emctickets.com', 'www.emctickets.com']`, `CONTACT_EMAIL = 'info@emctickets.com'`, localStorage key `emc-cookie-consent` (values `'accepted'`/`'declined'`), consent event `emc:consent-accepted`.
- **Sitemap set (exactly these 8):** `/`, `/what-we-do.html`, `/sell-onsite.html`, `/sell-online.html`, `/sell-social.html`, `/contact.html`, `/privacy.html`, `/terms.html`. `experience.html` gets `noindex` and stays out; `404.html` stays out.
- **Existing 82 tests keep passing** at every commit. Known pre-existing "ECONNREFUSED 127.0.0.1:3000" output line is not yours to fix.
- Ticket system, flight sequence, and existing page copy untouched except where a step names an exact insertion.

## File Structure

- Create: `src/site-config.js`, `src/consent.js`, `src/analytics.js` — one concern each.
- Create: `privacy.html`, `terms.html` (site chrome + `.legal` prose), `404.html` (standalone).
- Create: `public/robots.txt`, `public/sitemap.xml`, `public/site.webmanifest`, `scripts/build-icons.mjs` (+ generated PNGs in `public/`).
- Modify: `src/main.js`, `src/sub.js` (wiring); `src/styles/base.css` (banner, skip-link); `src/styles/sections.css` (`.legal`, `user-select`); all 8 chrome pages (head-meta, icons links, skip link, footer legal links); `experience.html` (noindex); `vite.config.js` (3 new inputs); `package.json` (`icons` script, `sharp` devDep).
- Tests: `tests/consent.test.js`, `tests/analytics.test.js`, `tests/site-integrity.test.js`.

---

### Task 1: Config, consent, and analytics modules (TDD) + wiring + banner styles

**Files:**
- Create: `src/site-config.js`, `src/consent.js`, `src/analytics.js`
- Test: `tests/consent.test.js`, `tests/analytics.test.js` (create)
- Modify: `src/main.js`, `src/sub.js`, `src/styles/base.css`

**Interfaces:**
- Consumes: existing tokens (`--bg-elev`, `--border`, `--radius-card`, `--radius-pill`, `--gold-1`, `--gold-2`, `--fs-14`, `--ease`).
- Produces: `getConsent()`, `setConsent(v)`, `initConsentBanner(doc?)` from consent.js; `trackingAllowed(hostname?)`, `loadVendors(doc?)`, `initAnalytics(doc?, hostname?)` from analytics.js; all `site-config.js` exports. Task 2's privacy page is linked from the banner (`/privacy.html`) — created in Task 2; the dead link for one task is expected.

- [ ] **Step 1: Write the failing tests**

Create `tests/consent.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getConsent, setConsent, initConsentBanner } from '../src/consent.js';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('consent state', () => {
  it('is null before any decision', () => {
    expect(getConsent()).toBeNull();
  });

  it('round-trips accepted and declined', () => {
    setConsent('accepted');
    expect(getConsent()).toBe('accepted');
    setConsent('declined');
    expect(getConsent()).toBe('declined');
  });

  it('treats garbage storage values as undecided', () => {
    localStorage.setItem('emc-cookie-consent', 'maybe');
    expect(getConsent()).toBeNull();
  });

  it('dispatches emc:consent-accepted only on accept', () => {
    const spy = vi.fn();
    document.addEventListener('emc:consent-accepted', spy);
    setConsent('declined');
    expect(spy).not.toHaveBeenCalled();
    setConsent('accepted');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('banner', () => {
  it('renders only when undecided', () => {
    initConsentBanner();
    expect(document.querySelector('.cookie-banner')).not.toBeNull();
    document.body.innerHTML = '';
    setConsent('declined');
    expect(initConsentBanner()).toBeNull();
    expect(document.querySelector('.cookie-banner')).toBeNull();
  });

  it('Accept stores, dispatches, and removes the banner', () => {
    const spy = vi.fn();
    document.addEventListener('emc:consent-accepted', spy);
    initConsentBanner();
    document.querySelector('[data-consent="accepted"]').click();
    expect(getConsent()).toBe('accepted');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.cookie-banner')).toBeNull();
  });

  it('Decline stores and removes without dispatching', () => {
    const spy = vi.fn();
    document.addEventListener('emc:consent-accepted', spy);
    initConsentBanner();
    document.querySelector('[data-consent="declined"]').click();
    expect(getConsent()).toBe('declined');
    expect(spy).not.toHaveBeenCalled();
    expect(document.querySelector('.cookie-banner')).toBeNull();
  });

  it('links to the privacy policy', () => {
    initConsentBanner();
    expect(document.querySelector('.cookie-banner a[href="/privacy.html"]')).not.toBeNull();
  });
});
```

Create `tests/analytics.test.js`:

```js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const IDS = {
  SITE_URL: 'https://emctickets.com',
  PROD_HOSTNAMES: ['emctickets.com', 'www.emctickets.com'],
  CONTACT_EMAIL: 'info@emctickets.com',
  POSTHOG_KEY: 'phc_test',
  POSTHOG_HOST: 'https://us.i.posthog.com',
  CLARITY_ID: 'clarity_test',
  LINKEDIN_PARTNER_ID: '12345',
  META_PIXEL_ID: '67890',
};

function scriptSrcs() {
  return [...document.head.querySelectorAll('script[src]')].map((s) => s.src);
}

beforeEach(() => {
  localStorage.clear();
  document.head.querySelectorAll('script[src]').forEach((s) => s.remove());
  delete window.fbq; delete window._fbq; delete window.posthog;
  delete window.clarity; delete window._linkedin_partner_id;
  vi.resetModules();
});
afterEach(() => vi.doUnmock('../src/site-config.js'));

describe('with real (empty) config — installed dark', () => {
  it('injects nothing even with consent on prod host', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { loadVendors } = await import('../src/analytics.js');
    setConsent('accepted');
    loadVendors(document);
    expect(scriptSrcs()).toEqual([]);
  });
});

describe('with test IDs', () => {
  beforeEach(() => vi.doMock('../src/site-config.js', () => IDS));

  it('trackingAllowed needs prod host AND acceptance', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { trackingAllowed } = await import('../src/analytics.js');
    expect(trackingAllowed('emctickets.com')).toBe(false);
    setConsent('accepted');
    expect(trackingAllowed('emctickets.com')).toBe(true);
    expect(trackingAllowed('www.emctickets.com')).toBe(true);
    expect(trackingAllowed('localhost')).toBe(false);
  });

  it('declined consent injects nothing regardless of IDs', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { initAnalytics } = await import('../src/analytics.js');
    setConsent('declined');
    initAnalytics(document, 'emctickets.com');
    expect(scriptSrcs()).toEqual([]);
  });

  it('accepted consent on prod host injects all four vendors', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { initAnalytics } = await import('../src/analytics.js');
    setConsent('accepted');
    initAnalytics(document, 'emctickets.com');
    const srcs = scriptSrcs().join(' ');
    expect(srcs).toContain('us.i.posthog.com/static/array.js');
    expect(srcs).toContain('clarity.ms/tag/clarity_test');
    expect(srcs).toContain('snap.licdn.com');
    expect(srcs).toContain('connect.facebook.net');
    expect(window.fbq).toBeTypeOf('function');
  });

  it('undecided visitors get vendors only after accepting', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { initAnalytics } = await import('../src/analytics.js');
    initAnalytics(document, 'emctickets.com');
    expect(scriptSrcs()).toEqual([]);
    setConsent('accepted');
    expect(scriptSrcs().length).toBe(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/consent.test.js tests/analytics.test.js`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Create the three modules**

`src/site-config.js`:

```js
export const SITE_URL = 'https://emctickets.com';
export const PROD_HOSTNAMES = ['emctickets.com', 'www.emctickets.com'];
export const CONTACT_EMAIL = 'info@emctickets.com';

/* Analytics IDs — an empty string disables that vendor entirely.
   Paste real EMC account IDs here when they exist; nothing else to wire. */
export const POSTHOG_KEY = '';
export const POSTHOG_HOST = 'https://us.i.posthog.com';
export const CLARITY_ID = '';
export const LINKEDIN_PARTNER_ID = '';
export const META_PIXEL_ID = '';
```

`src/consent.js`:

```js
const KEY = 'emc-cookie-consent';

export function getConsent() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'accepted' || v === 'declined' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* storage unavailable (private mode) — treat as session-only choice */
  }
  if (value === 'accepted') {
    document.dispatchEvent(new CustomEvent('emc:consent-accepted'));
  }
}

export function initConsentBanner(doc = document) {
  if (getConsent() !== null) return null;
  const banner = doc.createElement('div');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML = `
    <p class="cookie-banner__text">We use cookies to understand how visitors use the site and to measure our advertising. See our <a href="/privacy.html">Privacy Policy</a>.</p>
    <div class="cookie-banner__actions">
      <button type="button" class="cookie-banner__btn" data-consent="declined">Decline</button>
      <button type="button" class="cookie-banner__btn cookie-banner__btn--accept" data-consent="accepted">Accept</button>
    </div>`;
  banner.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-consent]');
    if (!btn) return;
    setConsent(btn.dataset.consent);
    banner.remove();
  });
  doc.body.appendChild(banner);
  return banner;
}
```

`src/analytics.js`:

```js
import { getConsent } from './consent.js';
import {
  PROD_HOSTNAMES,
  POSTHOG_KEY,
  POSTHOG_HOST,
  CLARITY_ID,
  LINKEDIN_PARTNER_ID,
  META_PIXEL_ID,
} from './site-config.js';

export function trackingAllowed(hostname = location.hostname) {
  return PROD_HOSTNAMES.includes(hostname) && getConsent() === 'accepted';
}

function injectScript(src, doc) {
  const s = doc.createElement('script');
  s.async = true;
  s.src = src;
  doc.head.appendChild(s);
}

export function loadVendors(doc = document) {
  const w = doc.defaultView || window;
  if (POSTHOG_KEY && !w.posthog) {
    // Official stub: queue init until the SDK script arrives.
    const ph = (w.posthog = []);
    ph._i = [];
    ph.init = (key, cfg) => ph._i.push([key, cfg]);
    injectScript(`${POSTHOG_HOST}/static/array.js`, doc);
    ph.init(POSTHOG_KEY, { api_host: POSTHOG_HOST });
  }
  if (CLARITY_ID && !w.clarity) {
    w.clarity = function (...args) {
      (w.clarity.q = w.clarity.q || []).push(args);
    };
    injectScript(`https://www.clarity.ms/tag/${CLARITY_ID}`, doc);
  }
  if (LINKEDIN_PARTNER_ID && !w._linkedin_partner_id) {
    w._linkedin_partner_id = LINKEDIN_PARTNER_ID;
    w._linkedin_data_partner_ids = w._linkedin_data_partner_ids || [];
    w._linkedin_data_partner_ids.push(LINKEDIN_PARTNER_ID);
    injectScript('https://snap.licdn.com/li.lms-analytics/insight.min.js', doc);
  }
  if (META_PIXEL_ID && !w.fbq) {
    const fbq = (w.fbq = function (...args) {
      fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args);
    });
    w._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    injectScript('https://connect.facebook.net/en_US/fbevents.js', doc);
    w.fbq('init', META_PIXEL_ID);
    w.fbq('track', 'PageView');
  }
}

export function initAnalytics(doc = document, hostname = location.hostname) {
  if (!PROD_HOSTNAMES.includes(hostname)) return;
  if (getConsent() === 'accepted') {
    loadVendors(doc);
    return;
  }
  doc.addEventListener(
    'emc:consent-accepted',
    () => loadVendors(doc),
    { once: true }
  );
}
```

- [ ] **Step 4: Run the new tests to verify they pass**

Run: `npx vitest run tests/consent.test.js tests/analytics.test.js`
Expected: PASS — 13 tests.

- [ ] **Step 5: Wire both entries**

In `src/sub.js`: add `import { initConsentBanner } from './consent.js';` and `import { initAnalytics } from './analytics.js';` alongside the other module imports, and add `initConsentBanner();` and `initAnalytics();` at the end of the existing `DOMContentLoaded` handler (after `initAutoplayVideos(...)`).

In `src/main.js`: add the same two imports with the other imports, and the same two calls at the end of its startup sequence (read the file first; add the calls where the other `init*` calls run after DOM readiness — same pattern as sub.js).

- [ ] **Step 6: Banner styles**

Append to `src/styles/base.css`:

```css
/* Cookie consent banner — site chrome, above nav. */
.cookie-banner {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 200;
  max-width: 380px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 18px 20px;
  box-shadow: 0 24px 60px -24px rgba(0, 0, 0, 0.6);
  animation: cookie-banner-in 250ms var(--ease);
}

@keyframes cookie-banner-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

.cookie-banner__text {
  font-size: var(--fs-14);
  color: var(--text-muted);
  margin: 0 0 14px;
}

.cookie-banner__text a { color: var(--gold-1); }

.cookie-banner__actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.cookie-banner__btn {
  font: inherit;
  font-size: var(--fs-14);
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.cookie-banner__btn--accept {
  background: linear-gradient(135deg, var(--gold-1), var(--gold-2));
  color: #241a05;
  border: 0;
  font-weight: 600;
}

@media (max-width: 768px) {
  .cookie-banner {
    left: 12px;
    right: 12px;
    bottom: 12px;
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cookie-banner { animation: none; }
}
```

- [ ] **Step 7: Full suite + commit**

Run: `npm run test` — Expected: 95 tests pass (82 + 13).

```bash
git add src/site-config.js src/consent.js src/analytics.js tests/consent.test.js tests/analytics.test.js src/main.js src/sub.js src/styles/base.css
git commit -m "feat(prod): consent-gated analytics installed dark — config, banner, four vendor loaders"
```

---

### Task 2: Legal pages, .legal styles, footer links, build inputs

**Files:**
- Create: `privacy.html`, `terms.html`
- Modify: `src/styles/sections.css` (`.legal` block), `vite.config.js` (2 inputs), and the `.site-footer__legal` block in: `index.html`, `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `contact.html` (privacy/terms pages are created with it already).

**Interfaces:**
- Consumes: existing nav/footer chrome markup (copy the `<nav class="site-nav">…` header block and the whole `<footer class="site-footer">…</footer>` from `contact.html`, then apply the footer edit below); `sub.js` entry; Task 1's banner (privacy link target now resolves).
- Produces: `/privacy.html` and `/terms.html` — Task 3 adds them to sitemap/meta and its integrity test asserts the footer links sitewide.

- [ ] **Step 1: `.legal` prose styles**

Append to `src/styles/sections.css`:

```css
/* Long-form legal prose (privacy, terms). */
.legal {
  max-width: 72ch;
  margin: 0 auto;
  padding: 144px var(--gutter) 96px;
}

.legal h1 {
  font-size: var(--fs-40);
  margin-bottom: 8px;
}

.legal__updated {
  color: var(--text-dim);
  font-size: var(--fs-14);
  margin-bottom: 40px;
}

.legal h2 {
  font-size: var(--fs-22);
  margin: 36px 0 10px;
}

.legal p, .legal li {
  font-size: var(--fs-16);
  color: var(--text-muted);
  line-height: 1.65;
}

.legal ul {
  padding-left: 22px;
  margin: 10px 0;
}

.legal a { color: var(--gold-1); }
```

- [ ] **Step 2: Create `privacy.html`**

Head (before the sub.js script tag, matching the other pages' head shape):

```html
<title>Privacy Policy — EMC Tickets</title>
<meta name="description" content="How EMC Tickets collects, uses, and protects information on this site — including cookies and analytics you can accept or decline.">
```

Body: the standard chrome (nav header block and footer block copied from `contact.html`, with the footer edit from Step 4 already applied), and this `<main>`:

```html
<main id="main">
  <section class="legal">
    <h1>Privacy Policy</h1>
    <p class="legal__updated">Last updated: July 19, 2026</p>

    <h2>1. Introduction</h2>
    <p>EMC Tickets ("we," "us") provides ticketing, scanning, marketing, and advertising services for live events. This policy explains what information this website collects and how we use it.</p>

    <h2>2. Information we collect</h2>
    <ul>
      <li><strong>Contact information</strong> you submit through our contact form or by emailing us — typically your name, email address, organization, and message.</li>
      <li><strong>Usage data</strong> — pages visited, approximate location, device and browser characteristics — collected by the analytics tools below only after you accept cookies.</li>
      <li><strong>Cookies &amp; tracking.</strong> With your consent, this site uses PostHog (product analytics and session replay), Microsoft Clarity (usage analytics), the LinkedIn Insight Tag, and the Meta Pixel (advertising measurement). None of these load unless you choose "Accept" on our cookie banner; declining keeps them off entirely.</li>
    </ul>

    <h2>3. How we use information</h2>
    <p>To respond to inquiries, operate and improve this website, understand which of our services interest visitors, and measure the effectiveness of our advertising.</p>

    <h2>4. Sharing &amp; disclosure</h2>
    <p>We do not sell your personal information. We share it only with the service providers named above (each processing data under their own terms), with professional advisers where required, or where the law requires disclosure.</p>

    <h2>5. Data retention</h2>
    <p>Contact inquiries are kept as long as needed to handle your request and our business records. Analytics data is retained per each provider's standard retention settings.</p>

    <h2>6. Your rights</h2>
    <p>You may request access to, correction of, or deletion of your personal information by emailing <a href="mailto:info@emctickets.com">info@emctickets.com</a>. You can withdraw cookie consent at any time by clearing this site's browsing data, which resets the banner choice.</p>

    <h2>7. Security</h2>
    <p>We use reasonable technical and organizational measures to protect the information we hold. No method of transmission or storage is completely secure.</p>

    <h2>8. Children's privacy</h2>
    <p>This site is not directed at children under 13, and we do not knowingly collect their personal information.</p>

    <h2>9. Changes to this policy</h2>
    <p>We may update this policy from time to time; the date above reflects the latest revision. Material changes will be posted on this page.</p>

    <h2>10. Contact</h2>
    <p>Questions about this policy: <a href="mailto:info@emctickets.com">info@emctickets.com</a>, or EMC Tickets, 8409 Land O Lakes Blvd, Land O Lakes, FL 34638.</p>
  </section>
</main>
```

- [ ] **Step 3: Create `terms.html`**

Head:

```html
<title>Terms of Service — EMC Tickets</title>
<meta name="description" content="The terms that govern use of the EMC Tickets website.">
```

`<main>`:

```html
<main id="main">
  <section class="legal">
    <h1>Terms of Service</h1>
    <p class="legal__updated">Last updated: July 19, 2026</p>

    <h2>1. Acceptance of terms</h2>
    <p>By using this website you agree to these terms. If you do not agree, please do not use the site.</p>

    <h2>2. Description of service</h2>
    <p>This website presents EMC Tickets' ticketing, scanning, marketing, and advertising services and lets you contact us. Engagements for those services are governed by separate written agreements, not these terms.</p>

    <h2>3. Acceptable use</h2>
    <p>You agree not to misuse the site — including attempting to disrupt it, scrape it at scale, misrepresent your identity in communications with us, or use it for unlawful purposes.</p>

    <h2>4. Intellectual property</h2>
    <p>All content on this site — text, design, graphics, logos, and imagery — belongs to EMC Tickets or its licensors and may not be reproduced without permission.</p>

    <h2>5. Disclaimer of warranties</h2>
    <p>The site is provided "as is" without warranties of any kind, express or implied, including fitness for a particular purpose and non-infringement.</p>

    <h2>6. Limitation of liability</h2>
    <p>To the fullest extent permitted by law, EMC Tickets is not liable for indirect, incidental, or consequential damages arising from use of this website.</p>

    <h2>7. Governing law</h2>
    <p>These terms are governed by the laws of the State of Florida, without regard to conflict-of-law principles.</p>

    <h2>8. Changes to these terms</h2>
    <p>We may revise these terms; the date above reflects the latest revision. Continued use after changes constitutes acceptance.</p>

    <h2>9. Contact</h2>
    <p>Questions about these terms: <a href="mailto:info@emctickets.com">info@emctickets.com</a>.</p>
  </section>
</main>
```

Both pages use the same head boilerplate as `contact.html` (charset, js-class script, viewport, favicon, font preloads, `<script type="module" src="/src/sub.js"></script>`).

- [ ] **Step 4: Footer legal links on the six existing chrome pages**

In each of `index.html`, `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `contact.html` (and built into the two new pages), replace:

```html
      <div class="site-footer__legal">
        <span>&copy; EMC Tickets</span>
        <span>Land O Lakes, Florida</span>
      </div>
```

with:

```html
      <div class="site-footer__legal">
        <span>&copy; EMC Tickets</span>
        <span><a href="/privacy.html">Privacy Policy</a> · <a href="/terms.html">Terms of Service</a></span>
        <span>Land O Lakes, Florida</span>
      </div>
```

- [ ] **Step 5: Build inputs**

In `vite.config.js` `rollupOptions.input`, after the `contact` line add:

```js
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
```

- [ ] **Step 6: Verify + commit**

Run: `npm run test` — Expected: 93 pass (no test changes this task).
Run: `npx vite build 2>&1 | tail -3` — Expected: build succeeds, no missing-input errors.

```bash
git add privacy.html terms.html src/styles/sections.css vite.config.js index.html what-we-do.html sell-onsite.html sell-online.html sell-social.html contact.html
git commit -m "feat(prod): privacy + terms pages on the site chrome; footer legal links sitewide"
```

---

### Task 3: SEO head-meta, robots, sitemap, JSON-LD, integrity test (TDD)

**Files:**
- Test: `tests/site-integrity.test.js` (create)
- Create: `public/robots.txt`, `public/sitemap.xml`
- Modify: head of all 8 chrome pages; `experience.html` (noindex); `index.html` additionally gets JSON-LD.

**Interfaces:**
- Consumes: existing per-page `<title>`/description values (reused verbatim as OG values); Task 2's pages.
- Produces: the 8-page sitemap contract Task 5's battery and future work rely on.

- [ ] **Step 1: Write the failing test**

Create `tests/site-integrity.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (f) => readFileSync(new URL(f, root), 'utf8');

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
      expect(existsSync(new URL(urlToFile(url), root)), url).toBe(true);
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/site-integrity.test.js`
Expected: FAIL — sitemap/robots missing, meta absent.

- [ ] **Step 3: Create `public/robots.txt` and `public/sitemap.xml`**

`public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://emctickets.com/sitemap.xml
```

`public/sitemap.xml` (lastmod July 19, 2026 on all entries):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://emctickets.com/</loc><lastmod>2026-07-19</lastmod></url>
  <url><loc>https://emctickets.com/what-we-do.html</loc><lastmod>2026-07-19</lastmod></url>
  <url><loc>https://emctickets.com/sell-onsite.html</loc><lastmod>2026-07-19</lastmod></url>
  <url><loc>https://emctickets.com/sell-online.html</loc><lastmod>2026-07-19</lastmod></url>
  <url><loc>https://emctickets.com/sell-social.html</loc><lastmod>2026-07-19</lastmod></url>
  <url><loc>https://emctickets.com/contact.html</loc><lastmod>2026-07-19</lastmod></url>
  <url><loc>https://emctickets.com/privacy.html</loc><lastmod>2026-07-19</lastmod></url>
  <url><loc>https://emctickets.com/terms.html</loc><lastmod>2026-07-19</lastmod></url>
</urlset>
```

- [ ] **Step 4: Head-meta block on each of the 8 pages**

Insert directly after each page's `<meta name="description" …>` line (title/description values below are each page's EXISTING ones, reused; privacy/terms use their Task 2 values):

```html
  <link rel="canonical" href="<CANONICAL>">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="EMC Tickets">
  <meta property="og:title" content="<TITLE>">
  <meta property="og:description" content="<DESCRIPTION>">
  <meta property="og:url" content="<CANONICAL>">
  <meta property="og:image" content="https://emctickets.com/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<TITLE>">
  <meta name="twitter:description" content="<DESCRIPTION>">
  <meta name="twitter:image" content="https://emctickets.com/og-image.png">
  <meta name="theme-color" content="#07090f">
```

Canonicals: `https://emctickets.com/` (index) and `https://emctickets.com/<file>.html` for the other seven. `<TITLE>` = the page's `<title>` text; `<DESCRIPTION>` = the page's meta description content, both copied exactly.

- [ ] **Step 5: JSON-LD on `index.html` + noindex on `experience.html`**

In `index.html`, directly before `</head>`:

```html
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "name": "EMC Tickets",
        "url": "https://emctickets.com",
        "logo": "https://emctickets.com/logo.svg",
        "email": "info@emctickets.com",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "8409 Land O Lakes Blvd",
          "addressLocality": "Land O Lakes",
          "addressRegion": "FL",
          "postalCode": "34638",
          "addressCountry": "US"
        }
      },
      {
        "@type": "WebSite",
        "name": "EMC Tickets",
        "url": "https://emctickets.com"
      }
    ]
  }
  </script>
```

In `experience.html` `<head>`, after the viewport meta: `<meta name="robots" content="noindex">`

- [ ] **Step 6: Verify + commit**

Run: `npx vitest run tests/site-integrity.test.js` — Expected: PASS (9 tests). Then npm run test — 104 total.
Run: `npm run test` — Expected: 104 pass.

```bash
git add tests/site-integrity.test.js public/robots.txt public/sitemap.xml index.html what-we-do.html sell-onsite.html sell-online.html sell-social.html contact.html privacy.html terms.html experience.html
git commit -m "feat(prod): canonical/OG/twitter meta sitewide, robots + sitemap, Organization JSON-LD, noindex legacy stub"
```

---

### Task 4: Icons + manifest, 404 page, skip links, print polish

**Files:**
- Create: `scripts/build-icons.mjs`, `public/site.webmanifest`, `404.html` (+ generated `public/favicon-*.png`, `public/apple-touch-icon.png`)
- Modify: `package.json` (script + devDep), all 8 chrome pages (+ `404.html`) head icon links and skip link + `id="main"`, `src/styles/base.css` (skip link), `src/styles/sections.css` (`user-select`), `vite.config.js` (notFound input).

**Interfaces:**
- Consumes: `public/favicon.svg` (exists); tokens.
- Produces: nothing downstream — final implementation task.

- [ ] **Step 1: Icon script**

`scripts/build-icons.mjs`:

```js
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url));
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname;

const targets = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['favicon-192x192.png', 192],
  ['favicon-512x512.png', 512],
  ['apple-touch-icon.png', 180],
];

for (const [name, size] of targets) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out(name));
  console.log(`wrote public/${name}`);
}
```

Run: `npm install -D sharp` then add to `package.json` scripts: `"icons": "node scripts/build-icons.mjs"`, then `npm run icons`.
Expected: five `wrote public/…` lines; verify with `ls public/*.png`.

- [ ] **Step 2: Manifest**

`public/site.webmanifest`:

```json
{
  "name": "EMC Tickets",
  "short_name": "EMC",
  "icons": [
    { "src": "/favicon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/favicon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#C8102E",
  "background_color": "#07090f",
  "display": "standalone"
}
```

- [ ] **Step 3: Icon links in every head (8 chrome pages + 404.html)**

Directly after the existing `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` line:

```html
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
```

- [ ] **Step 4: 404 page**

Create `404.html` (standalone, no nav/footer; add `notFound: resolve(__dirname, '404.html')` to vite inputs):

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>404 — EMC Tickets</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#07090f">
  <script type="module">
    import '/src/styles/tokens.css';
    import '/src/styles/base.css';
    import '/src/styles/sections.css';
  </script>
  <style>
    .void-stage { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .void-wrap { text-align: center; }
    .void-ticket { max-width: 420px; margin: 0 auto 32px; text-align: left; }
    .void-ticket .card__stamp {
      position: absolute; inset: 0; display: grid; place-items: center;
      font-weight: 800; font-size: 64px; letter-spacing: 0.3em;
      color: rgba(249, 237, 216, 0.28); transform: rotate(-14deg);
      pointer-events: none; font-family: var(--font-display);
    }
    .void-title { font-family: var(--font-display); font-size: var(--fs-40); margin: 0 0 8px; }
    .void-copy { color: var(--text-muted); margin: 0 0 28px; }
    .void-btn {
      display: inline-block; padding: 12px 28px; border-radius: var(--radius-pill);
      background: linear-gradient(135deg, var(--gold-1), var(--gold-2));
      color: #241a05; font-weight: 600; text-decoration: none;
    }
  </style>
</head>
<body>
  <main id="main" class="void-stage">
    <div class="void-wrap">
      <article class="card void-ticket" aria-hidden="true">
        <span class="card__frame"></span>
        <span class="card__rail card__rail--l">ADMIT&nbsp;ONE&nbsp;&#9733;</span>
        <span class="card__rail card__rail--r">ADMIT&nbsp;ONE&nbsp;&#9733;</span>
        <div class="card__serial"><span>EMC TICKETS</span><span>№ 000404</span></div>
        <div class="card__perf"></div>
        <h3 class="card__title">This ticket isn't valid</h3>
        <p class="card__body">The page you're looking for has left the fairgrounds.</p>
        <span class="card__stamp">VOID</span>
      </article>
      <h1 class="void-title">404</h1>
      <p class="void-copy">Let's get you back through the gate.</p>
      <a class="void-btn" href="/">Back to the midway</a>
    </div>
  </main>
</body>
</html>
```

- [ ] **Step 5: Skip link + `id="main"` + print polish**

Append to `src/styles/base.css`:

```css
/* Skip-to-content — visually hidden until keyboard focus. */
.skip-link {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 300;
  padding: 10px 18px;
  border-radius: var(--radius-pill);
  background: var(--gold-1);
  color: #241a05;
  font-weight: 600;
  text-decoration: none;
  transform: translateY(-200%);
}

.skip-link:focus { transform: none; }
```

In each of the 8 chrome pages: add `<a class="skip-link" href="#main">Skip to content</a>` as the FIRST element inside `<body>` (before the SVG defs on index), and add `id="main"` to the page's `<main>` element if it lacks one.

Append to `src/styles/sections.css` (after the `.card__serial` rule):

```css
.card__rail,
.card__serial {
  user-select: none;
}
```

- [ ] **Step 6: Verify + commit**

Run: `npm run test` — Expected: 104 pass.
Run: `npx vite build 2>&1 | tail -3` — Expected: success including the 404 input.

```bash
git add scripts/build-icons.mjs package.json package-lock.json public/site.webmanifest public/*.png 404.html vite.config.js src/styles/base.css src/styles/sections.css index.html what-we-do.html sell-onsite.html sell-online.html sell-social.html contact.html privacy.html terms.html
git commit -m "feat(prod): icon set + manifest, VOID-ticket 404, skip links, decorative print unselectable"
```

---

### Task 5 (controller-led): og-image, browser battery, final review

Not dispatched to an implementer — the controller performs these directly:

- [ ] Compose a throwaway 1200×630 HTML frame (night background, EMC wordmark, red ADMIT ONE ticket), render in the browser at exact size, capture, save as `public/og-image.png`, commit.
- [ ] Browser battery: banner appears once and persists choice; Decline injects zero vendor scripts (verify network/DOM); legal pages render on the chrome; 404 renders with VOID ticket; skip link appears on Tab; icons/manifest resolve; homepage/meta spot-checks.
- [ ] Full suite + `vite build`; dispatch the whole-branch final review with the deferred-minors list; fix wave if needed; then finishing-a-development-branch.
