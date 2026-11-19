# EMC Site Relaunch, Tier 1 (go-live essentials) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the July carnival-ticket site in this repo with the "Sunny board" relaunch: nine pages, a working contact form, the live sample board, two demos, the `/iafe/` landing page, staging, and the package that puts the site on the current web host beside WordPress.

**Architecture:** Static HTML pages in directories, built by Vite as a multi-page site. A small build step (`build/render.js`, run by a Vite plugin and by the tests) fills each page's head, header, footer and ask band from one page registry, so shared parts cannot drift. All behavior is plain ES modules: pure logic modules with unit tests, and thin view modules that mount them. Every page is complete without JavaScript.

**Tech Stack:** Vite 5 (multi-page), Vitest + happy-dom, sharp (images and icons), no framework, no runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-18-site-relaunch-design.md`. Look reference: `docs/superpowers/specs/assets/2026-11-18-site-relaunch/mockup.html` (the `.d2` and `.bg-b` rules are the approved look; ignore `.bg-a`, `.bg-c`, `.bg-d`, `.pick` and `.phones`).

**Scope:** Tier 1 of spec section 10. The curtain, the Box office, Gate scanning and Daily reports demos, the longer "For your guests" blocks and polish are tier 2 and 3, in a follow-up plan.

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
4. Until the tier 2 demos exist, the home page rows for Gate scanning and Daily reports read "See how", not "Try it" or "See one".
5. A plain sharing image in the new look ships in tier 1, so no page points at the old gold artwork.
6. `robots.txt` keeps today's WordPress rules and names the new `sitemap.xml`.
7. Staging is a `--mode staging` build: every page `noindex`, `robots.txt` disallows everything.
8. The form's default HTML state is the fallback (an "Email Anthony" button and the toll-free number). JavaScript swaps in the form only when it can deliver or simulate.

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
  // 'Sell. Scan. Count.', 'Pick any tool and try it yourself. No sign-up.'
  // 01 Sell 'Online, at the window and in stores.': Online sales -> /platform/#online-sales 'Try it'; Box office POS -> /platform/#box-office 'Try it'; Retail stores -> /retail-partners/ 'See how'
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

- [ ] **Step 4: Write `index.html` and `home.css`** from the mockup's `.bg-b` layout: the hero block holds the photo (`<picture>` positioned behind, with the mockup's two gradients over it), the header include inside the hero's `.wrap`, the copy on the left and the board with its "Running right now" chip on the right; on computers the hero fills the window height (minimum 640px) and the proof strip overlaps its bottom edge by 44px; on phones (1000px and under) the photo covers only the top of the hero behind the copy, as in the mockup. Then the proof strip, the Sell, Scan, Count section, the guest cards and the ask band. The "Tickets on sale at" label before the logos is visually hidden text. The `site-integrity` hash-link test will fail until Task 6 creates the ids; mark that one test `it.todo` with a comment naming Task 6 and nothing else.

- [ ] **Step 5: Run** `npm test`. Expected: PASS (one todo).

- [ ] **Step 6: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs /`. Compare with the mockup opened at `http://localhost:5173/docs/superpowers/specs/assets/2026-11-18-site-relaunch/mockup.html?cap=1` (computer) and `?cap=1&view=phones` (phone): same layout, type sizes and spacing; white text on the photo is readable everywhere; no sideways scroll at 360.

- [ ] **Step 7: Commit** `feat(relaunch): home page on the full photo with the live board`.

---

### Task 6: The platform page and the Live dashboard demo

**Files:**
- Create: `src/styles/platform.css`, `src/styles/demo.css`, `src/show.js`, `src/demo/pace.js`, `src/demo/dashboard-view.js`, `src/entry/platform.js`, `tests/show.test.js`, `tests/pace.test.js`, `tests/dashboard-view.test.js`, `tests/platform.test.js`
- Rewrite: `platform/index.html`
- Modify: `build/pages.js` (platform `styles` adds board, demo and platform CSS; `entry` `/src/entry/platform.js`), `tests/site-integrity.test.js` (restore the hash-link test)

