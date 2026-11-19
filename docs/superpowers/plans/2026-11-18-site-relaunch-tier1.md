# EMC Site Relaunch, Tier 1 (go-live essentials) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the July carnival-ticket site in this repo with the "Sunny board" relaunch: nine pages, a working contact form, the live sample board, two demos, the `/iafe/` landing page, staging, and the package that puts the site on the current web host beside WordPress.

**Architecture:** Static HTML pages in directories, built by Vite as a multi-page site. A small build step (`build/render.js`, run by a Vite plugin and by the tests) fills each page's head, header, footer and ask band from one page registry, so shared parts cannot drift. All behavior is plain ES modules: pure logic modules with unit tests, and thin view modules that mount them. Every page is complete without JavaScript.

**Tech Stack:** Vite 5 (multi-page), Vitest + happy-dom, sharp (images and icons), no framework, no runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-18-site-relaunch-design.md`. Look reference: `docs/superpowers/specs/assets/2026-11-18-site-relaunch/mockup.html` (the `.d2` and `.bg-b` rules are the approved look; ignore `.bg-a`, `.bg-c`, `.bg-d`, `.pick` and `.phones`).

**Scope:** Tier 1 of spec section 10, as changed by Anthony on 2026-11-18 (see "Changes after the plan was written"). The curtain, anything further for Gate scanning and Daily reports, the longer "For your guests" blocks and polish are tier 2 and 3, in a follow-up plan.

**Branch:** `feature/relaunch-tier1` in the main checkout (no worktree). Merge with `--no-ff`.

## Global Constraints

- No em dash (U+2014 or `&mdash;`) in any page, title or description. Write "to" for ranges ("Nov 30 to Dec 1").
- The only phone number anywhere is `800-290-2090` (`tel:+18002902090`), labeled "Toll free, 24/7".
- The only named person is Anthony Quintana, `anthony@emctickets.com`. Legal contact in Privacy and Terms is `info@emctickets.com`.
- Office address: 8409 Land O Lakes Blvd, Land O Lakes, FL 34638.
- No pricing or fees, no "lowest price" style claim. Dollar amounts appear only inside demo containers marked `data-sample`.
- No invented numbers. Outside `data-sample` containers and the two legal pages, the only numbers are: 40+, 8,000+, 78%, 5 (miles), 30 (days, and Nov 30), 24/7, 410, 2026, 2027, 01 02 03, 1 2 3 4, 8409, 34638.
- Approved sentences are used exactly as written in spec section 3.2. Do not shorten or reword them.
- Every demo is labeled "Sample data", uses "Demo County Fair", and shows two sales channels only: Online and Box office. No store sales in any live view.
- Logo: the three-red-ticket EMC logo. Never scale it above its native 309 x 250 pixels.
- Static HTML, Vite 5, Vitest + happy-dom, no framework, no new runtime dependency. `vite.config.js` keeps `server.watch.usePolling`.
- Pages are directories with a trailing slash. Everything the build puts in the web root besides the page folders, `index.html`, `robots.txt` and `sitemap.xml` lives under `emc-site/`.
- The repo is public. No secrets. Nothing from `Desktop/EMC Master`.
- Tests resolve paths with `fileURLToPath(import.meta.url)` (the repo path contains a space).
- Every page works with JavaScript off: content, contact details and links are in the HTML; JavaScript only adds.
- Phones first: no sideways scroll at 360px, tap targets at least 44px, visible focus, reduced-motion visitors get no decorative motion.
- Commits: conventional style (`feat(scope): ...`), each message ending with these two lines:
  ```
  Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01FKnPzdhTCJM2VkUiwvKxfT
  ```
- Do not push, deploy or touch `dist/` (it is its own git repo). The controller does that at the end.
- Screenshot tool for visual checks (set up by the controller, git-ignored): with `npm run dev` running,
  `node .superpowers/tools/shots.mjs /platform/ /` writes phone (360 and 390 wide) and computer (1280 wide) screenshots to `.superpowers/shots/` and prints any page that scrolls sideways. Look at the screenshots with the Read tool. Stop the dev server by port when done: `kill $(ss -ltnp | grep ':5173 ' | grep -o 'pid=[0-9]*' | cut -d= -f2)`.

## Decisions this plan makes (within spec section 9)

1. Shared parts are HTML partials in `src/partials/`, included at build time by `<!--site:name-->` placeholders. Config values reach HTML as `{{TOKEN}}`.
2. The collision-proof asset folder is `emc-site/` (`build.assetsDir: 'emc-site/assets'`, public files in `public/emc-site/`).
3. `/iafe/` has one form, directly under its hero (`id="talk"`), and a closing strip that links back to it.
4. Home page row labels: Online sales and Box office POS read "Watch it" (they play a real-product video), Live dashboard reads "Try it" (it is the one in-page demo), and Retail stores, Gate scanning and Daily reports read "See how". The line under the heading reads "Pick any tool and see it work. No sign-up." (the mockup said "try it yourself", written before the videos existed).
5. A plain sharing image in the new look ships in tier 1, so no page points at the old gold artwork.
6. `robots.txt` keeps today's WordPress rules and names the new `sitemap.xml`.
7. Staging is a `--mode staging` build: every page `noindex`, `robots.txt` disallows everything.
8. The form's default HTML state is the fallback (an "Email Anthony" button and the toll-free number). JavaScript swaps in the form only when it can deliver or simulate.

## Changes after the plan was written

**2026-11-18, from Anthony, while Task 4 was in review.** (1) "Please leverage the videos being made in the Demo Video Creation Terminal so we do not make the videos twice." (2) Asked how the site should use them, he chose: videos replace the click-through copies, "but I want the dashboard to be more complex and closer to the terminal that we made". (3) On the three videos that show a client fair's name (fair map, phone line, Pip): "Leave them but just blind the name. Make sure there is not a MNPI (something like the map is ok)".

What that changes here:

- The Platform page plays the real-product walkthrough videos for Online sales, Box office and the Live board. The click-through Online sales demo (the old Task 7) is dropped, and tier 2 no longer builds a Box office click-through. The spec's sections 4 and 5.5 are superseded on those points.
- The Live dashboard demo stays an in-page demo and is rebuilt to follow the real live board's panels and dark screen look (the new Task 7). The home page keeps the compact board from the approved mockup.
- The fair map, phone line and Pip videos go on the site only as name-blinded versions with no non-public details. The Demo Video terminal delivered those versions the same evening (files ending `-web`), and an independent frame-by-frame check found no trace of the fair's name and nothing non-public (`video-check-report.md` in the plan's workspace); the sound was transcribed and checked by the Demo Video terminal. They go on the site and to staging for Anthony's review. Real but public details remain in them (the grounds, act and vendor names, the fair's 2026 dates, hours and public prices). This repo is public, so the unblinded files never enter it.
- This repo copies finished video files (`npm run videos`); it never records or edits them.

## Review Focus

1. **JavaScript off or a script that fails to load.** A visitor still reads every page, sees the board with real figures, and can email or call. Pinned by `tests/no-js.test.js` (Task 2, extended in Tasks 4 and 9).
2. **A double tap on Send, or a slow or dead network.** One submission at most; the button is disabled while sending; after 15 seconds with no answer the visitor gets the failure message with their text intact. Pinned in `tests/ask-form.test.js` (Task 3).
3. **Odd form input:** whitespace only, very long text, HTML in the name. Trimmed, capped, and shown back as text, never as markup. Pinned in `tests/lead.test.js` and `tests/ask-form.test.js` (Task 3).
4. **Storage blocked (private mode).** `sessionStorage` or `localStorage` throwing must not break the page, the form or the cookie notice. Pinned in `tests/utm.test.js` (Task 3).
5. **A tab left in the background, or the board scrolled off screen.** Timers stop; on return there is no burst of catch-up sales. Pinned in `tests/board-view.test.js` (Task 4).
6. **The show dates seen from another time zone.** The Booth #410 line follows Louisville's calendar date, not the visitor's device. Pinned in `tests/show.test.js` (Task 6).
7. **A 360px phone.** No page scrolls sideways. Checked on every page by the screenshot tool in Task 11.

---

### Task 1: Clear out the July site; page registry, renderer and build skeleton

**Files:**
- Delete (`git rm`): `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `contact.html`, `experience.html`, `reveal-hero.html`, `privacy.html`, `terms.html`; in `src/`: `flight-scrub.js`, `hero/`, `hotspot.js`, `magnetic.js`, `main.js`, `marquee.js`, `mask-text.js`, `motion.js`, `nav.js`, `parallax.js`, `particles.js`, `pinned-forty.js`, `reveal-hero-entry.js`, `reveals.js`, `sub.js`, `video-ready.js`, `styles/` (all seven files); in `tests/`: every file except `analytics.test.js` and `consent.test.js`; `public/experience-frames/`, `public/fonts/`, `public/logos/`, `public/logo.svg`, `public/favicon.svg`, the five icon PNGs in `public/`, `public/og-image.png`, `public/site.webmanifest`; `scripts/build-flight-frames.py`.
- Create: `build/pages.js`, `build/render.js`, `build/vite-plugin-site.js`, `src/partials/header.html`, `src/partials/footer.html`, `src/partials/ask.html`, `src/styles/site.css`, `src/entry/site.js`, `tests/helpers/pages.js`, `tests/render.test.js`
- Create (stub pages, replaced by later tasks): `platform/index.html`, `retail-partners/index.html`, `marketing/index.html`, `about/index.html`, `contact/index.html`, `iafe/index.html`, `privacy/index.html`, `terms/index.html`
- Rewrite: `index.html`, `404.html`, `tests/site-integrity.test.js`, `public/robots.txt`, `public/sitemap.xml`, `vite.config.js`
- Modify: `package.json` (remove `gsap`), `.gitignore` (add `dist-host/`)

**Interfaces:**
- Produces: `PAGES`, `SITE_URL`, `pageByFile(file)`, `pageByKey(key)` from `build/pages.js`; `renderPage(source, page, opts)`, `GENERATORS`, `buildVars(page, opts)` from `build/render.js`; `renderAll()` and `visibleText(doc)` from `tests/helpers/pages.js`. Every later task uses these.

- [ ] **Step 1: Delete the July files** listed above with `git rm -r`, and `npm uninstall gsap`. Keep `src/site-config.js`, `src/consent.js`, `src/analytics.js` and their two tests.

- [ ] **Step 2: Write `build/pages.js`.** Exact registry:

```js
export const SITE_URL = 'https://emctickets.com';
const SITE_CSS = '/src/styles/site.css';
export const PAGES = [
  { key: 'home', file: 'index.html', path: '/', nav: null, ask: 'talk', tone: 'photo', indexable: true,
    title: 'EMC Tickets | Ticketing for fairs and festivals',
    description: 'One system from first ticket to final report. Sell everywhere, scan at any gate and watch every ticket count as it happens.',
    styles: [SITE_CSS], entry: '/src/entry/site.js' },
  { key: 'platform', file: 'platform/index.html', path: '/platform/', nav: 'platform', ask: 'talk', tone: 'cream', indexable: true,
    title: 'The platform | EMC Tickets',
    description: 'Try the EMC ticketing platform yourself: online sales, box office, gate scanning and the live dashboard. No sign-up.',
    styles: [SITE_CSS], entry: '/src/entry/site.js' },
  { key: 'retail', file: 'retail-partners/index.html', path: '/retail-partners/', nav: 'retail', ask: 'mockup', tone: 'cream', indexable: true,
    title: 'Retail partners | EMC Tickets',
    description: 'Sell your fair tickets at Walgreens. EMC is the exclusive event ticket partner of Walgreens.',
    styles: [SITE_CSS], entry: '/src/entry/site.js' },
  { key: 'marketing', file: 'marketing/index.html', path: '/marketing/', nav: 'marketing', ask: 'talk', tone: 'cream', indexable: true,
    title: 'Marketing | EMC Tickets',
    description: 'Media buying, promotions, ad production and social media for fairs and festivals.',
    styles: [SITE_CSS], entry: '/src/entry/site.js' },
  { key: 'about', file: 'about/index.html', path: '/about/', nav: 'about', ask: 'talk', tone: 'cream', indexable: true,
    title: 'About | EMC Tickets',
    description: '40+ years in the industry. EMC treats every event as a partner and builds the program your event needs.',
    styles: [SITE_CSS], entry: '/src/entry/site.js' },
  { key: 'contact', file: 'contact/index.html', path: '/contact/', nav: null, ask: 'talk', tone: 'cream', indexable: true,
    title: 'Contact | EMC Tickets',
    description: "Let's talk about your fair. Email Anthony Quintana or call toll free, 24/7: 800-290-2090.",
    styles: [SITE_CSS], entry: '/src/entry/site.js' },
  { key: 'iafe', file: 'iafe/index.html', path: '/iafe/', nav: null, ask: 'talk', tone: 'cream', indexable: false,
    title: 'EMC Tickets at IAFE 2026 | Booth #410',
    description: 'One system from first ticket to final report. See EMC Tickets at Booth #410 in Louisville.',
    styles: [SITE_CSS], entry: '/src/entry/site.js' },
  { key: 'privacy', file: 'privacy/index.html', path: '/privacy/', nav: null, ask: 'talk', tone: 'cream', indexable: true,
    title: 'Privacy Policy | EMC Tickets',
    description: 'How EMC Tickets collects, uses and protects information on this site.',
    styles: [SITE_CSS], entry: '/src/entry/site.js' },
  { key: 'terms', file: 'terms/index.html', path: '/terms/', nav: null, ask: 'talk', tone: 'cream', indexable: true,
    title: 'Terms of Service | EMC Tickets',
    description: 'The terms that govern use of the EMC Tickets website.',
    styles: [SITE_CSS], entry: '/src/entry/site.js' },
  { key: 'notFound', file: '404.html', path: '/404.html', nav: null, ask: 'talk', tone: 'cream', indexable: false,
    title: 'Page not found | EMC Tickets', description: '',
    styles: [SITE_CSS], entry: '/src/entry/site.js' },
];
export const pageByFile = (file) => PAGES.find((p) => p.file === file) ?? null;   // file uses forward slashes
export const pageByKey = (key) => PAGES.find((p) => p.key === key) ?? null;
```

