# Production Finishing Touches — Design

**Date:** 2026-07-19
**Status:** Approved by Anthony (design dialogue, 2026-07-19; stack/IDs/domain/
email decisions recorded below)
**Scope:** New `src/site-config.js`, `src/consent.js`, `src/analytics.js`;
banner styles in `src/styles/base.css`; wiring in `src/main.js` and
`src/sub.js`; new pages `privacy.html`, `terms.html`, `404.html`; head-meta
additions to all existing pages; `public/` gains robots.txt, sitemap.xml,
og-image.png, webmanifest, PNG icon set; `scripts/build-icons.mjs` +
`sharp` devDependency; `vite.config.js` build inputs for the new pages;
footer Privacy/Terms links on every page; small a11y/polish items; new test
files. The flight sequence, ticket system, and all existing page content are
untouched.

## Decisions (recorded from dialogue)

- **Stack:** PostHog + Microsoft Clarity + LinkedIn Insight + Meta Pixel.
  No RB2B. (Ashley's stack minus RB2B, plus Meta — EMC markets consumer
  events.)
- **IDs:** install dark. All IDs are empty strings in `site-config.js`;
  every tracker is inert until a real ID is pasted in. Ashley's IDs are
  never reused.
- **Domain:** `https://emctickets.com`. **Legal email:** `info@emctickets.com`.

## 1. Config — `src/site-config.js`

```js
export const SITE_URL = 'https://emctickets.com';
export const PROD_HOSTNAMES = ['emctickets.com', 'www.emctickets.com'];
export const CONTACT_EMAIL = 'info@emctickets.com';

/* Analytics IDs — empty string disables that vendor entirely. */
export const POSTHOG_KEY = '';
export const POSTHOG_HOST = 'https://us.i.posthog.com';
export const CLARITY_ID = '';
export const LINKEDIN_PARTNER_ID = '';
export const META_PIXEL_ID = '';
```

## 2. Consent — `src/consent.js`

Mirrors Ashley's mechanism in vanilla JS:

- Storage: `localStorage` key `emc-cookie-consent`, values `'accepted'` |
  `'declined'`. Absent key = undecided.
- API: `getConsent()`, `setConsent(value)` (writes storage, dispatches
  `CustomEvent('emc:consent-accepted')` on `document` when accepting),
  `initConsentBanner()` (injects the banner only when undecided —
  returning visitors never see a flash).
- Banner markup (injected into `document.body`): `.cookie-banner` with a
  short line — "We use cookies to understand how visitors use the site and
  to measure our advertising. See our <a href="/privacy.html">Privacy
  Policy</a>." — and two buttons: `Decline`, `Accept` (accept styled as the
  primary gold action). Buttons remove the banner immediately, no reload.
- Styles in `base.css` (site chrome, not ticket content): dark-elevated
  card (`--bg-elev`, 1px `--border`, `--radius-card`), fixed bottom-right
  at ≥769px (24px inset, max-width 380px), full-width bottom bar ≤768px;
  fade/slide-in ≤250ms honoring reduced motion; `role="region"`
  `aria-label="Cookie consent"`; z-index above nav.

## 3. Analytics — `src/analytics.js`

- `trackingAllowed()` = `PROD_HOSTNAMES.includes(location.hostname)` AND
  `getConsent() === 'accepted'`. Localhost and previews never fire, even
  with real IDs.
- `initAnalytics()`: if allowed, load each vendor whose ID is non-empty;
  otherwise register a one-time `emc:consent-accepted` listener and load
  then. Each loader injects the vendor's official snippet dynamically:
  - **PostHog:** official array/stub loader from `POSTHOG_HOST`; default
    pageview capture (static MPA — every load is a real pageview);
    session recording with password masking (vendor default).
  - **Clarity:** standard `clarity.ms` loader with `CLARITY_ID`.
  - **LinkedIn:** `_linkedin_partner_id` + snap.licdn.com loader.
  - **Meta:** standard `fbq` bootstrap + `fbq('init', META_PIXEL_ID)` +
    `fbq('track', 'PageView')`.
- **Deliberate deviation from Ashley:** no `<noscript>` fallback pixels.
  In static HTML they cannot be consent-gated and would fire on Decline.
- Wiring: `main.js` and `sub.js` both call `initConsentBanner()` and
  `initAnalytics()` on DOMContentLoaded.

## 4. Legal pages — `privacy.html`, `terms.html`

Static pages on the existing sub-page chrome (nav + footer identical to
other sub-pages, no subhero video — a simple `.legal` header block), body
in a new `.legal` prose style in `sections.css`: max-width 72ch, `--fs-16`,
muted body, Fraunces `h1/h2`, generous rhythm. Content adapted from
Ashley's section structure to EMC's business:

- **Privacy** ("Last updated: July 19, 2026"): Introduction; Information We
  Collect (contact-form data; usage data; cookies & tracking — names the
  four vendors and states they load only after consent); How We Use It;
  Sharing & Disclosure (service providers incl. the four vendors); Data
  Retention; Your Rights (access/deletion/opt-out — mentions the banner
  choice is changeable by clearing site data); Security; Children's
  Privacy (not directed at under-13s); Changes; Contact
  (`info@emctickets.com`).
