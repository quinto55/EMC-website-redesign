# Visual Identity Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the EMC site an ownable identity: Fraunces display type, ticket-stub cards, a disciplined ride-light magenta accent, cinematic sub-page heroes, crafted icons, an upgraded footer, and a real fairs-served strip.

**Architecture:** CSS/markup-only changes layered onto the existing effect system. Fraunces is self-hosted and applied through a `--font-display` token; the ticket motif is a markup element + pure CSS (dashed divider + notch circles); sub-pages swap their video-card grid for a shared `.subhero--cinematic` full-bleed block; everything else is targeted markup/CSS edits. No JS module changes, no new npm dependencies.

**Tech Stack:** Vite 5, vanilla CSS (existing tokens system), Google Fonts static woff2 (self-hosted), vitest (suite must stay green, unmodified).

**Spec:** `docs/superpowers/specs/2026-07-17-visual-identity-upgrade-design.md`

## Global Constraints

- All 61 existing tests pass UNMODIFIED (`npm test`); no JS files change in Tasks 1–5.
- No new npm dependencies; fonts are self-hosted files in `public/fonts/` (two latin woff2, combined ≤ ~200KB).
- Fraunces goes ONLY on: `h1, h2, h3`, `.hero__brand`, `.intro__letters`, `.forty__digits`, `.flight__beat h2` (italic). Everything else stays Inter Tight (body, eyebrows, buttons, nav, captions, pillars, footer text — footer `h4` headings stay Inter Tight).
- Magenta token exact value: `--ride: #ff4d9e`. Allowed uses (complete list): nav link hover, footer link hover, card hover box-shadow tint, flight scroll-cue color. Nothing else.
- Ticket motif appears ONLY on the four homepage What We Do cards + the `ADMIT ONE` micro-eyebrow in the homepage intake section.
- Fairs strip copy exact: eyebrow `Trusted by the nights you know`; names in order: `Florida State Fair`, `Country Thunder`, `South Carolina State Fair`, `Coastal Carolina State Fair`.
- Sub-page videos keep class `subhero__video-el` (sub.js's `initAutoplayVideos('video.subhero__video-el')` must keep working unchanged).
- Reduced-motion behavior unchanged (sub-page videos stay hidden under reduce, as today).
- `public/type-test.html` is deleted in Task 5.
- reveal-hero.html is NOT touched (unlinked preview page).
- Commit after every task with the exact message given.

---

### Task 1: Fraunces type foundation

**Files:**
- Create: `public/fonts/fraunces-var.woff2`, `public/fonts/fraunces-italic-var.woff2` (downloaded)
- Modify: `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/hero.css`, `src/styles/intro.css`, `src/styles/forty.css`, `src/styles/experience.css`
- Modify (preload links): `index.html`, `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `contact.html`, `experience.html`

**Interfaces:**
- Produces: `--font-display` CSS token; `@font-face` family name `Fraunces` (weights 100–900 variable, normal + italic). Tasks 2–5 may set `font-family: var(--font-display)`.

- [ ] **Step 1: Download the latin variable woff2 files**

```bash
cd "/mnt/c/Users/Anthony Quintana/projects/EMC-website-redesign"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
CSS=$(curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&display=swap")
# The css2 payload contains one block per subset; take the /* latin */ block's url for each style.
echo "$CSS" | grep -A 12 "/\* latin \*/" | grep -o "https://fonts.gstatic.com[^)]*" | head -2
```
Expected: two `https://fonts.gstatic.com/...woff2` URLs (first = roman latin, second = italic latin — verify by their position after each `/* latin */` marker; the css2 response lists all `font-style: normal` blocks first, then all `font-style: italic`). Download them:
```bash
curl -s -o public/fonts/fraunces-var.woff2 "<roman latin url>"
curl -s -o public/fonts/fraunces-italic-var.woff2 "<italic latin url>"
file public/fonts/fraunces-*.woff2 && ls -la public/fonts/
```
Expected: both identified as `Web Open Font Format (Version 2)`, each roughly 40–120KB. If either is missing or not woff2, STOP and report BLOCKED.

- [ ] **Step 2: Declare the faces and token**

In `src/styles/tokens.css`, directly below the existing Inter Tight `@font-face`, add:

```css
@font-face {
  font-family: 'Fraunces';
  src: url('/fonts/fraunces-var.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Fraunces';
  src: url('/fonts/fraunces-italic-var.woff2') format('woff2');
  font-weight: 100 900;
  font-style: italic;
  font-display: swap;
}
```

And inside `:root`, alongside the existing tokens, add:

```css
  --font-display: 'Fraunces', Georgia, serif;
```

- [ ] **Step 3: Apply the display face**

1. `src/styles/base.css` — the heading reset currently reads:
```css
h1, h2, h3, h4 { margin: 0; font-weight: 700; letter-spacing: -0.01em; }
```
Replace with:
```css
h1, h2, h3, h4 { margin: 0; font-weight: 700; letter-spacing: -0.01em; }
h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: 0;
}
h1 { font-weight: 700; }
```
(h4 deliberately keeps Inter Tight.)

2. `src/styles/hero.css` — in `.hero__brand`, add `font-family: var(--font-display);` (keep `font-weight: 900;`).

3. `src/styles/intro.css` — `.intro__letters` currently sets `font-family: 'Inter Tight', system-ui, sans-serif;` → change to `font-family: var(--font-display);` (keep weight 900).

4. `src/styles/forty.css` — `.forty__digits` currently sets `font-family: 'Inter Tight', system-ui, sans-serif;` → change to `font-family: var(--font-display);` (keep weight 800 and `font-variant-numeric: tabular-nums`).

5. `src/styles/experience.css` — in the `.flight__beat h2` rule, add `font-style: italic;`.

- [ ] **Step 4: Preload on all seven pages**

In each of `index.html`, `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `contact.html`, `experience.html`, add directly after the `<link rel="icon" ...>` line:

```html
  <link rel="preload" href="/fonts/fraunces-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/fraunces-italic-var.woff2" as="font" type="font/woff2" crossorigin>
```

Note: the italic preload is used immediately only on experience.html; on other pages it warms the cache for navigation. This is accepted by design — do not conditionally include it.

- [ ] **Step 5: Verify**

Run: `npm test` → 61/61 pass. Run: `npm run build` → clean; `dist/` contains both woff2 files. Run: `curl -s http://localhost:5173/ | grep -c "fraunces"` → expected `2`.

- [ ] **Step 6: Commit**

```bash
git add public/fonts src/styles/tokens.css src/styles/base.css src/styles/hero.css src/styles/intro.css src/styles/forty.css src/styles/experience.css index.html what-we-do.html sell-onsite.html sell-online.html sell-social.html contact.html experience.html
git commit -m "feat(type): self-hosted Fraunces display face across headlines, brand, intro, digits, beats"
```

---

### Task 2: Ticket-stub cards + ADMIT ONE

**Files:**
- Modify: `index.html` (4 cards + intake section), `src/styles/sections.css`

**Interfaces:**
- Consumes: nothing new. Produces: `.card__perf` element/CSS (used only here).

- [ ] **Step 1: Add the perforation element to each card**

In `index.html`, inside EACH of the four `<article class="card" data-hotspot data-reveal>` blocks, insert directly after the closing `</svg>` of the card icon:

```html
            <div class="card__perf" aria-hidden="true"></div>
```

- [ ] **Step 2: Ticket CSS**

In `src/styles/sections.css`, after the `.card:hover::after` rule, add:

```css
/* Ticket-stub perforation: dashed tear line bleeding to the card edges,
   with a punched semicircular notch at each end (page background shows
   through, reading as a die-cut). */
.card__perf {
  position: relative;
  height: 0;
  border-top: 2px dashed rgba(255, 255, 255, 0.16);
  margin: 20px -28px;
}

.card__perf::before,
.card__perf::after {
  content: '';
  position: absolute;
  top: -8px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg);
  border: 1px solid var(--border);
}

.card__perf::before { left: -8px; }
.card__perf::after { right: -8px; }
```

Also remove the now-superfluous `margin-bottom: 18px;` from `.card__icon` (the perf element owns the spacing now).

- [ ] **Step 3: ADMIT ONE eyebrow**

In `index.html`'s intake section, directly above `<h2 id="intake-title">`, add:

```html
        <span class="intake__admit" aria-hidden="true">Admit One</span>
```

In `src/styles/sections.css`, before the `.intake h2` rule, add:

```css
.intake__admit {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  font-size: 11px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--gold-deck);
  margin-bottom: 14px;
}

.intake__admit::before,
.intake__admit::after {
  content: '';
  width: 26px;
  height: 1px;
  background: var(--gold-deck);
}
```

- [ ] **Step 4: Verify**

`npm test` → 61/61. `curl -s http://localhost:5173/ | grep -c "card__perf"` → `4`; `curl -s http://localhost:5173/ | grep -c "intake__admit"` → `1`.

- [ ] **Step 5: Commit**

```bash
git add index.html src/styles/sections.css
git commit -m "feat(cards): night-ticket stub perforation and ADMIT ONE intake eyebrow"
```

---

### Task 3: Ride-light magenta accent

**Files:**
- Modify: `src/styles/tokens.css`, `src/styles/sections.css`, `src/styles/experience.css`

**Interfaces:**
- Produces: `--ride` token. The four allowed usages below are the COMPLETE set.

- [ ] **Step 1: Token**

In `src/styles/tokens.css` `:root`, after `--red: #C8102E;`, add:

```css
  --ride: #ff4d9e;
```

- [ ] **Step 2: The four applications**

1. `src/styles/sections.css` — nav hover currently:
```css
.site-nav__links a:hover,
.site-nav__links a.is-active {
  color: var(--text);
}
```
Replace with:
```css
.site-nav__links a:hover { color: var(--ride); }
.site-nav__links a.is-active { color: var(--text); }
```

2. `src/styles/sections.css` — footer hover currently `.site-footer__col a:hover { color: var(--gold-1); }` → change to `color: var(--ride);`.

3. `src/styles/sections.css` — `.card:hover` box-shadow currently:
```css
  box-shadow: 0 20px 60px -30px var(--accent-glow);
```
Replace with:
```css
  box-shadow:
    0 20px 60px -30px var(--accent-glow),
    0 10px 44px -26px rgba(255, 77, 158, 0.35);
```

4. `src/styles/experience.css` — `.flight__cue` currently `color: rgba(255, 255, 255, 0.75);` → change to `color: var(--ride);`.

- [ ] **Step 3: Verify**

`npm test` → 61/61. `grep -c "var(--ride)" src/styles/sections.css src/styles/experience.css` → `3` and `1`.

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css src/styles/sections.css src/styles/experience.css
git commit -m "feat(accent): ride-light magenta token on hover states and flight cue"
```

---

### Task 4: Cinematic sub-page subheroes

**Files:**
- Modify: `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `contact.html`, `src/styles/sections.css`

**Interfaces:**
- Consumes: `--font-display` (via h1, automatic). The `<video>` MUST keep class `subhero__video-el` (sub.js contract).

- [ ] **Step 1: Rewrite each page's subhero section**

Every sub-page currently has this shape (unique text/video per page):

```html
    <section class="subhero">
      <div class="container subhero__grid">
        <div class="subhero__head">
          <span class="eyebrow">…</span>
          <h1>…</h1>
          <p>…</p>
        </div>
        <div class="subhero__video">
          <video class="subhero__video-el" aria-hidden="true" autoplay muted loop playsinline preload="auto"
                 src="…"></video>
          <div class="subhero__video-tint" aria-hidden="true"></div>
        </div>
      </div>
    </section>
```

Replace it on EACH of the five pages with this shape, PRESERVING that page's own eyebrow text, h1 (including its `gold-text` span), paragraph, and video src EXACTLY as they are today:

```html
    <section class="subhero subhero--cinematic">
      <video class="subhero__video-el" aria-hidden="true" autoplay muted loop playsinline preload="auto"
             src="…same URL as before…"></video>
      <div class="subhero__scrim" aria-hidden="true"></div>
      <div class="container subhero__head" data-reveal>
        <span class="eyebrow">…same…</span>
        <h1>…same…</h1>
        <p>…same…</p>
      </div>
    </section>
```

Worked example — `what-we-do.html`:

```html
    <section class="subhero subhero--cinematic">
      <video class="subhero__video-el" aria-hidden="true" autoplay muted loop playsinline preload="auto"
             src="https://videos.pexels.com/video-files/33945522/14403884_2560_1440_60fps.mp4"></video>
      <div class="subhero__scrim" aria-hidden="true"></div>
      <div class="container subhero__head" data-reveal>
        <span class="eyebrow">What We Do</span>
        <h1><span class="gold-text">Sales. Scanning.</span> Marketing. Advertising.</h1>
        <p>One company, four disciplines, one continuous operation that puts more wristbands on guests and more revenue in the books.</p>
      </div>
    </section>
```

Per-page video URLs (must match what each page already uses — verify with grep, do not swap them):

| Page | video src |
|---|---|
| what-we-do.html | https://videos.pexels.com/video-files/33945522/14403884_2560_1440_60fps.mp4 |
| sell-onsite.html | https://videos.pexels.com/video-files/29831559/12812338_2560_1440_30fps.mp4 |
| sell-online.html | https://videos.pexels.com/video-files/26575927/11962986_2560_1440_30fps.mp4 |
| sell-social.html | https://videos.pexels.com/video-files/30328849/13000585_1920_1080_30fps.mp4 |
| contact.html | https://videos.pexels.com/video-files/30334108/13003287_1920_1080_30fps.mp4 |

- [ ] **Step 2: CSS — cinematic block, retire the card styles**

In `src/styles/sections.css`:

1. After the existing `.subhero` rule, add:

```css
.subhero--cinematic {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  min-height: 62vh;
  display: flex;
  align-items: flex-end;
  padding: 144px 0 56px;
}

.subhero--cinematic .subhero__video-el {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.subhero__scrim {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(5,7,15,0.6) 0%, rgba(5,7,15,0.25) 40%, rgba(5,7,15,0.72) 85%, rgba(5,7,15,0.9) 100%),
    radial-gradient(ellipse 70% 50% at 50% 100%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 60%);
}

.subhero--cinematic .subhero__head h1 { max-width: 18ch; }
.subhero--cinematic .subhero__head p { max-width: 52ch; font-size: var(--fs-18); }
```

2. Delete the now-dead rules: `.subhero__grid`, `.subhero__video`, `.subhero__video-tint`, and the `.subhero__grid`/`.subhero__video` lines inside the `@media (max-width: 768px)` block. KEEP `.subhero` (padding/border base), `.subhero__head h1/p`, `.subhero__video-el` base opacity/is-ready rules, and the reduced-motion `display:none` for `.subhero__video-el`.

Note: `.subhero__video-el` base rule sets `position: absolute; inset: 0;` already — confirm after deletion that the remaining rules still give the cinematic block a working video layer (the `.subhero--cinematic .subhero__video-el` rule above re-states positioning defensively, so removal order can't break it).

- [ ] **Step 3: Verify**

`npm test` → 61/61 (sub.js untouched). For each of the five pages: `curl -s http://localhost:5173/<page> | grep -c "subhero--cinematic"` → `1`, and `grep -c "subhero__video-el"` → `1`. Confirm zero occurrences of `subhero__grid` remain: `grep -rn "subhero__grid" *.html src/styles/` → no output.

- [ ] **Step 4: Commit**

```bash
git add what-we-do.html sell-onsite.html sell-online.html sell-social.html contact.html src/styles/sections.css
git commit -m "feat(subpages): full-bleed cinematic subheroes replace video cards"
```

---

### Task 5: Icons, footer, fairs strip, cleanup

**Files:**
- Modify: `index.html` (icons + fairs strip + footer), `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `contact.html`, `experience.html` (footer), `src/styles/sections.css`
- Delete: `public/type-test.html`

**Interfaces:**
- Consumes: `--font-display` (fairs names, footer brand). No new tokens.

- [ ] **Step 1: Replace the four card icons**

In `index.html`, replace each card's `<svg class="card__icon">…</svg>` with the matching icon below (same order as the cards appear: Presale & Advance, Marketing & Ads, Redemption & Gate, Social Management). All share: `viewBox="0 0 40 40"`, `fill="none"`, `stroke="url(#gold-grad)"`, `stroke-width="2"`, round caps/joins.

Presale & Advance — ticket with die-cut notches and a stub line:
```html
            <svg class="card__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 12h28v6a3 3 0 0 0 0 6v6H6v-6a3 3 0 0 0 0-6z"/>
              <path d="M25 12v3M25 19v3M25 26v3" stroke-dasharray="2 3"/>
            </svg>
```

Marketing & Ads — megaphone with sound arcs:
```html
            <svg class="card__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M7 17v8l14 5V12z"/>
              <path d="M7 17H5v8h2M12 27v6h5v-4"/>
              <path d="M26 15a7 7 0 0 1 0 12M29 11a12 12 0 0 1 0 20"/>
            </svg>
```

Redemption & Gate — scan frame with beam:
```html
            <svg class="card__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 14v-4a2 2 0 0 1 2-2h4M26 8h4a2 2 0 0 1 2 2v4M32 26v4a2 2 0 0 1-2 2h-4M14 32h-4a2 2 0 0 1-2-2v-4"/>
              <path d="M6 20h28"/>
            </svg>
```

Social Management — two speech bubbles:
```html
            <svg class="card__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 10h18v11H12l-6 5z"/>
              <path d="M28 16h6v11h-3l-4 4v-4h-7v-4"/>
            </svg>
```

- [ ] **Step 2: Fairs strip on the homepage**

In `index.html`, between the partners `</section>` and the What We Do `<section ... id="what-we-do">`, insert:

```html
    <section class="fairs" aria-label="Events EMC has powered">
      <div class="container">
        <p class="eyebrow fairs__eyebrow" data-reveal>Trusted by the nights you know</p>
        <p class="fairs__names" data-reveal>
          <span class="fairs__name">Florida State Fair</span>
          <span class="fairs__dot" aria-hidden="true">·</span>
          <span class="fairs__name">Country Thunder</span>
          <span class="fairs__dot" aria-hidden="true">·</span>
          <span class="fairs__name">South Carolina State Fair</span>
          <span class="fairs__dot" aria-hidden="true">·</span>
          <span class="fairs__name">Coastal Carolina State Fair</span>
        </p>
      </div>
    </section>
```

In `src/styles/sections.css`, after the partners marquee rules, add:

```css
/* Fairs strip — real events, typographic treatment */
.fairs { padding: 72px 0 24px; text-align: center; }

.fairs__eyebrow { display: block; margin-bottom: 18px; }

.fairs__names {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  gap: 12px 18px;
  margin: 0 auto;
  max-width: 900px;
}

.fairs__name {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 500;
  font-size: clamp(20px, 2.6vw, 30px);
  color: var(--text-muted);
}

.fairs__dot { color: var(--gold-deck); font-size: 22px; }
```

- [ ] **Step 3: Footer upgrade on all seven pages**

In each of `index.html`, `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `contact.html`, `experience.html`, inside `<div class="site-footer__grid">`, insert this brand column as the FIRST child:

```html
        <div class="site-footer__col site-footer__col--brand">
          <p class="site-footer__wordmark" aria-hidden="true">EMC<span>.</span></p>
          <p>One stop ticket sale management.</p>
          <p class="site-footer__pillars">Sales · Scanning · Marketing · Advertising</p>
        </div>
```

And replace the "More" column's list on every page with the full nav list:

```html
          <ul>
            <li><a href="/experience.html">Experience</a></li>
            <li><a href="/what-we-do.html">What We Do</a></li>
            <li><a href="/sell-onsite.html">Sell Onsite</a></li>
            <li><a href="/sell-online.html">Sell Online</a></li>
            <li><a href="/sell-social.html">Sell Social</a></li>
            <li><a href="/contact.html">Contact</a></li>
          </ul>
```

In `src/styles/sections.css`, update `.site-footer__grid` to four columns and add the brand styles — replace:
```css
.site-footer__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  margin-bottom: 48px;
}
```
with:
```css
.site-footer__grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 48px;
}

.site-footer__wordmark {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 34px;
  letter-spacing: -0.03em;
  color: var(--text);
  line-height: 1;
  margin-bottom: 12px;
}

.site-footer__wordmark span { color: var(--red); }

.site-footer__pillars {
  margin-top: 12px;
  font-size: var(--fs-12);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-dim);
}
```
And in the footer's `@media (max-width: 768px)` block, the existing `grid-template-columns: 1fr` already handles stacking — no change needed there.

- [ ] **Step 4: Delete the specimen**

```bash
rm public/type-test.html
```

- [ ] **Step 5: Verify**

`npm test` → 61/61. `npm run build` → clean. Checks:
- `curl -s http://localhost:5173/ | grep -c "fairs__name\b"` → `4` (names).
- `for p in index what-we-do sell-onsite sell-online sell-social contact experience; do curl -s "http://localhost:5173/${p/index/}" | grep -c "site-footer__wordmark"; done` — each page returns `1` (adjust the index URL to `/`).
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/type-test.html` → `404`.

- [ ] **Step 6: Commit**

```bash
git add index.html what-we-do.html sell-onsite.html sell-online.html sell-social.html contact.html experience.html src/styles/sections.css
git rm --cached public/type-test.html 2>/dev/null; true
git commit -m "feat(identity): crafted icons, fairs-served strip, brand footer; drop type specimen"
```
(`type-test.html` was never committed; the `rm` in Step 4 removes it from disk and the `git rm --cached … ; true` line is a no-op safeguard.)

---

### Task 6: QA sweep

**Files:** modify only if fixes are needed.

- [ ] **Step 1: Suite + build + preview**

`npm test` → 61/61. `npm run build` → clean. `npm run preview` → spot-check `/`, one sell page, `/experience.html`.

- [ ] **Step 2: Behavior matrix (browser)**

| Check | Expected |
|---|---|
| Homepage | Fraunces on EMC. wordmark/headings; intro letters serif; ticket perforations + notches on 4 cards; new icons; fairs strip italic names; ADMIT ONE above intake button |
| Hovers | Nav links + footer links magenta; card shadow gains magenta tint; gold shimmer unchanged |
| Sub-pages ×5 | Full-bleed video subhero, readable h1 over scrim, video fades in (is-ready), no leftover video card |
| Experience | Beat headlines italic Fraunces; cue magenta; flight unchanged |
| 40 scene | Digits render in Fraunces, mask still clips correctly |
| Reduced motion | Sub-page videos hidden; all pages readable; no regressions |
| Mobile 375px | Footer stacks; fairs names wrap; subheroes legible |
| Fonts | No FOIT; preload warnings absent in console |

- [ ] **Step 3: Commit fixes if any**

```bash
git add -A && git commit -m "fix(identity): QA polish"
```