- [ ] **Step 3: Write the failing tests** in `tests/render.test.js`:

```js
const page = (over = {}) => ({ ...pageByKey('platform'), ...over });
const read = (name) => ({ header: '<a href="/platform/" data-nav="platform">Platform</a><a href="/about/" data-nav="about">About</a>', footer: '<footer>{{TOLL_FREE}}</footer>', ask: '<section id="talk"></section>' }[name]);

it('fills the head from the registry', () => {
  const html = renderPage('<head><!--site:head--></head>', page(), { read });
  expect(html).toContain('<title>The platform | EMC Tickets</title>');
  expect(html).toContain('<link rel="canonical" href="https://emctickets.com/platform/">');
  expect(html).toContain('<meta property="og:url" content="https://emctickets.com/platform/">');
  expect(html).toContain('<meta property="og:image" content="https://emctickets.com/emc-site/og-image.png">');
  expect(html).toContain('<meta name="theme-color" content="#fff8ec">');
  expect(html).toContain('<link rel="stylesheet" href="/src/styles/site.css">');
  expect(html).toContain('<script type="module" src="/src/entry/site.js"></script>');
  expect(html).not.toContain('name="robots"');
});
it('escapes quotes and ampersands in head text', () => {   // title: 'A "B" & C' -> A &quot;B&quot; &amp; C
it('noindexes a page that is not indexable, and every page on staging', () => {
  expect(renderPage('<!--site:head-->', pageByKey('iafe'), { read })).toContain('<meta name="robots" content="noindex">');
  expect(renderPage('<!--site:head-->', page(), { read, staging: true })).toContain('<meta name="robots" content="noindex">');
});
it('leaves the canonical link off the not-found page', () => { /* pageByKey('notFound') -> no rel="canonical" */ });
it('includes partials and marks the current menu item', () => {
  const html = renderPage('<!--site:header-->', page(), { read });
  expect(html).toContain('data-nav="platform" aria-current="page"');
  expect(html).not.toContain('data-nav="about" aria-current');
});
it('substitutes config tokens', () => { /* '<!--site:footer-->' -> contains '800-290-2090' */ });
it('throws on an unknown placeholder or token', () => {
  expect(() => renderPage('<!--site:nope-->', page(), { read: () => undefined })).toThrow(/nope/);
  expect(() => renderPage('{{NOPE}}', page(), { read })).toThrow(/NOPE/);
});
it('uses a generator before a partial of the same name', () => { /* GENERATORS.x = () => 'G' during the test */ });
```

- [ ] **Step 4: Run** `npx vitest run tests/render.test.js`. Expected: FAIL, `build/render.js` does not exist.

- [ ] **Step 5: Implement `build/render.js`.**
  - `export const GENERATORS = {}` : name to `(page, opts) => html`. Later tasks add entries.
  - `export function buildVars(page, { staging = false } = {})` returns a flat string map: every string export of `src/site-config.js`, plus `YEAR` (build year), `TONE` (`page.tone`), `PAGE_PATH`, `ASK_VARIANT` (`page.ask`). Add to `src/site-config.js` now: `LEAD_NAME = 'Anthony Quintana'`, `LEAD_EMAIL = 'anthony@emctickets.com'`, `TOLL_FREE = '800-290-2090'`, `TOLL_FREE_TEL = '+18002902090'`, `OFFICE_STREET = '8409 Land O Lakes Blvd'`, `OFFICE_CITY = 'Land O Lakes, FL 34638'`, `APP_RECOVER_URL = 'https://app.emctickets.com/recover'`, `APP_LOGIN_URL = 'https://app.emctickets.com/portal/login'`, `POS_TOUR_URL = 'https://app.emctickets.com/pos/tour'`.
  - `export function renderPage(source, page, { staging = false, read } = {})`: replaces `<!--site:head-->` with the head block below; replaces any other `<!--site:NAME-->` with `GENERATORS[NAME]` output or the partial `src/partials/NAME.html` (default `read` loads it from disk; a missing one throws naming it); repeats until no placeholder is left (partials may include partials); adds ` aria-current="page"` after `data-nav="<page.nav>"`; replaces `{{TOKEN}}` from `buildVars` (unknown token throws naming it).
  - Head block, in this order: charset, viewport, `<title>`, description (omitted when empty), canonical (omitted for `notFound`), robots `noindex` (when `!page.indexable || staging`), `og:type` website, `og:site_name` EMC Tickets, `og:title`, `og:description`, `og:url`, `og:image` `https://emctickets.com/emc-site/og-image.png`, `twitter:card` summary_large_image, `theme-color` `#fff8ec`, `<meta name="emc-site" content="relaunch">`, icon links (`/emc-site/icons/favicon-32x32.png`, `favicon-16x16.png`, `apple-touch-icon.png`), manifest `/emc-site/site.webmanifest`, `<script>document.documentElement.classList.add('js')</script>`, one stylesheet link per `page.styles`, the module script for `page.entry`.

- [ ] **Step 6: Write `build/vite-plugin-site.js`** (default export `sitePlugin({ staging })`): `transformIndexHtml` with `order: 'pre'` that finds the page by the file's path relative to the project root (forward slashes) and returns `renderPage(html, page, { staging })`; an HTML file that is not in `PAGES` passes through unchanged. In dev, watch `src/partials/` and send a full reload when a partial changes. On a staging build, after the bundle is written, overwrite `dist/robots.txt` with `User-agent: *\nDisallow: /\n`.

- [ ] **Step 7: Rewrite `vite.config.js`** as `defineConfig(({ mode }) => ...)`: `appType: 'mpa'`, the existing polling watcher, `plugins: [sitePlugin({ staging: mode === 'staging' })]`, `build.assetsDir: 'emc-site/assets'`, and `build.rollupOptions.input` built from `PAGES` (key to resolved file).

- [ ] **Step 8: Write the stub partials and pages.** `header.html`: links to `/`, the four menu pages (with `data-nav`), `{{APP_RECOVER_URL}}`, `{{APP_LOGIN_URL}}`. `footer.html`: links to `/privacy/` and `/terms/`. `ask.html`: `<section id="talk"></section>`. Each of the ten page files is this skeleton with an `<h1>` naming the page:

```html
<!doctype html>
<html lang="en">
<head>
<!--site:head-->
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<!--site:header-->
<main id="main">
  <h1>Platform</h1>
</main>
<!--site:ask-->
<!--site:footer-->
</body>
</html>
```
  `src/styles/site.css` and `src/entry/site.js` start as one-line comments.

- [ ] **Step 9: Write `tests/helpers/pages.js`:** `renderAll()` returns `[{ page, html, doc }]` for every entry in `PAGES` (source read from disk, rendered with `renderPage`, parsed with `DOMParser`); `visibleText(doc)` returns the body's text with `script`, `style` and `[hidden]` subtrees removed and whitespace collapsed.

- [ ] **Step 10: Rewrite `tests/site-integrity.test.js`, `public/sitemap.xml` and `public/robots.txt`.** Tests:
  - `it('every registry page has a source file')`
  - `it('sitemap lists exactly the eight public pages')`: `/`, `/platform/`, `/retail-partners/`, `/marketing/`, `/about/`, `/contact/`, `/privacy/`, `/terms/`, each prefixed with `SITE_URL`; `lastmod` 2026-11-18.
  - `it('iafe and the not-found page are noindexed and out of the sitemap')`
  - `it('robots.txt keeps the WordPress rules and names the sitemap')`: the file is exactly
    ```
    User-agent: *
    Disallow: /wp-admin/
    Allow: /wp-admin/admin-ajax.php

    Sitemap: https://emctickets.com/sitemap.xml
    ```
  - `it('titles are unique')`
  - `it('every internal link points at a real page or public file')`: for each rendered page, every `href` or `src` starting with `/` (hash and query stripped) is a `PAGES` path or a file under `public/`. Paths under `/src/` are skipped, and so is `/emc-site/` until Task 2 removes that exception.
  - `it('every hash link to another page names an id that exists there')`
  - `it('any target=_blank link carries rel noopener')`
  - `it('no rendered page has a leftover placeholder or token')`: no `<!--site:` and no `{{`.

- [ ] **Step 11: Run** `npm test`. Expected: PASS (render, site-integrity, consent, analytics). If `tests/consent.test.js` asserts the old `/privacy.html` link, leave consent as it is for now; Task 2 changes it.

- [ ] **Step 12: Run** `npm run build`. Expected: success, and `ls dist dist/platform dist/emc-site/assets` shows `index.html`, `404.html`, the eight page folders each with `index.html`, and hashed files only under `emc-site/assets/`. Then `npx vite build --mode staging && cat dist/robots.txt` shows `Disallow: /`, and `grep -c 'content="noindex"' dist/platform/index.html` prints 1.

- [ ] **Step 13: Commit** `feat(relaunch): retire the July site; page registry, renderer and build skeleton`.

---

### Task 2: The look and the shared chrome

**Files:**
- Create: `src/styles/fonts.css`, `tokens.css`, `base.css`, `chrome.css` (all imported by `site.css`); `src/partials/form.html`; `src/form/variants.js`; `src/nav.js`; `public/emc-site/fonts/` (four woff2 files); `public/emc-site/logos/` (`walgreens.png`, `circle-k.svg`, `menards.svg`); `public/emc-site/img/emc-logo-on-light.png`, `emc-logo-on-dark.png`; `public/emc-site/icons/` (five PNGs); `public/emc-site/site.webmanifest`; `public/emc-site/og-image.png`; `scripts/og/og.html`; `tests/nav.test.js`, `tests/chrome.test.js`, `tests/wording.test.js`, `tests/no-js.test.js`
- Rewrite: `src/partials/header.html`, `footer.html`, `ask.html`, `scripts/build-icons.mjs`, `src/entry/site.js`
- Modify: `build/render.js` (font preloads, ask tokens), `src/consent.js`, `src/analytics.js`, `tests/consent.test.js`, `tests/site-integrity.test.js` (drop the `/emc-site/` exception), `package.json` (three font dev dependencies)

**Interfaces:**
- Consumes: `renderPage`, `buildVars`, `PAGES`; `renderAll`, `visibleText`.
- Produces:
  - `ASK_VARIANTS` from `src/form/variants.js`:
    ```js
    export const ASK_VARIANTS = {
      talk:   { heading: "Let's talk about your fair.", button: 'Send to Anthony' },
      mockup: { heading: 'Get a free in-store mockup of your event.', button: 'Request my mockup' },
    };
    ```
    `buildVars` adds `ASK_HEADING` and `ASK_BUTTON` from `ASK_VARIANTS[page.ask]`.
  - `initNav(doc = document)` from `src/nav.js`.
  - `anyTrackerConfigured(): boolean` from `src/analytics.js`; `openCookieSettings(doc = document)` from `src/consent.js`.
  - Markup hooks later tasks rely on: `id="talk"` on the ask band; `[data-ask]` on the band with `data-ask-variant`; `[data-ask-heading]`; inside it `[data-ask-fallback]` (visible) and `form[data-ask-form][hidden]` with inputs named `name`, `event`, `email`, `message`, `botcheck`, a submit button `[data-ask-submit]`, `[data-ask-status]` and `[data-ask-thanks][hidden]`; `[data-menu-toggle]` and `#site-menu`; `[data-cookie-settings]` in the footer.
  - CSS classes for later pages: `.wrap`, `.btn`, `.btn.ghost`, `.kicker`, `.lede`, `.sec`, `.card`, `.pill-live`, `.pill-sample`, `.num-square`, `.visually-hidden`.

- [ ] **Step 1: Fonts.** `npm i -D @fontsource-variable/bricolage-grotesque @fontsource-variable/figtree @fontsource/dm-mono`. Copy the Latin woff2 files into `public/emc-site/fonts/` as `bricolage-grotesque-var.woff2` (the file with the weight and optical-size axes; confirm with `fonttools ttLib.woff2 decompress` or `fonttools ttx -t fvar` that `wght` covers 400 to 800), `figtree-var.woff2`, `dm-mono-400.woff2`, `dm-mono-500.woff2`. Write `fonts.css` with four `@font-face` rules, `font-display: swap`. The head block preloads the Bricolage and Figtree files (`rel="preload" as="font" type="font/woff2" crossorigin`).

- [ ] **Step 2: Images.** Copy from `docs/superpowers/specs/assets/2026-11-18-site-relaunch/files/`: `emc-logo-light.png` to `img/emc-logo-on-light.png` (navy TICKETS word, for cream backgrounds), `emc-logo-dark.png` to `img/emc-logo-on-dark.png` (white TICKETS word, for the photo), `walgreens-logo.png`, `circlek-logo.svg`, `menards-logo.svg` to `logos/`. Every `<img>` carries `width` and `height`.

- [ ] **Step 3: Icons and manifest.** Rewrite `scripts/build-icons.mjs` to build 16, 32, 180, 192 and 512 pixel PNGs into `public/emc-site/icons/` from the on-dark logo with its bottom TICKETS strip cropped away (the three tickets only), centered on a `#fff8ec` square with padding, never scaled above native size. Manifest: name "EMC Tickets", `theme_color` `#cf1a22`, `background_color` `#fff8ec`, icons at their new paths. Run `npm run icons`.

- [ ] **Step 4: Write the failing tests.**

`tests/chrome.test.js` (over `renderAll()`):
```js
it('header carries the four pages, the two utilities and the talk button on every page', () => {
  // links by text and href: Platform /platform/, Retail partners /retail-partners/, Marketing /marketing/, About /about/,
  // Find my tickets https://app.emctickets.com/recover, Client login https://app.emctickets.com/portal/login, Let's talk #talk
});
it('the menu button controls #site-menu, which holds the four pages and both utilities', () => {});
it('footer carries the pages, utilities, address, email, toll-free number, Privacy, Terms and cookie settings', () => {
  // text includes '8409 Land O Lakes Blvd', 'Land O Lakes, FL 34638', 'anthony@emctickets.com', '800-290-2090'
  // href /privacy/ and /terms/; a button[data-cookie-settings]
});
it('the ask band uses the page variant', () => {
  // retail: heading 'Get a free in-store mockup of your event.' and button 'Request my mockup'
  // every other page: "Let's talk about your fair." and 'Send to Anthony'
});
it('the ask band names Anthony, his email and the toll-free line', () => {
  // 'Anthony Quintana', a[href="mailto:anthony@emctickets.com"], 'Toll free, 24/7', a[href="tel:+18002902090"]
});
it('the home header is on the photo and every other header is on cream', () => { /* data-tone */ });
it('only the home page header uses the on-dark logo file', () => {});
```