**Interfaces:**
- Consumes: board engine, `runWhileVisible`, `count`, `money`.
- Produces:
  ```js
  // src/show.js
  export const SHOW = { booth: '#410', city: 'Louisville', firstDay: '2026-11-30', lastDay: '2026-12-01', timeZone: 'America/New_York' };
  export function showPhase(now = new Date()): 'before' | 'during' | 'after'     // by the calendar date in SHOW.timeZone
  export function boothLine(now = new Date()): string
  export function initShowNotes(doc = document, now = new Date()): void
  // initShowNotes: un-hides every [data-booth-note] in phases 'before' and 'during'; sets [data-booth-line] text to boothLine(now)

  // src/demo/pace.js
  export const DAY_START_MIN = 9 * 60, DAY_END_MIN = 23 * 60;
  export function shareBy(minute): number                       // share of the day's sales made by this minute: 0 at open, 1 at close, never decreasing
  export function paceSeries(ticketsNow, nowMinute): { minute: number, tickets: number }[]   // one point per half hour from open to now, ending at ticketsNow
  export function projectedTotal(ticketsNow, nowMinute): number // ticketsNow / shareBy(nowMinute), rounded to the nearest 50

  // src/demo/dashboard-view.js
  export function mountDashboard(el, { intervalMs = 1700, rng = Math.random, startMinute = 18 * 60 + 42 } = {}): { tick(): void, destroy(): void }
  ```
  `boothLine` strings, exactly: before `See us at Booth #410 in Louisville, Nov 30 to Dec 1`; during `We're at Booth #410 today`; after `Good to meet you in Louisville.`
- Page ids: `online-sales`, `box-office`, `retail`, `gate-scanning`, `rfid`, `live-dashboard`, `daily-reports`, `guests`, `guest-map`, `guest-pip`, `guest-call-line`. Task 7 fills the element `[data-demo="online-sales"]` inside `#online-sales`.

- [ ] **Step 1: Read the real product's board** for what it shows and how it words it: `~/projects/EMC-Ticketing-Platform/app/components/live/` (`counter.tsx`, `money.tsx`, `pace.tsx`, `gates.tsx`, `feed.tsx`). The demo may show only things found there, drawn in this site's look. Do not copy its styling, and do not show the weather, fraud, alerts, registers or brief panels.

- [ ] **Step 2: Write the failing tests.**

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

`tests/pace.test.js`: `shareBy` is 0 at open, 1 at close, never decreases across the day, and clamps outside it; `paceSeries(3947, 18 * 60 + 42)` never decreases and its last point is 3947; `projectedTotal` is a multiple of 50 and at least `ticketsNow`.

`tests/dashboard-view.test.js`: after mounting, the text holds "Demo County Fair, Friday", "Sample data", "Tickets sold today", "Scanned in", "Sales today", a pace heading starting "On pace for", the three gate names, and a feed of six; the root matches `[data-sample]`; `tick()` changes the figures; it stops when hidden and when off screen (same cases as the board); never shows a store channel.

`tests/platform.test.js` (rendered page): every id listed above exists; the copy in Step 4 is present exactly; the box office link is `https://app.emctickets.com/pos/tour` with `target="_blank"` and `rel` containing `noopener`; `#rfid` has no link and says "Later in 2027"; each of the four booth notes is `hidden` in the HTML and reads "See it at Booth #410"; `#online-sales` and `#live-dashboard` each end with a link to `#talk` reading "Let's talk about your fair".

- [ ] **Step 3: Run** the four new test files. Expected: FAIL.

- [ ] **Step 4: Write `platform/index.html`** with this copy, in this order. Each block is a `<section>` with the id shown; group labels use the numbered squares (01 Sell, 02 Scan, 03 Count).

  - Intro: kicker "The platform"; `<h1>Sell. Scan. Count.</h1>`; "One system from first ticket to final report. Pick any tool and try it yourself. No sign-up."; a row of jump links to the blocks.
  - **01 Sell**
    - `online-sales`: `<h2>Online sales</h2>`; "Online sales and flash sales, on any phone. Buyers pick their tickets, pay and get a QR ticket."; an empty `<div data-demo="online-sales"></div>` (Task 7) preceded for now by the line "Demo coming to this page."; then the `#talk` link. Task 7 removes the "Demo coming" line.
    - `box-office`: `<h2>Box office POS</h2>`; "Ring up a sale at the window. The register runs in a web browser on an iPad, so there is nothing to install. Tickets and the receipt print automatically."; link "Take the full box office tour" (new tab) with the note "Opens the real register with sample data."
    - `retail`: `<h2>Retail stores</h2>`; "EMC is the exclusive event ticket partner of Walgreens."; "8,000+ retail locations"; "Same benefits at Circle K and Menards."; link "See how retail works" to `/retail-partners/`.
  - **02 Scan**
    - `gate-scanning`: `<h2>Gate scanning</h2>`; "Any gate, duplicates blocked. Barcode or QR."; "A ticket gets in once. Scan it again and the gate sees it has already been used."
    - `rfid`: `<h2>RFID wristbands</h2>` with the amber tag "Later in 2027"; "RFID wristbands later in 2027."; booth note.
  - **03 Count**
    - `live-dashboard`: `<h2>Live dashboard</h2>`; "Real-time validation. 24/7 dashboard. Watch tickets sold, scanned in and sales as they happen."; `<div data-demo="live-dashboard"></div>`; the `#talk` link.
    - `daily-reports`: `<h2>Daily reports</h2>`; "Sales by ticket type and by channel, scans by gate, and the day's totals."
  - `guests`: `<h2>New for your guests</h2>`; three blocks: `guest-map` "Interactive fair map", "Your grounds on every phone."; `guest-pip` "Pip", "A talking AI clown for the front gate."; `guest-call-line` "Ticket-buyer call line", "Ticket answers by phone."; each with a booth note.
  - Booth note markup, hidden by default: `<p class="booth-note" data-booth-note hidden>See it at Booth #410</p>`.