- **Terms** ("Last updated: July 19, 2026"): Acceptance; Description of
  Service (ticketing & event-marketing services info site); Acceptable
  Use; Intellectual Property; Disclaimer of Warranties; Limitation of
  Liability; Governing Law (Florida); Changes; Contact.
- Cookie disclosure lives inside Privacy (Ashley's pattern; the banner is
  the "cookie disclaimer" surface, the policy is the detail).
- Footer on every page that has the site footer (the eight sitemap pages —
  404.html is footer-less by design) gains a second line: Privacy Policy ·
  Terms of Service links.
- Both pages: `<meta name="robots" content="index">`-eligible, in sitemap,
  full head-meta set (§5). Both load `sub.js` (nav/footer/banner/analytics
  consistency).

## 5. SEO & social — every indexable page

Head additions per page (values per-page, one shared image):

```html
<link rel="canonical" href="https://emctickets.com/<page>">
<meta property="og:type" content="website">
<meta property="og:site_name" content="EMC Tickets">
<meta property="og:title" content="<page title>">
<meta property="og:description" content="<page description>">
<meta property="og:url" content="https://emctickets.com/<page>">
<meta property="og:image" content="https://emctickets.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<page title>">
<meta name="twitter:description" content="<page description>">
<meta name="twitter:image" content="https://emctickets.com/og-image.png">
<meta name="theme-color" content="#07090f">
```

Canonical for the homepage is `https://emctickets.com/`; other pages use
their `.html` paths. Existing titles/descriptions are reused as OG values.

- **og-image.png:** 1200×630, ticket-branded (wordmark + red ADMIT ONE
  ticket on the night background), composed as a throwaway HTML frame and
  captured in the browser during implementation; stored at
  `public/og-image.png`.
- **robots.txt** (`public/`): `User-agent: *` / `Allow: /` /
  `Sitemap: https://emctickets.com/sitemap.xml`.
- **sitemap.xml** (`public/`): exactly eight URLs — `/`,
  `/what-we-do.html`, `/sell-onsite.html`, `/sell-online.html`,
  `/sell-social.html`, `/contact.html`, `/privacy.html`, `/terms.html`.
  No dead links (a test enforces URL↔file integrity).
- **JSON-LD** (index.html only): one `@graph` with `Organization` (name
  "EMC Tickets", url, `logo: https://emctickets.com/logo.svg`,
  `email: info@emctickets.com`) and `WebSite` (name, url).
- **experience.html** (legacy redirect stub): `<meta name="robots"
  content="noindex">`; excluded from sitemap.

## 6. Icons & manifest

- `scripts/build-icons.mjs` (node, `sharp` as devDependency, run manually
  via `npm run icons`): renders `public/favicon.svg` to
  `public/favicon-16x16.png`, `favicon-32x32.png`, `favicon-192x192.png`,
  `favicon-512x512.png`, `apple-touch-icon.png` (180×180).
- `public/site.webmanifest`: name "EMC Tickets", short_name "EMC", icons
  192/512, `theme_color: "#C8102E"`, `background_color: "#07090f"`,
  `display: "standalone"`.
- Head additions (all pages): PNG icon links (16/32), apple-touch-icon,
  manifest link. The existing SVG favicon link stays first (modern
  browsers prefer it).

## 7. 404 page — `404.html`

Standalone branded page (static hosts serve `404.html` by convention):
night background, nav-less, a red ticket (reusing the card material via the
site stylesheets) bearing a rotated cream "VOID" stamp and a Fraunces
"404 — This ticket isn't valid", CTA button "Back to the midway" → `/`.
Loads styles through a minimal module entry so Vite bundles it; added to
build inputs along with privacy/terms.

## 8. Small wins

- Skip link: `<a class="skip-link" href="#main">Skip to content</a>` first
  in `<body>` on all pages; each page's `<main>` gets `id="main"`;
  `.skip-link` visually hidden until focused (base.css).
- `user-select: none` on `.card__rail` and `.card__serial` (clears the
  parked follow-up — decorative print stays out of copy/paste).
- External-link audit: all `target="_blank"` links carry
  `rel="noopener noreferrer"`.

## 9. Testing

- `tests/consent.test.js`: storage round-trip; banner renders only when
  undecided; Accept writes + dispatches event + removes banner; Decline
  writes + removes banner.
- `tests/analytics.test.js`: with empty IDs nothing is injected even when
  allowed; declined/undecided injects nothing regardless of IDs; accepted +
  ID + prod hostname injects that vendor's script tag (hostname faked via
  injectable parameter or happy-dom URL).
- `tests/site-integrity.test.js`: every sitemap URL maps to an existing
  HTML file and vice-versa (the 8-page set, experience.html excluded);
  every page has canonical + og:title + og:description + og:image +
  twitter:card; titles unique across pages; robots.txt references the
  sitemap; footer legal links present on every page.
- Existing 82 tests keep passing. Browser battery: banner flow
  (accept/decline/persistence), no script tags on decline, legal pages
  render, 404 renders, skip link focuses.

## Out of scope

Real analytics IDs (installed dark), hosting/deployment config, a
standalone cookie-policy page (folded into Privacy, Ashley's pattern),
Sentry/Resend (Ashley never shipped them either), contact-form backend
changes, `<noscript>` pixels (deliberately omitted). The legal copy is
informed boilerplate, not legal advice — recommend counsel review before
launch.