`tests/wording.test.js` (over `renderAll()`):
```js
it('no page has an em dash', () => { /* html has neither '\u2014' nor '&mdash;' */ });
it('the only phone number is the toll-free number', () => {
  // every match of /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/ in visibleText is '800-290-2090'; every tel: href is 'tel:+18002902090'
});
it('dollar amounts appear only inside sample containers', () => { /* a text node matching /\$\s?\d/ has an ancestor [data-sample] */ });
it('every sample container says it is sample data', () => { /* [data-sample] text matches /Sample/ */ });
it('no price claim', () => { /* visibleText does not match /lowest price|best price|cheapest|no fees\b/i except the approved 'No credit card fees.' */ });
it('only approved numbers appear outside samples and the legal pages', () => {
  // pages except privacy and terms; remove [data-sample] subtrees and the phone number; every /\d[\d,/]*/ token
  // (trailing commas trimmed) is in ['40','8,000','78','5','30','24/7','410','2026','2027','01','02','03','1','2','3','4','8409','34638']
});
```

`tests/nav.test.js`: the toggle sets `aria-expanded` and un-hides `#site-menu`; Escape closes it and returns focus to the toggle; a click on a link inside closes it; `initNav` on a document with no toggle does not throw.

`tests/no-js.test.js` (rendered HTML, no scripts run): on every page the fallback `[data-ask-fallback]` has no `hidden` attribute and holds a `mailto:anthony@emctickets.com` link and the toll-free number, and `form[data-ask-form]` has `hidden`.

`tests/consent.test.js`, add: no banner when no tracker ID is set; banner when one is set and no choice is stored; `openCookieSettings` with no tracker shows "This site is not using any tracking cookies right now." and a Close button; with a tracker it shows Accept and Decline even when a choice is stored; the banner's privacy link is `/privacy/`.

- [ ] **Step 5: Run** `npm test`. Expected: the new tests FAIL.

- [ ] **Step 6: Write the styles.** `tokens.css` holds the spec 5.2 values as custom properties (`--ink #1b1f2a`, `--mut #5d6370`, `--line #ecdfca`, `--cream #fff8ec`, `--red #cf1a22`, `--red-shadow #9d1218`, `--teal #0e9c84`, `--amber #f2a900`, `--yellow #ffd66b`, tints `#fdebe9`, `#e1f4f0`, `#fff1cc`). `base.css` and `chrome.css` port the mockup's `.d2` rules for type, `.wrap`, buttons, header, menu button, ask band and form, with its `max-width:1000px` phone rules; add the footer, the open mobile menu panel, a visible `:focus-visible` ring, the skip link, `.visually-hidden`, and a `prefers-reduced-motion` rule that turns off animation and transitions. Tap targets are at least 44px high on phones.

- [ ] **Step 7: Write the partials.**
  - `header.html`: `<header class="top" data-tone="{{TONE}}">` with the logo link to `/` (one image, `src="{{LOGO_SRC}}"`; `buildVars` sets `LOGO_SRC` to the on-dark file when `page.tone` is `photo` and to the on-light file otherwise), `<nav aria-label="Primary">` with the four links, the utilities, `<button type="button" data-menu-toggle aria-label="Menu" aria-expanded="false" aria-controls="site-menu">`, and `<div id="site-menu" hidden>` with the four pages and both utilities.
  - `ask.html`: `<section class="ask" id="talk" data-ask data-ask-variant="{{ASK_VARIANT}}">`, `<h2 data-ask-heading>{{ASK_HEADING}}</h2>`, the line "Anthony Quintana · anthony@emctickets.com" (mailto), "Toll free, 24/7" over "800-290-2090" (tel link), then `<!--site:form-->`.
  - `form.html`: the fallback card `[data-ask-fallback]` with an "Email Anthony" button (`mailto:{{LEAD_EMAIL}}`) and "or call toll free, 24/7: 800-290-2090"; then the hidden form with labels "Your name", "Fair or event", "Email", "Anything we should know?" (a textarea, marked optional), `autocomplete` `name`, `organization`, `email`; the trap field `botcheck` (a checkbox, visually hidden, `tabindex="-1"`, `autocomplete="off"`, `aria-hidden="true"`); the submit button `{{ASK_BUTTON}}`; the line "We only use this to reply to you. See our Privacy Policy." linking `/privacy/`; `[data-ask-status]` with `role="alert"`; `[data-ask-thanks]` hidden.
  - `footer.html`: on-light logo, the four pages, Find my tickets, Client login, the address, the email, "Toll free, 24/7 800-290-2090", Privacy, Terms, `<button type="button" data-cookie-settings>Cookie settings</button>`, and "© {{YEAR}} EMC Tickets".

- [ ] **Step 8: Implement `src/nav.js`, the consent changes and `src/entry/site.js`.** `anyTrackerConfigured()` is true when any of the four IDs in `site-config.js` is non-empty. `initConsentBanner` shows nothing unless a tracker is configured and no choice is stored. `site.js` on `DOMContentLoaded`: `initNav()`, `initConsentBanner()`, `initAnalytics()`, and wire `[data-cookie-settings]` to `openCookieSettings()`.

- [ ] **Step 9: Sharing image.** Write `scripts/og/og.html` (1200 x 630, `#fff8ec`, the on-light logo at native size, the label "Ticketing for fairs and festivals" in DM Mono, the headline "One system from first ticket to final report." in Bricolage 700 with "first ticket" and "final report" on the yellow marker underline; fonts from `/emc-site/fonts/`). With `npm run dev` running, render it:
  ```bash
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars \
    --virtual-time-budget=4000 --window-size=1200,630 \
    --screenshot='C:\Users\Anthony Quintana\projects\EMC-website-redesign\public\emc-site\og-image.png' \
    'http://localhost:5173/scripts/og/og.html'
  ```
  Expected: a 1200 x 630 PNG. Look at it with the Read tool. If it is over 300 KB, re-save it with sharp (`png({ palette: true })`).

- [ ] **Step 10: Run** `npm test`. Expected: PASS, including the site-integrity link test with the `/emc-site/` exception removed.

- [ ] **Step 11: Look at it.** `npm run dev`, then `node .superpowers/tools/shots.mjs / /platform/ /retail-partners/`. Expected: no sideways scroll reported; the header, ask band and footer match the mockup's look at 1280 and 390; the phone menu opens (run the tool again with `--menu` to capture it open).

- [ ] **Step 12: Commit** `feat(relaunch): the sunny board look, header, footer and ask band`.

---

### Task 3: The contact form and the Contact page

**Files:**
- Create: `src/form/utm.js`, `src/form/lead.js`, `src/form/delivery.js`, `src/form/ask-form.js`, `tests/utm.test.js`, `tests/lead.test.js`, `tests/delivery.test.js`, `tests/ask-form.test.js`
- Modify: `src/site-config.js`, `src/analytics.js` (+ test), `src/entry/site.js`, `contact/index.html`, `src/styles/chrome.css` (form states), `tests/chrome.test.js` (contact page)

**Interfaces:**
- Consumes: the ask band markup hooks and `ASK_VARIANTS` from Task 2.
- Produces:
  ```js
  // src/site-config.js
  export const FORM_SERVICE_NAME = 'Web3Forms';
  export const FORM_ENDPOINT = 'https://api.web3forms.com/submit';
  export const FORM_ACCESS_KEY = '';   // empty: no delivery, so the live site shows the fallback instead of the form

  // src/form/utm.js
  export function captureUtm(search = location.search, storage = sessionStorage): void
  export function readUtm(storage = sessionStorage): { utm_source: string, utm_medium: string, utm_campaign: string, utm_content: string }

  // src/form/lead.js
  export const LIMITS = { name: 120, event: 160, email: 254, message: 2000 };
  export function validateLead(fields): { ok: boolean, errors: { name?: string, event?: string, email?: string } }
  export function buildLead(fields, { page, utm, request }): object

  // src/form/delivery.js
  export function deliveryMode({ hostname = location.hostname, search = location.search, key = FORM_ACCESS_KEY } = {}): 'live' | 'test' | 'simulate' | 'off'
  export async function sendLead(lead, { mode, fetchImpl = fetch, timeoutMs = 15000 } = {}): Promise<{ ok: true } | { ok: false, reason: 'network' | 'rejected' | 'timeout' }>

  // src/form/ask-form.js
  export function initAskForms(doc = document, deps = {}): void     // deps: { mode, send, track } for tests
  export function setAskVariant(askEl, variant: 'talk' | 'mockup'): void

  // src/analytics.js
  export function trackEvent(name, props = {}, hostname = location.hostname): void
  ```

- [ ] **Step 1: Check the form service's current API** at `https://docs.web3forms.com/` (the JSON submit endpoint, the field names for subject, reply-to and sender name, the honeypot field, and the success response shape). Use what the docs say if it differs from the names below, and say so in the report.

- [ ] **Step 2: Write the failing tests.**

`tests/utm.test.js`:
```js
it('stores the four tags from the first page view', () => {
  const s = fakeStorage();
  captureUtm('?utm_source=iafe&utm_medium=handout&utm_campaign=iafe2026&utm_content=walgreens-card', s);
  expect(readUtm(s)).toEqual({ utm_source: 'iafe', utm_medium: 'handout', utm_campaign: 'iafe2026', utm_content: 'walgreens-card' });
});
it('does not overwrite them on a later page view', () => { /* second captureUtm('?utm_source=other') leaves 'iafe' */ });
it('returns empty strings when there are none', () => {});
it('keeps only letters, digits, dot, dash and underscore, 80 characters at most', () => { /* '<b>x</b>' -> 'bxb' */ });
it('survives storage that throws', () => { /* getItem and setItem throw: no exception, readUtm returns empty strings */ });
```

`tests/lead.test.js`:
```js
it('accepts a complete lead', () => { expect(validateLead({ name: 'Pat', event: 'Demo County Fair', email: 'pat@example.org', message: '' }).ok).toBe(true); });
it('requires name, event and email, with these messages', () => {
  expect(validateLead({ name: ' ', event: '', email: 'nope', message: '' }).errors).toEqual({
    name: 'Enter your name.', event: 'Enter your fair or event.', email: 'Enter an email address we can reply to.' });
});
it('trims and caps every field', () => {
  const lead = buildLead({ name: '  Pat  ', event: 'x'.repeat(500), email: ' PAT@Example.org ', message: 'm'.repeat(5000) }, { page: '/iafe/', utm: {}, request: 'talk' });
  expect(lead.name).toBe('Pat'); expect(lead.event).toHaveLength(160); expect(lead.email).toBe('PAT@Example.org'); expect(lead.message).toHaveLength(2000);
});
it('carries the page, the campaign tags and the request type', () => {
  // subject 'Website inquiry: Demo County Fair'; replyto = email; page '/iafe/'; utm_content 'walgreens-card';
  // request 'In-store mockup' for 'mockup', 'Conversation' for 'talk'
});
```

`tests/delivery.test.js`:
```js
it('picks the mode', () => {
  expect(deliveryMode({ hostname: 'emctickets.com', search: '', key: 'k' })).toBe('live');
  expect(deliveryMode({ hostname: 'www.emctickets.com', search: '', key: '' })).toBe('off');
  expect(deliveryMode({ hostname: 'quinto55.github.io', search: '', key: 'k' })).toBe('simulate');
  expect(deliveryMode({ hostname: 'quinto55.github.io', search: '?formtest=1', key: 'k' })).toBe('test');
  expect(deliveryMode({ hostname: 'localhost', search: '?formtest=1', key: '' })).toBe('simulate');
});
it('simulate never touches the network', async () => { /* fetchImpl is a spy that is never called; result { ok: true } */ });
it('live posts JSON with the access key and returns ok on success', async () => {});
it('test mode prefixes the subject with [TEST]', async () => {});
it('a rejected response, a thrown fetch and a timeout each return ok false with the reason', async () => {});
it('off returns ok false without calling fetch', async () => {});
```

`tests/ask-form.test.js` (render the contact page with `renderPage`, load into the document, call `initAskForms(document, deps)`):
```js
it('mode off leaves the fallback showing and the form hidden', () => {});
it('live, test and simulate show the form and hide the fallback', () => {});
it('invalid input shows each message, marks the field aria-invalid, focuses the first bad field and sends nothing', () => {});
it('a good submission disables the button, sends once, then shows the thank-you naming the visitor', async () => {
  // thanks text: 'Thanks, Pat. Anthony will be in touch soon. If it cannot wait, call toll free, 24/7: 800-290-2090.'
});
it('a second click while sending does not send twice', async () => {});
it('a name with markup is shown as text', async () => { /* name '<img src=x onerror=1>' -> no img element in the thank-you */ });
it('a failed send keeps what was typed and shows the failure message', async () => {
  // status text: 'That did not send. Your details are still here. Try again, or email anthony@emctickets.com or call toll free 800-290-2090.'
  // the button is enabled again
});
it('a filled trap field shows the thank-you without sending', async () => {});
it('simulate mode says nothing was sent', async () => { /* thanks also contains 'Test mode: nothing was sent.' */ });
it('fires lead_submitted once on success', async () => { /* deps.track called with 'lead_submitted', { request: 'talk' } */ });
it('setAskVariant swaps the heading, the button and the request type', () => {});
```

`tests/analytics.test.js`, add: `trackEvent` does nothing off the live hostnames or without accepted consent; with consent on a live hostname it calls `window.posthog.capture(name, props)` when that function exists, and never throws when it does not.