- [ ] **Step 5: Implement `show.js`, `pace.js`, `dashboard-view.js` and `platform.js`.** `showPhase` formats `now` as a date in `SHOW.timeZone` with `Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })` and compares strings. The dashboard is a white card on the cream page: a head row (LIVE pill, "Demo County Fair, Friday", a sample clock that starts at 6:42 PM and runs in real time, the Sample data pill); three KPI tiles; a "Pace through the day" panel with the heading "On pace for N today" and an SVG line of `paceSeries` with a "Now" marker; a "Gates" panel listing each gate's admitted count; a "Latest sales" feed of six lines, each with the items, "place · tender" and the amount. On phones the panels stack. `platform.js` imports `./site.js`, calls `initShowNotes()`, and mounts the dashboard.

- [ ] **Step 6: Write `demo.css` and `platform.css`.** `demo.css` holds what every demo shares: the demo card, its caption row with the Sample data pill, the phone frame (`.frame-phone`, used by Task 7) and a tablet frame (`.frame-tablet`, for tier 2). `platform.css` holds the page layout and the dashboard.

- [ ] **Step 7: Restore the hash-link test** in `tests/site-integrity.test.js` (remove the `it.todo`). **Run** `npm test`. Expected: PASS.

- [ ] **Step 8: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs /platform/`. No sideways scroll at 360; the dashboard reads clearly at 390 and 1280 and ticks in a browser; the booth notes show (today is before the show).

- [ ] **Step 9: Commit** `feat(relaunch): platform page and the live dashboard demo`.

---

### Task 7: The Online sales demo

**Files:**
- Create: `src/demo/online-sales.js`, `src/demo/online-sales-view.js`, `scripts/build-sample-qr.mjs`, `public/emc-site/img/sample-ticket-qr.svg`, `tests/online-sales.test.js`, `tests/online-sales-view.test.js`
- Modify: `platform/index.html` (remove "Demo coming to this page."), `src/entry/platform.js`, `src/styles/demo.css`, `package.json` (dev dependency `qrcode`, script `sample-qr`), `tests/platform.test.js`

**Interfaces:**
- Consumes: `TICKET_TYPES`, `FAIR`, `money`; `[data-demo="online-sales"]`; `.frame-phone`.
- Produces:
  ```js
  // src/demo/online-sales.js
  export const STEPS = ['event', 'tickets', 'checkout', 'ticket'];
  export const MAX_PER_TYPE = 10;
  export const SAMPLE_BUYER = { name: 'Sam Sample', email: 'sam@example.com', card: 'Visa ending 4242' };
  export function initialState(): { step: 'event', cart: Record<string, number> }
  export function reduce(state, action): state
  // actions: { type: 'start' } | { type: 'add', id } | { type: 'remove', id } | { type: 'checkout' } | { type: 'pay' } | { type: 'back' } | { type: 'restart' }
  export function cartLines(state): { id, name, qty, price, lineTotal }[]
  export function cartTotal(state): number
  export function cartCount(state): number

  // src/demo/online-sales-view.js
  export function mountOnlineSales(el): { destroy(): void }
  ```

- [ ] **Step 1: Read the real storefront** for its steps, labels and layout: `~/projects/EMC-Ticketing-Platform/app/routes/$eventSlug.tsx`, `$eventSlug_.checkout.$checkoutId.tsx`, `app/components/storefront/ticket-card.tsx` and `ticket-stub.tsx`, and the screenshots in `/mnt/c/Users/Anthony Quintana/Desktop/EMC Storefront Cleanup Screens/` (`3-event-page-phone.png`, `4-event-page-phone-tickets-chosen.png`, `7-ticket-page-phone.png`). Follow its steps and wording in this site's look. Leave out its service fee line, its payment fields and its bot check.

- [ ] **Step 2: Write the failing tests.**

`tests/online-sales.test.js`:
```js
it('starts on the fair page with an empty cart', () => {});
it('start moves to tickets', () => {});
it('add and remove change the quantity within 0 and MAX_PER_TYPE', () => {
  // 11 adds of 'adult' -> 10; remove at 0 stays 0; an unknown id changes nothing
});
it('the total is the sum of the sample prices and nothing else', () => {
  // 2 adult + 1 wristband -> lines [24, 30], total 54
});
it('checkout needs at least one ticket', () => { /* 'checkout' with an empty cart stays on tickets */ });
it('pay moves from checkout to the ticket', () => {});
it('back steps one screen: checkout to tickets, tickets to event; nothing from event or ticket', () => {});
it('restart returns to the first screen with an empty cart from anywhere', () => {});
it('an action that does not apply to the current step returns the same state', () => { /* 'pay' on 'tickets', 'add' on 'ticket' */ });
```

`tests/online-sales-view.test.js`: mounting shows the fair page with "Demo County Fair" and "Sample data"; "Get tickets" shows the five ticket types with their sample prices; the plus button for Adult admission twice shows a total of "$24"; the Checkout button is disabled with an empty cart; checkout shows the sample buyer and "Visa ending 4242" as text with no `input` elements at all; "Pay $24" shows the ticket with the QR image, the text "Sample ticket. Not valid for entry." and no fee line anywhere (the text never matches `/fee/i`); "Start over" returns to the first screen; each step change moves focus to the step's heading; every control is a `button`; the root matches `[data-sample]`.

`tests/platform.test.js`, add: the page no longer says "Demo coming to this page."

- [ ] **Step 3: Run** the two new test files. Expected: FAIL.

- [ ] **Step 4: Build the QR.** `npm i -D qrcode`; `scripts/build-sample-qr.mjs` writes `public/emc-site/img/sample-ticket-qr.svg` encoding the text `EMC-SAMPLE-TICKET` (not a web address), dark `#1b1f2a` on white. Run it.