- [ ] **Step 3: Run** the four new test files. Expected: FAIL, modules missing.

- [ ] **Step 4: Implement the four modules** to the signatures above. `captureUtm` stores once per session under one key and falls back to a module variable when storage throws. `validateLead` checks trimmed values; email must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. `sendLead` uses an `AbortController` for the timeout. `initAskForms` handles every `[data-ask]` on the page: it reads the variant from `data-ask-variant`, uses `location.pathname` for the page, sets the visitor's text with `textContent` only, and moves focus to the thank-you or the status message when it appears.

- [ ] **Step 5: Wire it.** `site.js` calls `captureUtm()` first, then `initAskForms()`.

- [ ] **Step 6: Write the Contact page.** `<h1>Contact EMC Tickets</h1>`, the line "Tell us about your fair and Anthony will get back to you.", then a details card: "Anthony Quintana", the email (mailto), "Toll free, 24/7" and the number (tel), "Office" with the two address lines. The ask band below is the form. Add to `tests/chrome.test.js`: the contact page shows the address, the email and the number in `main`.

- [ ] **Step 7: Run** `npm test`. Expected: PASS.

- [ ] **Step 8: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs /contact/`. In a browser at `http://localhost:5173/contact/` the form shows (simulate mode); submitting it shows the thank-you with the test-mode note; submitting it empty shows the three messages.

- [ ] **Step 9: Commit** `feat(relaunch): contact form with safe delivery modes; contact page`.

---

### Task 4: The sample fair and the live sample board

**Files:**
- Create: `src/demo/sample-fair.js`, `src/demo/board-engine.js`, `src/demo/board-markup.js`, `src/demo/board-view.js`, `src/demo/lifecycle.js`, `src/styles/board.css`, `tests/sample-fair.test.js`, `tests/board-engine.test.js`, `tests/board-view.test.js`
- Modify: `build/render.js` (the `board` generator), `index.html` (put `<!--site:board-->` in the stub so it can be seen), `build/pages.js` (home `styles` adds `/src/styles/board.css`, home `entry` becomes `/src/entry/home.js`), create `src/entry/home.js`, `tests/no-js.test.js`

**Interfaces:**
- Produces:
  ```js
  // src/demo/sample-fair.js
  export const FAIR = { name: 'Demo County Fair', day: 'Friday' };
  export const TICKET_TYPES = [
    { id: 'adult', name: 'Adult admission', price: 12 }, { id: 'child', name: 'Child admission', price: 6 },
    { id: 'wristband', name: 'Ride wristband', price: 30 }, { id: 'family', name: 'Family 4-pack', price: 40 },
    { id: 'parking', name: 'Parking pass', price: 10 },
  ];
  export const CHANNELS = [{ id: 'online', name: 'Online' }, { id: 'box', name: 'Box office' }];
  export const GATES = [{ id: 'main', name: 'Main Gate' }, { id: 'north', name: 'North Gate' }, { id: 'midway', name: 'Midway Gate' }];
  export const LIVE_BASELINE = {
    sold: { adult: { online: 1183, box: 726 }, child: { online: 490, box: 301 }, wristband: { online: 489, box: 299 },
            family: { online: 112, box: 68 }, parking: { online: 173, box: 106 } },
    scannedByGate: { main: 1412, north: 731, midway: 475 },
  };
  export function totals(sold): { tickets: number, sales: number,
    byType: { id, name, tickets, sales }[], byChannel: { id, name, tickets, sales, share }[] }   // share: whole percents that sum to 100

  // src/demo/board-engine.js
  export function mulberry32(seed: number): () => number
  export function createBoardState(baseline = LIVE_BASELINE): BoardState
  export function nextSale(state, rng = Math.random): { state: BoardState, sale: { id, qty, typeId, typeName, channelId, place, tender, amount } }
  export function snapshot(state, { feedSize = 3 } = {}): { tickets, sales, scanned, channels: { id, name, share }[], gates: { id, name, scanned }[], feed: sale[] }
  export const count = (n) => n.toLocaleString('en-US');
  export const money = (n) => '$' + n.toLocaleString('en-US');

  // src/demo/board-markup.js
  export function renderBoardHTML(snap): string    // the whole board card; root has data-sample and data-board

  // src/demo/lifecycle.js
  export function runWhileVisible(el, { start, stop }): () => void    // returns a cleanup function

  // src/demo/board-view.js
  export function mountBoard(el, { feedSize = 3, intervalMs = 1700, rng = Math.random } = {}): { tick(): void, destroy(): void }
  ```
- Consumes: `GENERATORS` from Task 1; `.pill-live`, `.pill-sample` from Task 2.

- [ ] **Step 1: Write the failing tests.**

`tests/sample-fair.test.js`:
```js
it('the live baseline adds up to the board in the approved mockup', () => {
  const t = totals(LIVE_BASELINE.sold);
  expect(t.tickets).toBe(3947);
  expect(t.sales).toBe(61284);
  expect(t.byChannel.map((c) => [c.name, c.share])).toEqual([['Online', 62], ['Box office', 38]]);
  expect(Object.values(LIVE_BASELINE.scannedByGate).reduce((a, b) => a + b)).toBe(2618);
});
it('sales by type and by channel both sum to the total', () => {});
it('there are exactly two channels: Online and Box office', () => {});
```

`tests/board-engine.test.js`:
```js
it('every sale keeps the books straight', () => {
  const rng = mulberry32(7); let state = createBoardState();
  for (let i = 0; i < 500; i++) {
    const r = nextSale(state, rng); state = r.state; const s = snapshot(state);
    expect(s.sales).toBe(totals(state.sold).sales);
    expect(s.channels.reduce((a, c) => a + c.share, 0)).toBe(100);
    expect(s.scanned).toBeLessThanOrEqual(s.tickets);
    expect(r.sale.qty).toBeGreaterThanOrEqual(1); expect(r.sale.qty).toBeLessThanOrEqual(4);
    expect(['online', 'box']).toContain(r.sale.channelId);
    expect(r.sale.amount).toBe(r.sale.qty * TICKET_TYPES.find((t) => t.id === r.sale.typeId).price);
    if (r.sale.channelId === 'online') { expect(r.sale.tender).toBe('Card'); expect(r.sale.place).toBe('Online'); }
  }
});
it('is the same run for the same seed', () => {});
it('does not change the state it was given', () => { /* deep-freeze the input state */ });
it('keeps the feed newest first and no longer than feedSize', () => {});
it('starts at the baseline: 3,947 tickets, $61,284, 2,618 scanned', () => {});
```
Box office sales have `place` "Box office" and `tender` "Card" or "Cash". Channel weights are 5 Online to 3 Box office. Each sale also adds 0 to 2 scans at a random gate, never past the tickets sold. `createBoardState` starts with eight fixed sample sales in the feed that are already counted in the baseline (they change no total), so the board and the dashboard open with a full feed, with or without JavaScript. The state keeps the newest eight.

`tests/board-view.test.js` (fake timers):
```js
it('the markup shows the fair, both labels and the baseline figures', () => {
  const html = renderBoardHTML(snapshot(createBoardState()));
  // contains 'Demo County Fair, Friday', 'Live', 'Sample data', 'Tickets sold today', 'Scanned in', 'Sales today',
  // '3,947', '2,618', '$61,284', 'Online', 'Box office', '62%', '38%'; root matches [data-sample][data-board]
});
it('never shows store sales', () => { /* after 200 ticks the board text has no 'Retail', 'Walgreens', 'Circle K' or 'Menards' */ });
it('tick() updates the figures and puts the new sale first in the feed', () => {});
it('ticks once per interval while visible', () => {});
it('stops while the tab is hidden and does not catch up afterwards', () => {
  // hide for 60 seconds, show again, advance one interval: exactly one new sale
});
it('stops when the board leaves the screen', () => { /* drive a stubbed IntersectionObserver */ });
it('destroy() stops everything', () => {});
```

`tests/no-js.test.js`, add: the rendered home page already contains the board with `3,947`, `2,618` and `$61,284`.

- [ ] **Step 2: Run** the three new test files. Expected: FAIL, modules missing.

- [ ] **Step 3: Implement the modules.** State is plain data and never mutated. `mulberry32` is the standard 32-bit generator. `renderBoardHTML` follows the mockup's `.board` structure (LIVE pill, name, Sample data pill, three KPIs, channel bars, feed of three) with two channel rows; feed lines read like "2 × Adult admission" with the place in a small pill. The root is `<div class="board" data-board data-sample role="group" aria-label="Sample live sales board">`. `mountBoard` takes over the markup already in the page (it re-renders into `el`), and runs its timer only through `runWhileVisible` (an `IntersectionObserver` on `el` plus `visibilitychange`).

- [ ] **Step 4: Register the generator.** In `build/render.js`: `GENERATORS.board = () => renderBoardHTML(snapshot(createBoardState()))`. Put `<!--site:board-->` in the stub `index.html`. `src/entry/home.js` imports `./site.js` and mounts every `[data-board]`.

- [ ] **Step 5: Write `board.css`** from the mockup's `.board`, `.kpis`, `.kpi`, `.chs`, `.ch`, `.feed`, `.live` and `.sample` rules and their phone rules; the second channel bar is teal. The slide-in and the blinking dot are off under `prefers-reduced-motion`.

- [ ] **Step 6: Run** `npm test`. Expected: PASS.

- [ ] **Step 7: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs /`. The board matches the mockup's board, with two bars, and ticks in a browser.

- [ ] **Step 8: Commit** `feat(relaunch): sample fair data and the live sample board`.

---

### Task 5: The home page

**Files:**
- Create: `src/styles/home.css`, `scripts/build-images.mjs`, `public/emc-site/img/hero-*.{avif,webp,jpg}`, `tests/home.test.js`
- Rewrite: `index.html`
- Modify: `build/pages.js` (home `styles` adds `/src/styles/home.css`), `package.json` (script `images`)

**Interfaces:**
- Consumes: `<!--site:board-->`, the chrome classes, `mountBoard` through `src/entry/home.js`.
- Produces: links to these ids on `/platform/`, which Task 6 must create: `online-sales`, `box-office`, `gate-scanning`, `live-dashboard`, `daily-reports`, `guest-map`, `guest-pip`, `guest-call-line`.

- [ ] **Step 1: Hero photo.** Write `scripts/build-images.mjs` (sharp): from `docs/superpowers/specs/assets/2026-11-18-site-relaunch/files/golden-wide.jpg` (already cropped; do not go back to the uncropped source) write widths 800, 1280 and 1760 as AVIF, WebP and JPEG to `public/emc-site/img/hero-<width>.<ext>`. Run it. The 1280 WebP should be under 150 KB.

- [ ] **Step 2: Write the failing test** `tests/home.test.js` (rendered home page):
```js
it('hero copy is the approved copy', () => {
  // 'Ticketing for fairs and festivals'; h1 text 'One system from first ticket to final report.'; the h1 has two highlighted spans: 'first ticket', 'final report'
  // 'Sell everywhere, scan at any gate and watch every ticket count as it happens.'
  // a[href="#talk"] "Let's talk about your fair"; a[href="/platform/"] 'See it work'; 'Running right now'
});
it('the hero photo is a real image the browser can find early', () => {
  // a <picture> with avif and webp sources and an img with src, srcset, sizes, width, height, alt="" and fetchpriority="high"
});
it('proof strip is exact', () => {
  // '40+', 'years in the industry'
  // 'The Florida State Fair, South Carolina State Fair and Coastal Carolina Fair all run their retail ticketing through EMC.'
  // img alts: Walgreens, Circle K, Menards
});
it('Sell, Scan, Count cards link to the right places', () => {
  // 'Sell. Scan. Count.', 'Pick any tool and see it work. No sign-up.'
  // 01 Sell 'Online, at the window and in stores.': Online sales -> /platform/#online-sales 'Watch it'; Box office POS -> /platform/#box-office 'Watch it'; Retail stores -> /retail-partners/ 'See how'
  // 02 Scan 'Any gate. Duplicates blocked.': Gate scanning -> /platform/#gate-scanning 'See how'; 'RFID wristbands' with 'Later in 2027' and no link
  // 03 Count 'Every ticket, as it happens.': Live dashboard -> /platform/#live-dashboard 'Try it'; Daily reports -> /platform/#daily-reports 'See how'
});
it('guest cards link to their blocks', () => {
  // 'New for your guests'; Interactive fair map 'Your grounds on every phone.' -> /platform/#guest-map;
  // Pip 'A talking AI clown for the front gate.' -> /platform/#guest-pip; Ticket-buyer call line 'Ticket answers by phone.' -> /platform/#guest-call-line
});
it('carries Organization JSON-LD with the toll-free number and address, and no email', () => {});
```

- [ ] **Step 3: Run** `npx vitest run tests/home.test.js`. Expected: FAIL.

- [ ] **Step 4: Write `index.html` and `home.css`** from the mockup's `.bg-b` layout: the hero block holds the photo (`<picture>` positioned behind, with the mockup's two gradients over it), the header include inside the hero's `.wrap`, the copy on the left and the board with its "Running right now" chip on the right; on computers the hero fills the window height (minimum 640px) and the proof strip overlaps its bottom edge by 44px; on phones (1000px and under) the photo covers only the top of the hero behind the copy, as in the mockup. Then the proof strip, the Sell, Scan, Count section, the guest cards and the ask band. The small arrow after each row's action word ("Watch it", "Try it", "See how") is drawn with CSS or an inline SVG, not with an arrow character: the self-hosted fonts have no arrow glyph. The "Tickets on sale at" label before the logos is visually hidden text. The `site-integrity` hash-link test will fail until Task 6 creates the ids; mark that one test `it.todo` with a comment naming Task 6 and nothing else.

- [ ] **Step 5: Run** `npm test`. Expected: PASS (one todo).

- [ ] **Step 6: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs /`. Compare with the mockup opened at `http://localhost:5173/docs/superpowers/specs/assets/2026-11-18-site-relaunch/mockup.html?cap=1` (computer) and `?cap=1&view=phones` (phone): same layout, type sizes and spacing; white text on the photo is readable everywhere; no sideways scroll at 360.