- [ ] **Step 5: Implement the reducer and the view.** The view renders a caption row ("Buy a ticket", Sample data pill), then a phone frame whose screen shows the current step: the fair page (name, "Friday", a "Get tickets" button); the ticket list (name, sample price, minus and plus buttons with `aria-label`s such as "Add one Adult admission", the quantity, a running total, "Checkout"); the checkout (order lines, total, the sample buyer and card as text, "Pay $N", "Back"); the ticket (fair name, the first line's ticket type, the QR, the sample notice, "Start over"). A step line under the frame ("Step 2 of 4") is an `aria-live="polite"` region.

- [ ] **Step 6: Run** `npm test`. Expected: PASS.

- [ ] **Step 7: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs /platform/`. In a browser, go through the four steps by keyboard only (Tab, Enter, Space). The frame fits a 360px phone without sideways scroll.

- [ ] **Step 8: Commit** `feat(relaunch): online sales demo`.

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
- [ ] **Step 2: Browser pass.** `npx vite preview`, then `node .superpowers/tools/shots.mjs --base http://localhost:4173` over all ten pages plus the Walgreens IAFE link. Expected: no page scrolls sideways at 360; look at every screenshot at 390 and 1280. Check by hand in the preview: the menu on a phone width, the form (simulate) on `/contact/`, both demos by keyboard, the cookie settings link, and the home page with JavaScript disabled.
- [ ] **Step 3: Try the host rules for real** if an Apache can be had without sudo (`apt-get download apache2-bin` and its libraries, unpacked under `~/.local`): serve `dist-host/` beside a fake WordPress (`index.php`, a root `.htaccess` holding the stock WordPress block, two fake event folders each with `index.php`), with the block on top, and run `check-live.mjs --post` against it. If Apache cannot be had in 20 minutes, record that the rules are checked only by the unit test and will be proven on the real host at go-live.
- [ ] **Step 4: Final whole-branch review** by a fresh reviewer against the spec and this plan. Fix what it finds.
- [ ] **Step 5:** Merge to `main` with `--no-ff`, run the tests on the merge, delete the branch, push `main` to origin (standing instruction).
- [ ] **Step 6: Staging:** `bash scripts/deploy-pages.sh`, then check `https://quinto55.github.io/` and `/iafe/` load and carry `noindex`.
- [ ] **Step 7:** Update the ledger and the project memory; list for Anthony the new copy to read (Marketing, About, Privacy, the form messages) and the three open questions.