- [ ] **Step 7: Commit** `feat(relaunch): home page on the full photo with the live board`.

---

### Task 6: The platform page and the product videos

*Revised 2026-11-18 after Anthony's decision: the real-product walkthrough videos made in the Demo Video terminal replace the planned click-through copies of online ordering and the box office. This repo never records or edits product videos; it copies finished files.*

**Files:**
- Create: `build/videos.js`, `scripts/sync-videos.mjs`, `public/emc-site/video/` (written by the script: six MP4s, six posters, `videos.json`), `src/video.js`, `src/show.js`, `src/styles/platform.css`, `src/entry/platform.js`, `tests/videos.test.js`, `tests/show.test.js`, `tests/platform.test.js`
- Rewrite: `platform/index.html`
- Modify: `build/render.js` (one generator per video), `build/pages.js` (platform `styles` adds `/src/styles/platform.css`; `entry` `/src/entry/platform.js`), `package.json` (script `videos`), `tests/site-integrity.test.js` (restore the hash-link test)

**Interfaces:**
- Consumes: `GENERATORS`, the chrome classes, `trackEvent`.
- Produces:
  ```js
  // build/videos.js
  export const VIDEO_SOURCE_DIR = '/mnt/c/Users/Anthony Quintana/Desktop/EMC Pitch Materials/Product Demo Videos';   // override with env EMC_VIDEO_SRC
  export const VIDEO_PUBLIC_DIR = 'public/emc-site/video';
  export const VIDEOS = [
    { id: 'online-ordering', title: 'Online ordering', file: 'emc-online-ordering.mp4', poster: 'emc-online-ordering-poster.jpg', cleared: true,
      caption: 'The real product, recorded with a sample fair. About a minute.' },
    { id: 'box-office', title: 'Box office', file: 'emc-box-office.mp4', poster: 'emc-box-office-poster.jpg', cleared: true,
      caption: 'The real product, recorded with a sample fair. About a minute.' },
    { id: 'live-board', title: 'Live board', file: 'emc-live-board.mp4', poster: 'emc-live-board-poster.jpg', cleared: true,
      caption: 'The real product, recorded with a sample fair. About a minute.' },
    // These three were recorded with a client fair's material. Only the name-blinded versions (files ending -web)
    // may be used. Set cleared to false to take one off the site at once.
    { id: 'fair-map', title: 'Interactive fair map', file: 'emc-fair-map-web.mp4', poster: 'emc-fair-map-web-poster.jpg', cleared: true,
      caption: "A real fair's map, with the fair's name left out. About a minute." },
    { id: 'phone-line', title: 'Ticket-buyer call line', file: 'emc-phone-line-web.mp4', poster: 'emc-phone-line-web-poster.jpg', cleared: true,
      caption: "A sample call, with the fair's name left out. About a minute." },
    { id: 'pip', title: 'Pip', file: 'emc-pip-gate-helper-web.mp4', poster: 'emc-pip-gate-helper-web-poster.jpg', cleared: true,
      caption: 'Pip answering guests at a front gate kiosk. Under a minute.' },
  ];
  // Never in this repo (they show the client fair's name): emc-fair-map.mp4, emc-phone-line.mp4, emc-pip-gate-helper.mp4,
  // emc-all-products-booth-loop.mp4, their posters, all-seven-at-a-glance.jpg, and anything from the "web (720p)" subfolder.
  export const NEVER_COPY = ['emc-fair-map.mp4', 'emc-phone-line.mp4', 'emc-pip-gate-helper.mp4', 'emc-all-products-booth-loop.mp4'];
  export const videoById = (id) => VIDEOS.find((v) => v.id === id) ?? null;
  export function copyPlan(videos = VIDEOS): { id, from, to, posterFrom, posterTo }[]   // cleared videos only
  export function renderVideoHTML(video, meta): string    // '' when the video is not cleared; meta = { width, height } from videos.json

  // src/video.js
  export function initVideos(doc = document, track = trackEvent): void   // starting one video pauses the others; fires 'video_play' { id } once per video

  // src/show.js
  export const SHOW = { booth: '#410', city: 'Louisville', firstDay: '2026-11-30', lastDay: '2026-12-01', timeZone: 'America/New_York' };
  export function showPhase(now = new Date()): 'before' | 'during' | 'after'     // by the calendar date in SHOW.timeZone
  export function boothLine(now = new Date()): string
  export function initShowNotes(doc = document, now = new Date()): void
  // initShowNotes: un-hides every [data-booth-note] in phases 'before' and 'during'; sets [data-booth-line] text to boothLine(now)
  ```
  `boothLine` strings, exactly: before `See us at Booth #410 in Louisville, Nov 30 to Dec 1`; during `We're at Booth #410 today`; after `Good to meet you in Louisville.`
  Placeholders: `<!--site:video-online-ordering-->` and so on, one per id (`GENERATORS['video-' + id]`).
- Page ids: `online-sales`, `box-office`, `retail`, `gate-scanning`, `rfid`, `live-dashboard`, `daily-reports`, `guests`, `guest-map`, `guest-pip`, `guest-call-line`. Task 7 fills the element `[data-demo="live-dashboard"]` inside `#live-dashboard`.

- [ ] **Step 1: Write the failing tests.**

`tests/videos.test.js`:
```js
it('lists the six videos, and the three recorded with a client fair use only the name-blinded files', () => {
  expect(VIDEOS.map((v) => v.id)).toEqual(['online-ordering', 'box-office', 'live-board', 'fair-map', 'phone-line', 'pip']);
  for (const id of ['fair-map', 'phone-line', 'pip']) expect(videoById(id).file).toMatch(/-web\.mp4$/);
  for (const v of VIDEOS) expect(NEVER_COPY).not.toContain(v.file);
});
it('only cleared videos are ever copied', () => {
  expect(copyPlan().map((p) => p.id)).toEqual(VIDEOS.filter((v) => v.cleared).map((v) => v.id));
  expect(copyPlan([{ id: 'x', file: 'x.mp4', poster: 'x.jpg', cleared: false }])).toEqual([]);
});
it('refuses to plan a copy of a file on the never-copy list', () => {
  expect(() => copyPlan([{ id: 'x', file: 'emc-fair-map.mp4', poster: 'x.jpg', cleared: true }])).toThrow(/emc-fair-map\.mp4/);
});
it('a cleared video renders a native player that needs no JavaScript', () => {
  // renderVideoHTML(videoById('box-office'), { width: 1920, height: 1080 }) parsed:
  // figure[data-video="box-office"] > video[controls][playsinline][preload="none"][poster="/emc-site/video/emc-box-office-poster.jpg"][width][height]
  // with <source src="/emc-site/video/emc-box-office.mp4" type="video/mp4"> and a fallback <a href> to the same file inside the video element;
  // figcaption text is the video's caption from the manifest; the video has an aria-label naming the title
});
it('a video that is not cleared renders nothing', () => { expect(renderVideoHTML({ ...videoById('pip'), cleared: false }, {})).toBe(''); });
it('every cleared video and poster is in the repo, and nothing else is', () => {
  // public/emc-site/video holds exactly the six MP4s, their six posters and videos.json; no file on NEVER_COPY, nothing else
});
it('starting one video pauses the others and reports the play once', () => { /* initVideos with stubbed play/pause and a track spy */ });
```

`tests/show.test.js`:
```js
it('is before the show until the end of Nov 29 in Louisville', () => {
  expect(showPhase(new Date('2026-11-30T04:59:00Z'))).toBe('before');   // 11:59 PM Nov 29 Eastern
});
it('is during the show on Nov 30 and Dec 1 in Louisville', () => {
  expect(showPhase(new Date('2026-11-30T05:00:00Z'))).toBe('during');   // midnight Nov 30 Eastern
  expect(showPhase(new Date('2026-12-02T04:59:00Z'))).toBe('during');   // 11:59 PM Dec 1 Eastern
});
it('is after the show from Dec 2 in Louisville', () => { expect(showPhase(new Date('2026-12-02T05:00:00Z'))).toBe('after'); });
it('gives the three lines exactly', () => {});
it('initShowNotes shows booth notes before and during the show and leaves them hidden after', () => {});
```

`tests/platform.test.js` (rendered page): every id listed above exists; the copy in Step 3 is present exactly; `#online-sales`, `#box-office`, `#live-dashboard`, `#guest-map`, `#guest-call-line` and `#guest-pip` each hold their video (`[data-video]` with the right id); the box office link is `https://app.emctickets.com/pos/tour` with `target="_blank"` and `rel` containing `noopener`; `#rfid` has no link and says "Later in 2027"; each of the four booth notes is `hidden` in the HTML and reads "See it at Booth #410"; `#online-sales`, `#box-office` and `#live-dashboard` each end with a link to `#talk` reading "Let's talk about your fair".

- [ ] **Step 2: Run** the three new test files. Expected: FAIL.

- [ ] **Step 3: Write `scripts/sync-videos.mjs` and run it** (`npm run videos`). For each entry of `copyPlan()`: fail with a clear message if the source file is missing; copy the MP4 with `ffmpeg -y -i <from> -c copy -movflags +faststart <to>` (no re-encode; plain copy with a printed warning if ffmpeg is not on the PATH); write the poster as a 960-wide JPEG (quality 78) with sharp; read width, height and duration with `ffprobe` into `public/emc-site/video/videos.json` (`{ [id]: { width, height, seconds } }`). Delete any file in the folder that is not in the plan. Print one line per video with its size. Expected: six MP4s of 2 to 9 MB each. The script reads only the exact filenames in the manifest from the source folder's top level; it never reads the "web (720p)" subfolder.

- [ ] **Step 4: Write `platform/index.html`** with this copy, in this order. Each block is a `<section>` with the id shown; group labels use the numbered squares (01 Sell, 02 Scan, 03 Count).

  - Intro: kicker "The platform"; `<h1>Sell. Scan. Count.</h1>`; "One system from first ticket to final report. Pick any tool and see it work. No sign-up."; a row of jump links to the blocks.
  - **01 Sell**
    - `online-sales`: `<h2>Online sales</h2>`; "Online sales and flash sales, on any phone. Buyers pick their tickets, pay and get a QR ticket."; `<!--site:video-online-ordering-->`; the `#talk` link.
    - `box-office`: `<h2>Box office POS</h2>`; "Ring up a sale at the window. The register runs in a web browser on an iPad, so there is nothing to install. Tickets and the receipt print automatically."; `<!--site:video-box-office-->`; link "Take the full box office tour" (new tab) with the note "Opens the real register with sample data, so you can try it yourself."; the `#talk` link.
    - `retail`: `<h2>Retail stores</h2>`; "EMC is the exclusive event ticket partner of Walgreens."; "8,000+ retail locations"; "Same benefits at Circle K and Menards."; link "See how retail works" to `/retail-partners/`.
  - **02 Scan**
    - `gate-scanning`: `<h2>Gate scanning</h2>`; "Any gate, duplicates blocked. Barcode or QR."; "A ticket gets in once. Scan it again and the gate sees it has already been used."
    - `rfid`: `<h2>RFID wristbands</h2>` with the amber tag "Later in 2027"; "RFID wristbands later in 2027."; booth note.
  - **03 Count**
    - `live-dashboard`: `<h2>Live dashboard</h2>`; "Real-time validation. 24/7 dashboard. Watch tickets sold, scanned in and sales as they happen."; `<div data-demo="live-dashboard"></div>` preceded for now by the line "Demo coming to this page." (Task 7 removes that line); then "Or watch the real board, recorded:" and `<!--site:video-live-board-->`; the `#talk` link.
    - `daily-reports`: `<h2>Daily reports</h2>`; "Sales by ticket type and by channel, scans by gate, and the day's totals."
  - `guests`: `<h2>New for your guests</h2>`; three blocks: `guest-map` "Interactive fair map", "Your grounds on every phone.", `<!--site:video-fair-map-->`; `guest-pip` "Pip", "A talking AI clown for the front gate.", `<!--site:video-pip-->`; `guest-call-line` "Ticket-buyer call line", "Ticket answers by phone.", `<!--site:video-phone-line-->`; each with a booth note.
  - Booth note markup, hidden by default: `<p class="booth-note" data-booth-note hidden>See it at Booth #410</p>`.

- [ ] **Step 5: Implement `build/videos.js`, the generators, `src/video.js`, `src/show.js` and `src/entry/platform.js`.** `renderVideoHTML` builds the native player described in the test; a cleared video whose files are missing from `public/emc-site/video` makes the build throw with "run npm run videos". `showPhase` formats `now` as a date in `SHOW.timeZone` with `Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })` and compares strings. `platform.js` imports `./site.js`, then calls `initShowNotes()` and `initVideos()`.

- [ ] **Step 6: Write `platform.css`:** the page layout (intro, jump links, group labels, blocks as white cards on cream), the video figure (16:9, rounded 22px corners, the line under it in muted text, full width of its card, never wider than 960px), the amber "Later in 2027" tag, the booth note. On phones a video fills the card's width and the native full-screen control is the way to see it large.

- [ ] **Step 7: Restore the hash-link test** in `tests/site-integrity.test.js` (remove the `it.todo` Task 5 left). **Run** `npm test`. Expected: PASS.

- [ ] **Step 8: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs /platform/`. No sideways scroll at 360; each of the six videos shows its poster and plays in a browser (check one with `node .superpowers/tools/tick-check.mjs` is not needed; instead confirm by loading the page and reading `video.readyState` after calling `play()` in a Playwright script, or report that playback was not verified); the booth notes show (today is before the show).

- [ ] **Step 9: Commit** `feat(relaunch): platform page with the real-product walkthrough videos`.

---

### Task 7: The live dashboard, modeled on the real live board

*Added 2026-11-18. Anthony: "I want the dashboard to be more complex and closer to the terminal that we made." The Live dashboard demo on the platform page follows the real live board's panels, labels and dark screen look, on sample data.*

**Files:**
- Create: `src/demo/dashboard-engine.js`, `src/demo/pace.js`, `src/demo/dashboard-markup.js`, `src/demo/dashboard-view.js`, `src/styles/dashboard.css`, `tests/dashboard-engine.test.js`, `tests/pace.test.js`, `tests/dashboard-view.test.js`
- Modify: `build/render.js` (the `dashboard` generator), `platform/index.html` (replace the "Demo coming to this page." line and the empty demo element with `<!--site:dashboard-->`), `src/entry/platform.js`, `build/pages.js` (platform `styles` adds `/src/styles/dashboard.css`), `tests/platform.test.js`, `tests/no-js.test.js`

**Interfaces:**
- Consumes: `createBoardState`, `nextSale`, `snapshot`, `count`, `money`, `mulberry32` from `src/demo/board-engine.js`; `TICKET_TYPES`, `GATES`, `FAIR`, `wholePercents`, `totals` from `src/demo/sample-fair.js`; `runWhileVisible` from `src/demo/lifecycle.js`.
- Produces:
  ```js
  // src/demo/pace.js
  export const DAY_START_MIN = 9 * 60, DAY_END_MIN = 23 * 60;
  export function shareBy(minute): number                        // share of the day's sales made by this minute: 0 at open, 1 at close, never decreasing
  export function paceSeries(ticketsNow, nowMinute): { minute, tickets }[]   // one point per half hour from open to now, the last one exactly ticketsNow at nowMinute
  export function forecast(ticketsNow, nowMinute): { projected, low, high }  // projected = ticketsNow / shareBy(now) rounded to the nearest 10; low <= projected <= high; all >= ticketsNow

  // src/demo/dashboard-engine.js
  export function createDashState({ minute = 18 * 60 + 42 } = {}): DashState     // wraps createBoardState(); same tickets, sales and scans as the home board
  export function advance(state, rng = Math.random, { seconds = 1.7 } = {}): DashState   // one sale through nextSale, plus everything derived from it; never mutates
  export function dashSnapshot(state): DashSnapshot

  // src/demo/dashboard-markup.js
  export function renderDashboardHTML(snap): string       // the whole board; root has data-sample and data-dashboard

  // src/demo/dashboard-view.js
  export function mountDashboard(el, { intervalMs = 1700, rng = Math.random } = {}): { tick(): void, destroy(): void }
  ```
  `DashSnapshot`:
  ```js
  {
    clock: { minute, label },                 // label like '6:42 PM'
    totals: { tickets, gross, orders, admitted, avgOrder, refundCount, refunds, sinceLabel, sinceCount, gateRate },
    feed: [{ id, lines, where, amount, ageLabel }],          // 4 newest; where like 'Online · Card' or 'Gate 1 · Cash'
    pace: { series, projected, low, high, nowMinute },
    gates: [{ id, name, admitted, perMinute /* 30 numbers */, rate, slow }],
    tenders: [{ id, label, amount, share }],                 // 'Online card', 'Box-office card', 'Cash'; shares sum to 100
    types: [{ id, name, sold, left, note }],                 // note: "Won't sell out today" or 'Sells out about 9:30 PM'
    registers: [{ id, name, cashier, sales, cardSeconds, drawer, reader, printer, close }],
    fraud: { presentedAgain, voided, wrongEvent, wrongDay, recent: [{ tail, gate, firstLabel, firstGate, timeLabel }] },
    brief: { timeLabel, text },
  }
  ```

- [ ] **Step 1: Study the real board.** Read, in `~/projects/EMC-Ticketing-Platform` (read only; do not run it, do not change it): `app/components/live/shell.tsx`, `counter.tsx`, `feed.tsx`, `pace.tsx`, `gates.tsx`, `money.tsx`, `registers.tsx`, `fraud.tsx`, `alerts.tsx`, `format.ts`, `app/lib/live/types.ts`, `app/lib/live/analytics.ts`, and `app/styles/live.css` for its layout, colors and type scale. Look at the board as it appears on a screen: `/mnt/c/Users/Anthony Quintana/Desktop/EMC Pitch Materials/Product Demo Videos/emc-live-board-poster.jpg`. The demo keeps the real board's panel names, labels, order and screen look. It leaves out what needs a server or a person: the Ask box, the demo switch, the weather panel, the "Updated" stamp and the LIVE / DELAYED / OFFLINE status logic (the dot always reads LIVE).

- [ ] **Step 2: Write the failing tests.**

`tests/pace.test.js`: `shareBy` is 0 at open, 1 at close, never decreases across the day and clamps outside it; `paceSeries(3947, 18 * 60 + 42)` never decreases and its last point is `{ minute: 1122, tickets: 3947 }`; `forecast(3947, 1122)` gives multiples of 10 with `3947 <= low <= projected <= high`.

`tests/dashboard-engine.test.js`:
```js
it('opens on the same books as the home board', () => {
  const s = dashSnapshot(createDashState());
  expect(s.totals.tickets).toBe(3947); expect(s.totals.gross).toBe(61284); expect(s.totals.admitted).toBe(2618);
  expect(s.clock.label).toBe('6:42 PM');
});
it('every panel agrees with the books after any number of sales', () => {
  // 400 advances with mulberry32(11); after each one:
  // tenders amounts sum to totals.gross and their shares sum to 100; tender labels are exactly ['Online card', 'Box-office card', 'Cash']
  // totals.orders rose by exactly 1; avgOrder === Math.round(gross / orders * 100) / 100
  // types: the sold figures sum to totals.tickets; every left >= 0
  // gates: admitted figures sum to totals.admitted; each perMinute has 30 non-negative numbers; rate is the mean of the last 10, one decimal
  // registers: sales sum to the Box-office card and Cash tenders together; an online sale changes no register
  // fraud counts never decrease; recent has at most 5 entries
  // pace.series ends at totals.tickets; totals.tickets <= pace.low <= pace.projected <= pace.high
});
it('the clock moves forward with each advance and the feed ages', () => {});
it('never mutates the state it was given', () => { /* deep-freeze the input */ });
it('is the same run for the same seed', () => {});
it('shows only Online and the box-office registers as places; never a store', () => {});
```

`tests/dashboard-view.test.js`: `renderDashboardHTML(dashSnapshot(createDashState()))` holds "Demo County Fair", "LIVE", "Sample data", the four tile labels "Tickets today", "Gross today", "Orders", "Admitted", the panel headings "Latest sales", "Gates", "Money", "Fraud watch", "Ticket types today", "Registers", a pace heading starting "On pace for", the legend "Sold so far", "Expected at this pace", "Forecast range", the fraud labels "Presented again", "Voided", "Wrong event", "Wrong day", and "AI brief"; the root matches `[data-sample][data-dashboard]` and has no `aria-live` anywhere; `tick()` changes the tile figures without replacing the board's root element or its panel elements (hold references to them before and after); it stops when hidden and when off screen and does not catch up (the board's cases); `destroy()` stops everything and a later `tick()` does nothing.

`tests/platform.test.js`, change: the page no longer says "Demo coming to this page." and `#live-dashboard` contains `[data-dashboard]`. `tests/no-js.test.js`, add: the platform page as served contains the dashboard with `3,947` and `$61,284`.

- [ ] **Step 3: Run** the three new test files. Expected: FAIL.

- [ ] **Step 4: Implement the engine.** `createDashState` holds the board state plus: orders (start 1,512), refunds (start 4 refunds, $96; they do not grow), tender amounts that already sum to the baseline gross (Online card = the baseline's online sales; the box-office sales split between card and cash), three registers ("Gate 1", "Gate 2", "Box Office 1") with sample cashiers "Sam", "Riley" and "Jordan" whose sales already sum to the box-office tenders, per-gate minute buckets for the last 30 minutes consistent with each gate's admitted count, fraud counts (start 12 presented again, 3 voided, 0 wrong event, 2 wrong day, with two recent tries), a capacity per ticket type well above what a visit can sell, and the sample clock. `advance` makes one sale with `nextSale` and attributes it: an online sale goes to the Online card tender; a box-office sale goes to one register and to Box-office card or Cash by its tender; scans go into the current minute bucket of the gate that took them; about one advance in forty adds a "presented again" try; the clock moves forward by `seconds`, rolling the minute buckets when the minute changes. The brief sentence is built from the snapshot: "As of 6:42 PM: 3,947 tickets sold, $61,284 gross, 2,618 admitted, with 6,150 projected for the day (5,900 to 6,400)." (figures from the snapshot; write ranges with "to").

- [ ] **Step 5: Implement the markup and the view.** One board, laid out as the real one: top bar (the on-dark EMC logo, "Demo County Fair", a red LIVE dot, the clock with seconds, the "Sample data" pill); a ribbon "SAMPLE · simulated crowd"; the four tiles with their sub-lines ("+N since 6:30 PM", "Average order $40.53", "4 refunds, $96.00", "N a minute at the gates"); then the panels in the real board's arrangement: Latest sales (ticket stubs with amount and age), the pace chart (SVG: sold-so-far line, dashed expected line, shaded forecast range, a "Now" marker, hour labels), Gates (admitted, a 30-minute sparkline, rate per minute, a "Slow" flag when the real board's rule in `analytics.ts` would flag it), Money (the split bar and the three tenders with amount and share), Fraud watch, Ticket types today, Registers (cashier, sales, card-sale seconds, drawer, reader and printer dots, last close); and the brief strip along the bottom labeled "AI brief" with "sample" beside it. `mountDashboard` renders once, then on each tick updates text and attributes in place (never replaces the board or a panel); the four tile figures count up over about 800 ms (they jump under reduced motion); it runs only through `runWhileVisible`; after `destroy()` nothing runs. No fee lines anywhere.

- [ ] **Step 6: Write `dashboard.css`.** The board is a dark screen (the real board's colors from `live.css`) set in a monitor frame with a stand on computers, as in the poster, on the cream page; the site's fonts (Bricolage Grotesque for figures and headings, Figtree for text, DM Mono for small labels). At 1000px and under there is no monitor stand: the board is a dark rounded card and the panels stack in this order: tiles (two by two), pace, Latest sales, Gates, Money, Ticket types today, Registers, Fraud watch, brief. Text on the dark screen meets 4.5:1 contrast. No sideways scroll at 360px. Animation off under `prefers-reduced-motion`.

- [ ] **Step 7: Register the generator** (`GENERATORS.dashboard = () => renderDashboardHTML(dashSnapshot(createDashState()))`), put `<!--site:dashboard-->` in the page in place of the temporary line and the empty element, and mount it from `platform.js` (a failure to mount must not break the rest of the page).

- [ ] **Step 8: Run** `npm test`. Expected: PASS.

- [ ] **Step 9: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs /platform/` and again with `--nojs`. Compare the computer screenshot with the poster JPEG: same panels in the same places, same dark screen feel. Check 360 and 390 for the stacked layout. Confirm it ticks: `node .superpowers/tools/tick-check.mjs http://localhost:5173/platform/ '[data-dashboard]'` prints CHANGED and no errors.

- [ ] **Step 10: Commit** `feat(relaunch): live dashboard demo modeled on the real live board`.

---

### Task 8: Retail partners, Marketing, About, Privacy, Terms and the not-found page

**Files:**
- Rewrite: `retail-partners/index.html`, `marketing/index.html`, `about/index.html`, `privacy/index.html`, `terms/index.html`, `404.html`
- Create: `src/styles/pages.css`, `tests/content-pages.test.js`
- Modify: `build/pages.js` (these six pages add `/src/styles/pages.css`)

**Interfaces:**
- Consumes: chrome classes; `{{FORM_SERVICE_NAME}}`, `{{CONTACT_EMAIL}}` tokens.

- [ ] **Step 1: Write the failing test** `tests/content-pages.test.js`: for each page below, every quoted sentence appears exactly in the rendered page's visible text; the retail page's two figures sit next to "Source: Walgreens."; the retail page shows the Circle K and Menards logos after "Same benefits at"; privacy and terms have an `h1`, their "Last updated: November 2026" line and the `info@emctickets.com` mailto; the not-found page has links to `/`, `/platform/` and `https://app.emctickets.com/recover`.

- [ ] **Step 2: Run** it. Expected: FAIL.

- [ ] **Step 3: Write the pages.** Layout follows the look: a cream page, a kicker, a large Bricolage heading, white cards, numbered squares for steps.

  **Retail partners** (all approved wording; change nothing):
  - `<h1>Sell your fair tickets at Walgreens.</h1>`
  - "EMC is the exclusive event ticket partner of Walgreens."
  - Two figures: "8,000+" over "retail locations"; "78%" over "of Americans live within 5 miles of a Walgreens"; then "Source: Walgreens."
  - `<h2>How it works</h2>` with four numbered steps:
    1. "You set the tickets." / "You get free in-store posters, counter displays and signage."
    2. "Walgreens sells them." / "Advance-sale promotions catch impulse buyers at the counter."
    3. "Your revenue is locked in before the weather." / "Tickets are pre-sold and non-refundable."
    4. "You get paid within 30 days of your event." / "No chargebacks. No credit card fees."
  - "Same benefits at" followed by the Circle K and Menards logos.
  - "The Florida State Fair, South Carolina State Fair and Coastal Carolina Fair all run their retail ticketing through EMC."
  - The ask band (mockup variant, from the registry).

  **Marketing** (new copy, for Anthony's read):
  - Kicker "Marketing"; `<h1>Marketing for your event.</h1>`; "Media buying, promotions, ad production and social media, from a team with 40+ years in the industry."
  - Four cards: "Media buying" / "Radio, TV, billboards, web and mobile. We plan and place the media for your event."; "Promotions" / "Special promotions with local partners, built around your event."; "Ad production" / "Ad graphics and video for your campaigns."; "Social media" / "We manage your social media posts and answer your guests' questions and comments in a timely manner."
  - Closing line: "Each event is unique. Tell us about yours."

  **About** (new copy from the current About page, for Anthony's read):
  - Kicker "About EMC"; `<h1>40+ years in the industry</h1>`
  - "EMC treats every event as a partner. We take ownership of each fair and festival we work for, because we want you to succeed."
  - "Every event is different, with its own goals and its own way of working. So we build the program your event needs, instead of handing you a one-size system."
  - "Our customer service line is answered 24/7."
  - "With EMC everyone wins: the event, the guests and EMC. If one of them is not winning, the program is not working."
  - "The Florida State Fair, South Carolina State Fair and Coastal Carolina Fair all run their retail ticketing through EMC."

  **Privacy** (take the ten sections from `git show main:privacy.html`, replace every em dash with a comma, colon or period, and make these changes; for Anthony's read):
  - "Last updated: November 2026"
  - Section 2 becomes three items: "Contact form. When you send the form on this site we collect your name, your fair or event, your email address and any message you add. We also record the page you sent it from and, if you arrived from one of our printed cards or emails, the campaign tag in that link." / "Email and phone. If you email or call us, we keep what you send us." / "Cookies and tracking. This site does not load analytics or advertising trackers today. If we add them (we may use PostHog, Microsoft Clarity, the LinkedIn Insight Tag and the Meta Pixel), a banner will ask first, and nothing loads unless you choose Accept."
  - Section 4 names the form service: "We share it only with the services that run this site for us, including {{FORM_SERVICE_NAME}}, which delivers the contact form to our email, with professional advisers where required, or where the law requires disclosure."
  - Section 6: "You can change your cookie choice at any time with the Cookie settings link at the bottom of every page."

  **Terms:** the nine sections from `git show main:terms.html` with every em dash replaced the same way and "Last updated: November 2026".

  **Not found:** `<h1>This page isn't here.</h1>`; "The page may have moved. Try one of these."; links "Home", "The platform", "Find my tickets".

- [ ] **Step 4: Run** `npm test`. Expected: PASS, including the wording tests on the new pages.

- [ ] **Step 5: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs /retail-partners/ /marketing/ /about/ /privacy/ /terms/ /404.html`. No sideways scroll; each page reads as a short story ending in the ask band.

- [ ] **Step 6: Commit** `feat(relaunch): retail partners, marketing, about, legal and not-found pages`.

---

### Task 9: The IAFE landing page

**Files:**
- Create: `src/iafe/variant.js`, `src/entry/iafe.js`, `src/styles/iafe.css`, `tests/iafe.test.js`
- Rewrite: `iafe/index.html`
- Modify: `build/pages.js` (iafe `styles` adds pages and iafe CSS; `entry` `/src/entry/iafe.js`), `tests/no-js.test.js`

**Interfaces:**
- Consumes: `boothLine`, `initShowNotes`, `showPhase` from `src/show.js`; `setAskVariant` from `src/form/ask-form.js`; `captureUtm` runs in `site.js`.
- Produces:
  ```js
  // src/iafe/variant.js
  export function iafeVariant(search = location.search): 'walgreens' | 'standard'   // 'walgreens' only when utm_content, trimmed and lower-cased, is 'walgreens-card'
  export function applyIafeVariant(doc, variant): void
  // applyIafeVariant('walgreens'): un-hides [data-iafe-lead="walgreens"] and calls setAskVariant on the page's [data-ask] with 'mockup'
  ```

- [ ] **Step 1: Write the failing test** `tests/iafe.test.js`:
```js
it('picks the Walgreens page only for the Walgreens card', () => {
  expect(iafeVariant('?utm_source=iafe&utm_medium=handout&utm_campaign=iafe2026&utm_content=walgreens-card')).toBe('walgreens');
  expect(iafeVariant('?utm_content=platform-card')).toBe('standard');
  expect(iafeVariant('?utm_content=business-card')).toBe('standard');
  expect(iafeVariant('')).toBe('standard');
  expect(iafeVariant('?utm_content=%20Walgreens-Card%20')).toBe('walgreens');
  expect(iafeVariant('?utm_content=x&utm_content=walgreens-card')).toBe('standard');   // the first value wins
});
it('the page as served is the standard page', () => {
  // [data-iafe-lead="walgreens"] has hidden; h1 'One system from first ticket to final report.'; [data-booth-line] reads the "before" line;
  // the ask band is the first section after the hero and has id talk and variant talk
});
it('the Walgreens variant leads with the Walgreens story and asks for the mockup', () => {
  // after applyIafeVariant(doc, 'walgreens'): the lead is visible and comes before the h1's section in document order;
  // heading 'Get a free in-store mockup of your event.'; button 'Request my mockup'
});
it('lists Sell, Scan, Count with the approved items and links to the demos', () => {
  // Sell: 'Online sales', 'Flash sales', 'Box office POS'; Scan: 'Any gate, duplicates blocked', 'Barcode or QR', 'RFID wristbands later in 2027';
  // Count: 'Real-time validation', 'Daily reports', '24/7 dashboard'; links to /platform/#online-sales, /platform/#live-dashboard and /platform/
});
it('lists the five booth demos', () => {
  // 'RFID wristbands', 'Box office POS', 'Interactive fair map', 'Our ticket-buyer call line', 'Pip, our talking AI clown for the front gate'
});
it('the booth heading follows the show', () => { /* before and during: 'See it live at Booth #410'; after: 'What we showed in Louisville' */ });
it('loads no video, no board and no hero photo', () => { /* no <video>, no [data-board], no <picture> */ });
it('the closing strip links back to the form', () => { /* a[href="#talk"] "Let's talk about your fair" after the booth list */ });
```
`tests/no-js.test.js`, add: the IAFE page as served shows the standard lead and the email fallback.

- [ ] **Step 2: Run** it. Expected: FAIL.

- [ ] **Step 3: Write the page**, in this order: the Walgreens lead (hidden; `<section data-iafe-lead="walgreens" hidden>`: `<h2>Sell your fair tickets at Walgreens.</h2>`, "EMC is the exclusive event ticket partner of Walgreens.", the two figures with "Source: Walgreens.", the four "How it works" steps exactly as on the retail page, "Same benefits at" with the two logos); the hero (`<p data-booth-line>` with the "before" line, `<h1>One system from first ticket to final report.</h1>`, "Sell everywhere, scan at any gate and watch every ticket count as it happens.", a button to `#talk`); `<!--site:ask-->`; the Sell, Scan, Count summary with the demo links; the booth demos under `<h2 data-booth-heading>See it live at Booth #410</h2>`; the closing strip ("Let's talk about your fair" to `#talk`, the email and the toll-free number). No photo.

- [ ] **Step 4: Implement `variant.js` and `iafe.js`.** `iafe.js` imports `./site.js`, then on `DOMContentLoaded`: `initShowNotes()`, set the booth heading for the phase, and `applyIafeVariant(document, iafeVariant())`.

- [ ] **Step 5: Run** `npm test`. Expected: PASS.

- [ ] **Step 6: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs "/iafe/" "/iafe/?utm_source=iafe&utm_medium=handout&utm_campaign=iafe2026&utm_content=walgreens-card"`. On a 360px phone the first screen shows the booth line, the headline and the start of the form (standard) or the Walgreens headline (Walgreens card). After `npm run build`, the JavaScript the IAFE page loads is under 30 KB before compression: `ls -la dist/emc-site/assets/` and name the IAFE chunks in the report.

- [ ] **Step 7: Commit** `feat(relaunch): IAFE landing page with the Walgreens card variant`.

---

### Task 10: The go-live package and staging

**Files:**
- Create: `deploy/htaccess-block.conf`, `deploy/GO-LIVE.md`, `public/emc-site/.htaccess`, `scripts/build-host.sh`, `scripts/check-live.mjs`, `tests/go-live.test.js`
- Modify: `scripts/deploy-pages.sh` (build with `--mode staging`), `package.json` (scripts `build:host`, `check:live`)

**Interfaces:**
- Produces:
  ```js
  // scripts/check-live.mjs
  export const EVENT_SITES: string[]      // the 18 folders in spec 3.6, each as '/name/'
  export const OLD_PAGES: string[]        // '/event-intake-form/', '/event-list/', '/circle-k-video/', '/greater-jacksonville-fair/'
  export const REDIRECTS: [from: string, to: string][]   // the eight rows of the table in spec 5.1
  export const NEW_PAGES: string[]        // the nine page paths (no 404)
  export const QR_LINKS: string[]         // the three /iafe/?utm_... links in spec 5.10
  export const APP_LINKS: string[]        // recover, portal/login, pos/tour
  export async function runChecks(base, { phase }): Promise<{ name, url, ok, detail }[]>   // phase: 'pre' | 'post'
  ```
  CLI: `node scripts/check-live.mjs <base-url> --pre|--post` prints one line per check and exits 1 if any failed. `--pre` checks what must already work today and keep working (event sites, old pages, app links). `--post` adds: each new page answers 200 and contains `name="emc-site"`; each redirect answers 301 with the right `Location`; the three QR links answer 200.

- [ ] **Step 1: Write the failing test** `tests/go-live.test.js`:
```js
it('lists the 18 event sites exactly as the design does', () => {
  expect(EVENT_SITES).toEqual(['/flstatefair/', '/scstatefair/', '/coastalcarolinafair/', '/coastalcarolina-fairground/', '/ccfair-tripleb/',
    '/santaseforest/', '/northfloridafair/', '/reithofferfestivals/', '/countrythunderfl/', '/countrythunderwi/', '/chicagofootballclassic/',
    '/biggarlandfair/', '/kansascityrenfest/', '/michiganrenfest/', '/minnesotarenfest/', '/newyorkrenfair/', '/stlouisrenfest/', '/renaissancefestivals/']);
});
it('lists the eight redirects exactly as the design does', () => {
  expect(REDIRECTS).toEqual([['/what-we-do/', '/platform/'], ['/online/', '/platform/#online-sales'], ['/onsite/', '/platform/#box-office'],
    ['/social/', '/marketing/'], ['/contact-us/', '/contact/'], ['/privacy-and-terms/', '/privacy/'], ['/walgreens/', '/retail-partners/'], ['/events/', '/']]);
});
it('the block has one 301 rule per redirect, and its rules match nothing else', () => {
  // parse each RewriteRule pattern from deploy/htaccess-block.conf; every REDIRECTS source (without its leading slash) matches exactly one rule
  // whose target and flags are right (R=301, L, and NE where the target has a #);
  // no rule pattern matches any EVENT_SITES, OLD_PAGES or NEW_PAGES path, or 'wp-admin/', 'wp-json/', 'wp-login.php'
});
it('the block is fenced by its begin and end markers and touches nothing of WordPress', () => {
  // first line '# BEGIN EMC static site', last line '# END EMC static site'; no 'index.php' except in DirectoryIndex; no 'RewriteBase'
});
it('new page paths come from the registry', () => { /* NEW_PAGES equals PAGES paths except /404.html */ });
```

- [ ] **Step 2: Run** it. Expected: FAIL.

- [ ] **Step 3: Write `deploy/htaccess-block.conf`:** the fence comments; `DirectoryIndex index.html index.php`; inside `<IfModule mod_rewrite.c>`: `RewriteEngine On`, then one anchored rule per redirect, for example `RewriteRule ^what-we-do/?$ /platform/ [R=301,L]` and `RewriteRule ^online/?$ /platform/#online-sales [R=301,NE,L]`. Write `public/emc-site/.htaccess`: long caching (one year, immutable) for `assets/` and `fonts/`, one week for the other files in the folder, using `mod_headers` and `mod_expires` inside `<IfModule>` guards.

- [ ] **Step 4: Write `scripts/build-host.sh`:** production build into `dist-host/` (`npx vite build --outDir dist-host --emptyOutDir`); remove `dist-host/.nojekyll` and `dist-host/404.html`; fail unless the top-level entries are exactly `index.html`, `robots.txt`, `sitemap.xml`, `emc-site`, `platform`, `retail-partners`, `marketing`, `about`, `contact`, `iafe`, `privacy`, `terms`; write `dist-host/emc-site/MANIFEST.txt` (every file, sorted) and `dist-host.zip` beside the folder (`python3 -m zipfile -c`). With an argument naming a text file that lists the host's web-root entries (one per line), also fail if any top-level entry already exists there, printing each clash.

- [ ] **Step 5: Write `scripts/check-live.mjs`** (Node 22 `fetch`, `redirect: 'manual'`, a 20 second timeout per request, a browser-like `User-Agent`).

- [ ] **Step 6: Write `deploy/GO-LIVE.md`,** for whoever has the host login. Sections, in order:
  1. **What this does** (three sentences) and **what it must not disturb** (the 18 event sites, the four old pages, email, the ticketing app).
  2. **Before you start:** run `node scripts/check-live.mjs https://emctickets.com --pre` and keep the output; download the real root `.htaccess` and a listing of the web root; run `scripts/build-host.sh <listing>` and stop on any clash; read the real `.htaccess` for a page-cache block or a `DirectoryIndex` line and note what you find. If a page-cache plugin serves the home page from its own rewrite rules, add `RewriteRule ^$ /index.html [L]` to the block and say so here.
  3. **Back up:** copy the original `.htaccess` to `.htaccess.before-emc-static` on the host and keep a local copy.
  4. **Upload,** in this order: `emc-site/`, the eight page folders, `sitemap.xml`, `robots.txt`, then `index.html`, then paste the block at the very top of `.htaccess`, above everything already there, changing nothing below it.
  5. **Check:** `node scripts/check-live.mjs https://emctickets.com --post`, then one real form submission.
  6. **Undo:** remove the block, delete `index.html`, then (optionally) the uploaded folders and files; each named. The old site is back after the first two steps.
  7. **Later deploys:** `scripts/build-host.sh`, upload the same set, no `.htaccess` change.
  8. **Open items:** a physical `robots.txt` and `sitemap.xml` take over from the ones WordPress generates today (intended); the form key (Q2); the old Tag Manager container (Q3); how the files get uploaded depends on the access Anthony can give (Q1).

- [ ] **Step 7: Staging.** `scripts/deploy-pages.sh` builds with `npx vite build --mode staging`.

- [ ] **Step 8: Run** `npm test` (expected: PASS), `bash scripts/build-host.sh` (expected: the twelve top-level entries, a manifest and a zip), and `node scripts/check-live.mjs https://emctickets.com --pre` (expected: every event site, old page and app link OK today; put the output in the report).

- [ ] **Step 9: Commit** `feat(relaunch): go-live package for the current host, live checks, staging mode`.

---

### Task 11: Finish (controller)

- [ ] **Step 1:** `npm test` and `npm run build` on the branch. Expected: all pass, no warnings about missing files.
- [ ] **Step 2: Browser pass.** `npx vite preview`, then `node .superpowers/tools/shots.mjs --base http://localhost:4173` over all ten pages plus the Walgreens IAFE link. Expected: no page scrolls sideways at 360; look at every screenshot at 390 and 1280. Check by hand in the preview: the menu on a phone width, the form (simulate) on `/contact/`, the three videos play, the dashboard ticks, the cookie settings link, and the home and platform pages with JavaScript disabled.
- [ ] **Step 3: Try the host rules for real** if an Apache can be had without sudo (`apt-get download apache2-bin` and its libraries, unpacked under `~/.local`): serve `dist-host/` beside a fake WordPress (`index.php`, a root `.htaccess` holding the stock WordPress block, two fake event folders each with `index.php`), with the block on top, and run `check-live.mjs --post` against it. If Apache cannot be had in 20 minutes, record that the rules are checked only by the unit test and will be proven on the real host at go-live.
- [ ] **Step 4: Final whole-branch review** by a fresh reviewer against the spec and this plan. Fix what it finds.
- [ ] **Step 5:** Merge to `main` with `--no-ff`, run the tests on the merge, delete the branch, push `main` to origin (standing instruction).
- [ ] **Step 6: Staging:** `bash scripts/deploy-pages.sh`, then check `https://quinto55.github.io/` and `/iafe/` load and carry `noindex`.
- [ ] **Step 7:** Update the ledger and the project memory; list for Anthony the new copy to read (Marketing, About, Privacy, the form messages) and the three open questions.

---

### Task 12: The full dashboard on the home page

*Added 2026-11-19 after tier 1 was on staging. Anthony: "Put the full dashboard on the home page too."*

The home page keeps the hero from the approved mockup (photo, headline, the compact board). The full dashboard, the same one the Platform page shows, gets its own section directly under the proof strip. Both boards on the home page are driven by one sample day, so their figures always agree.

**Files:**
- Create: `src/demo/home-live.js`, `tests/home-live.test.js`
- Modify: `index.html` (the new section), `src/entry/home.js`, `src/demo/board-view.js` and `src/demo/dashboard-view.js` (each exposes a view that can be driven from outside; `mountBoard` and `mountDashboard` keep working as they do now), `build/pages.js` (home `styles` adds `/src/styles/dashboard.css`), `src/styles/home.css` (the section), `src/styles/dashboard.css` or `src/styles/platform.css` only if a layout rule the board needs lives in `platform.css` today and must be shared, `tests/home.test.js`, `tests/no-js.test.js`

**Interfaces:**
- Consumes: `createDashState`, `advance`, `dashSnapshot` from `src/demo/dashboard-engine.js`; `snapshot` from `src/demo/board-engine.js`; `renderBoardInner`, `boardFigures`, `feedRowHTML` from `src/demo/board-markup.js`; the dashboard's markup and in-place update code in `src/demo/dashboard-view.js`; `<!--site:board-->` and `<!--site:dashboard-->`.
- Produces:
  ```js
  // src/demo/board-view.js
  export function createBoardView(el, { feedSize = 3 } = {}): { render(boardState): void }       // updates the served board in place
  export function mountBoard(el, opts)                                                            // unchanged behavior, now built on createBoardView

  // src/demo/dashboard-view.js
  export function createDashboardView(el): { render(dashSnapshot): void, settle(): void, destroy(): void }   // settle() finishes any count-up at once
  export function mountDashboard(el, opts)                                                         // unchanged behavior, now built on createDashboardView

  // src/demo/home-live.js
  export function mountHomeLive({ boardEl, dashEl, intervalMs = 1700, rng = Math.random } = {}): { tick(): void, destroy(): void }
  ```
  `mountHomeLive` holds one dashboard state. Each tick advances it once and renders both views from it: the dashboard from `dashSnapshot(state)`, the compact board from the board state inside it. Either element may be missing; the other still works.

- [ ] **Step 1: Write the failing tests.**

`tests/home-live.test.js` (fake timers; render the home page with `renderPage`, load it into the document):
```js
it('one tick moves both boards and their figures agree', () => {
  // after 25 ticks with mulberry32(5) and reduced motion on (so the dashboard's figures do not count up):
  // compact "Tickets sold today" === dashboard "Tickets today"; compact "Scanned in" === dashboard "Admitted";
  // compact "Sales today" === dashboard "Gross today" (both whole dollars);
  // compact Online share === the dashboard's Online card share; compact Box office share === Box-office card + Cash shares;
  // the compact feed's first row names the same sale as the dashboard's first "Latest sales" row
});
it('there is one timer: a tick interval produces exactly one sale on both boards', () => {});
it('keeps ticking while either board is on screen, stops when neither is, and does not catch up', () => {
  // stubbed IntersectionObserver: hero board visible + dashboard off screen -> ticks; both off -> none for 60 s;
  // dashboard visible again -> exactly one sale per interval
});
it('stops while the tab is hidden and does not catch up afterwards', () => {});
it('a missing dashboard element still leaves a working compact board, and the reverse', () => {});
it('destroy() stops everything; a later tick() does nothing', () => {});
```

`tests/home.test.js`, add:
```js
it('shows the full dashboard in its own section under the proof strip', () => {
  // order in <main>: hero, .proof, section#live-board, the "Sell. Scan. Count." section
  // section#live-board: kicker 'Live dashboard'; h2 'Every ticket, as it happens.';
  // lede 'Real-time validation. 24/7 dashboard. Watch tickets sold, scanned in and sales as they happen.';
  // contains [data-dashboard][data-sample]; ends with a[href="#talk"] "Let's talk about your fair"
  // the hero still contains [data-board] and 'Running right now'
});
```
`tests/no-js.test.js`, add: the home page as served contains the dashboard with `3,947` and `$61,284`, and the compact board with the same two figures.

- [ ] **Step 2: Run** the new and changed test files. Expected: FAIL.

- [ ] **Step 3: Split each view from its timer.** `createBoardView` is the in-place update `mountBoard` does today (three figures, two bars, one new feed row in, the oldest out), taking a board state; it must add a row only when the newest sale changed, so rendering the same state twice changes nothing. `createDashboardView` is the dashboard's existing in-place update, taking a snapshot. `mountBoard` and `mountDashboard` become: create the state, create the view, tick on a timer through `runWhileVisible`. Their existing tests must pass unchanged.

- [ ] **Step 4: Implement `mountHomeLive`.** One state from `createDashState()`, one `setInterval`. It runs while the tab is visible and at least one of the two elements is on screen (an `IntersectionObserver` on each; with no `IntersectionObserver`, treat both as on screen). When the dashboard is off screen its figures are set without the count-up (`settle()`), so no animation frame runs for something nobody sees. After `destroy()` nothing runs.

- [ ] **Step 5: Write the section** in `index.html`, directly after the proof strip and before the "Sell. Scan. Count." section:
  - `<section class="sec live-board" id="live-board" aria-labelledby="live-board-h">`
  - kicker "Live dashboard"; `<h2 id="live-board-h">Every ticket, as it happens.</h2>`; lede "Real-time validation. 24/7 dashboard. Watch tickets sold, scanned in and sales as they happen."
  - `<!--site:dashboard-->`
  - a link to `#talk` reading "Let's talk about your fair", with the drawn arrow.
  The board uses the full width of the page wrap with its monitor frame on computers, and is the dark rounded card with stacked panels on phones, exactly as on the Platform page. `src/entry/home.js` calls `mountHomeLive` with the hero's `[data-board]` and the section's `[data-dashboard]`, guarded so a failure leaves both boards as served and the rest of the page working.

- [ ] **Step 6: Run** `npm test`. Expected: PASS, exit 0.

- [ ] **Step 7: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs --widths 360,390,768,1024,1280,1440 /` and again with `--nojs`. The hero is unchanged from before this task (compare the first screen at 1280 and 390 with `.superpowers/shots/final/home-1280-part1.png` and `home-390-part1.png`). The dashboard section matches the Platform page's board. No sideways scroll at 360. In a real browser, with the dashboard scrolled into view, the compact board's three figures and the dashboard's tiles show the same numbers (write a few lines of Playwright that read both after ten seconds and print them).

- [ ] **Step 8: Commit** `feat(home): the full live dashboard on the home page, on the same sample day as the hero board`.

---

### Task 13: The proof strip draws the eye

*Added 2026-11-19. Anthony, about the home page's proof strip: "lets add some animation and make the 40 years larger to draw more attention. Lets make the fairs used smaller".*

**Files:**
- Create: `src/proof-count.js`, `tests/proof-count.test.js`
- Modify: `index.html` (the proof strip's markup only), `src/styles/home.css` (the proof strip's rules only), `src/entry/home.js`, `tests/home.test.js`, `tests/no-js.test.js`

**Interfaces:**
- Produces:
  ```js
  // src/proof-count.js
  export function countFrames(to, steps): number[]          // whole numbers from 0 up to `to`: never decreasing, never above `to`, the last one exactly `to`
  export function initProofCount(doc = document, { reducedMotion, now } = {}): { destroy(): void }
  ```

**What changes, and what does not:**
- The words do not change: "40+", "years in the industry", and the sentence "The Florida State Fair, South Carolina State Fair and Coastal Carolina Fair all run their retail ticketing through EMC." stay exactly as they are, in the HTML as served. The three logos keep their size.
- "40+" becomes the strip's focal point: Bricolage Grotesque 700 in EMC red, 96px on computers (1001px and wider) and 72px on phones. "years in the industry" sits beside it at 22px (computers) and 19px (phones), weight 700, ink color, on at most two lines.
- The fairs sentence becomes smaller and quieter: 15px on computers and 14px on phones, muted color, line height 1.45, at most about 360px wide; the fair names stay semibold in ink.
- On computers the strip still overlaps the bottom of the hero by 44px and covers none of the hero's content.

**The animation** (once per page view, when at least 60% of the strip is on screen; if it is already on screen at load, after 300 ms):
1. The number counts from 0 up to 40 in about 1.2 seconds, fast at first and settling at the end.
2. The "+" pops in (from 60% size to full, with a slight overshoot, about 250 ms).
3. A marker underline in the site's highlight yellow (`#ffd66b`) draws from left to right under "40+" in about 500 ms.
4. "years in the industry" slides up 8px and fades in; then the fairs sentence and the logos fade in, 150 ms apart.
It plays once and never loops.

**Rules for the animation:**
- The page as served shows the final state: "40+" with its underline, everything visible. The script first "arms" the strip (sets the starting state), then plays. If the script fails or never loads, nothing is hidden. A safety timer forces the final state 2.5 seconds after arming, whatever happened.
- With reduced motion, with no `IntersectionObserver`, or with JavaScript off: the final state at once, no animation.
- The digits use tabular figures and the number keeps the width of "40" throughout, so nothing moves while it counts.
- The number never shows more than 40 and always ends on exactly 40, also if the tab is hidden or the strip leaves the screen while it is counting.
- A screen reader reads "40+ years in the industry" once. The animated digits are hidden from assistive technology (`aria-hidden="true"`) beside a visually hidden "40+"; nothing has `aria-live`.

- [ ] **Step 1: Write the failing tests.**

`tests/proof-count.test.js`:
```js
it('counts from 0 to the target without ever passing it', () => {
  const f = countFrames(40, 72);
  expect(f[0]).toBe(0); expect(f.at(-1)).toBe(40); expect(f).toHaveLength(72);
  for (let i = 1; i < f.length; i++) { expect(f[i]).toBeGreaterThanOrEqual(f[i - 1]); expect(f[i]).toBeLessThanOrEqual(40); }
  expect(Number.isInteger(f[30])).toBe(true);
});
it('a single step goes straight to the target', () => { expect(countFrames(40, 1)).toEqual([40]); });
it('as served, the strip reads 40+ and nothing is hidden', () => {
  // rendered home page: the strip's visible text contains '40+' and 'years in the industry'; no element in it has hidden, opacity 0 inline, or an "armed" class
});
it('with reduced motion it shows the final state at once and never arms', () => {});
it('with no IntersectionObserver it shows the final state at once', () => {});
it('plays once when the strip comes into view and ends on exactly 40', () => {
  // stubbed IntersectionObserver and requestAnimationFrame with fake timers: arm -> in view -> digits pass through values <= 40 -> end '40'; the strip gets its "done" class
});
it('does not play again when the strip leaves and re-enters the screen', () => {});
it('finishes on 40 if the tab is hidden while counting', () => {});
it('the safety timer forces the final state if the strip never reports being in view', () => { /* 2.5 s after arming: final state, digits '40' */ });
it('a screen reader gets "40+" once: the animated digits are aria-hidden beside a visually hidden 40+', () => {});
it('destroy() cancels frames, timers and the observer and leaves the final state', () => {});
```

`tests/home.test.js`: the existing proof-strip test keeps passing (same three texts, same logos). `tests/no-js.test.js`, add: the home page as served shows "40+" in the proof strip with nothing in the strip hidden.

- [ ] **Step 2: Run** the new test file. Expected: FAIL.
- [ ] **Step 3: Implement** the markup change, the styles and `src/proof-count.js`; `src/entry/home.js` calls `initProofCount()` guarded like its other steps.
- [ ] **Step 4: Run** `npm test`. Expected: PASS, exit 0.
- [ ] **Step 5: Look at it.** `npm run dev`; screenshots of the strip at 360, 390, 768, 1024, 1280 x 800, 1366 x 650, 1440 x 900 and 1920 x 1080, in its final state and (with a few lines of Playwright) at three moments of the animation; with `--nojs`; with reduced motion. "40+" must be the first thing the eye lands on in the strip; the strip must not cover the hero's buttons or board at any of those sizes.
- [ ] **Step 6: Commit** `feat(home): the proof strip leads with a large animated 40+ and a quieter fairs line`.
