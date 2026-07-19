# Sub-Page Ticket Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The 16 feature tiles on the four product pages become scaled-down Carnival Classic tickets sharing the homepage cards' anatomy, per `docs/superpowers/specs/2026-07-18-subpage-ticket-parity-design.md`.

**Architecture:** Markup swap (tiles adopt the `.card card--mini` anatomy classes; `.feature*` classes retired), one CSS change-set in `sections.css` (transition-list union + `--mini` scale overrides + `.feature*` rule deletion), and a one-line JS wiring (`initHotspot()` in `sub.js`) for the cursor sheen. The site-wide serial roll and anatomy get locked by an extended markup test that parses all five HTML files.

**Tech Stack:** Static HTML + hand-written CSS (tokens in `:root`), Vite, Vitest with happy-dom.

## Global Constraints

- **Files touched, exhaustively:** `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `src/styles/sections.css`, `src/sub.js`, `tests/ticket-markup.test.js`. Nothing else — `index.html`, tokens, base.css, all other JS stay untouched.
- **Serials exact and sequential, `№` is U+2116:** homepage keeps № 047291–047294 (do not touch); what-we-do № 047295–047298; sell-onsite № 047299–047302; sell-online № 047303–047306; sell-social № 047307–047310 — in document order within each page. No duplicates site-wide.
- **All decorative elements carry `aria-hidden="true"`** (frame, rails, serial row, perforation).
- **`#gold-grad` SVG defs stay on every page**; icon `stroke="url(#gold-grad)"` attributes stay as the no-CSS fallback (CSS `stroke: var(--cream)` on `.card__icon` overrides them).
- **Homepage behavior must not change** except that `.card`'s transition list becomes the union (opacity/transform 700ms + translate/box-shadow 250ms) — on the GSAP path `.gsap-motion [data-reveal] { transition: none }` plus the existing scoped restore make this a no-op there.
- **`.feature-grid` and its ≤768px single-column rule stay** — only the tile-level `.feature*` rules are deleted.
- Full vitest suite green at every commit. Known pre-existing noise: one "ECONNREFUSED 127.0.0.1:3000" unhandled-error line (flight-scrub under happy-dom) — not yours to fix.

## File Structure

- **Modify 4 sub-page HTML files** — tile markup only (the `<article class="feature">` blocks inside `.feature-grid`).
- **Modify `src/styles/sections.css`** — `.card` transition line; new `.card--mini` block after the card hover/reduced-motion rules; delete `.feature`, `.feature:hover`, `.feature__icon`, `.feature__title`, `.feature__body`.
- **Modify `src/sub.js`** — import + call `initHotspot`.
- **Rewrite `tests/ticket-markup.test.js`** — same file, extended to all five pages (this also simplifies the path-resolution to the `new URL` form, closing a deferred finding from the homepage branch).

---

### Task 1: Tile markup conversion + site-wide ticket test

**Files:**
- Modify: `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html` (the four `<article class="feature" data-reveal>` blocks in each file's `.feature-grid`)
- Test: `tests/ticket-markup.test.js` (full rewrite, shown below)

**Interfaces:**
- Consumes: homepage anatomy class names already in production: `card`, `card__frame`, `card__rail`, `card__rail--l`, `card__rail--r`, `card__serial`, `card__perf`, `card__icon`, `card__title`, `card__body`.
- Produces: sub-page tiles carrying `class="card card--mini"` + `data-hotspot` — Task 2's `.card--mini` CSS and Task 3's `initHotspot()` wiring target exactly these.

- [ ] **Step 1: Rewrite the test file (failing first)**

Replace the entire contents of `tests/ticket-markup.test.js` with:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PAGES = [
  { file: 'index.html', container: '.cards', mini: false,
    serials: ['№ 047291', '№ 047292', '№ 047293', '№ 047294'] },
  { file: 'what-we-do.html', container: '.feature-grid', mini: true,
    serials: ['№ 047295', '№ 047296', '№ 047297', '№ 047298'] },
  { file: 'sell-onsite.html', container: '.feature-grid', mini: true,
    serials: ['№ 047299', '№ 047300', '№ 047301', '№ 047302'] },
  { file: 'sell-online.html', container: '.feature-grid', mini: true,
    serials: ['№ 047303', '№ 047304', '№ 047305', '№ 047306'] },
  { file: 'sell-social.html', container: '.feature-grid', mini: true,
    serials: ['№ 047307', '№ 047308', '№ 047309', '№ 047310'] },
];

const docs = PAGES.map((page) => {
  const html = readFileSync(new URL(`../${page.file}`, import.meta.url), 'utf8');
  return { ...page, doc: new DOMParser().parseFromString(html, 'text/html') };
});

describe('ticket anatomy site-wide', () => {
  for (const { file, container, doc } of docs) {
    it(`${file}: four ticket cards, full print detail, aria-hidden`, () => {
      const cards = [...doc.querySelectorAll(`${container} .card`)];
      expect(cards).toHaveLength(4);
      for (const card of cards) {
        expect(card.querySelector('.card__frame[aria-hidden="true"]')).not.toBeNull();
        expect(card.querySelectorAll('.card__rail[aria-hidden="true"]')).toHaveLength(2);
        expect(card.querySelector('.card__rail--l')).not.toBeNull();
        expect(card.querySelector('.card__rail--r')).not.toBeNull();
        expect(card.querySelector('.card__serial[aria-hidden="true"]')).not.toBeNull();
        expect(card.querySelector('.card__perf[aria-hidden="true"]')).not.toBeNull();
        expect(card.querySelector('.card__icon')).not.toBeNull();
        expect(card.querySelector('.card__title')).not.toBeNull();
        expect(card.querySelector('.card__body')).not.toBeNull();
      }
    });

    it(`${file}: serials continue the roll in document order`, () => {
      const found = [...doc.querySelectorAll(`${container} .card__serial span:last-child`)]
        .map((s) => s.textContent);
      expect(found).toEqual(docs.find((d) => d.file === file).serials);
    });
  }
});

describe('sub-page tiles are mini tickets', () => {
  for (const { file, container, doc } of docs.filter((d) => d.mini)) {
    it(`${file}: tiles carry card--mini, data-hotspot, data-reveal`, () => {
      for (const card of doc.querySelectorAll(`${container} .card`)) {
        expect(card.classList.contains('card--mini')).toBe(true);
        expect(card.hasAttribute('data-hotspot')).toBe(true);
        expect(card.hasAttribute('data-reveal')).toBe(true);
      }
    });

    it(`${file}: no legacy .feature tiles remain`, () => {
      expect(doc.querySelector('.feature')).toBeNull();
      expect(doc.querySelector('.feature__icon, .feature__title, .feature__body')).toBeNull();
    });
  }
});

describe('the roll', () => {
  it('all 20 serials are unique site-wide', () => {
    const all = docs.flatMap(({ doc }) =>
      [...doc.querySelectorAll('.card__serial span:last-child')].map((s) => s.textContent));
    expect(all).toHaveLength(20);
    expect(new Set(all).size).toBe(20);
  });
});
```

(Homepage `.cards` markup already passes every assertion aimed at it — this rewrite preserves that coverage while extending site-wide. The `.feature` absence check does NOT match `.feature-grid`: CSS class selectors match whole tokens only.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/ticket-markup.test.js`
Expected: FAIL — the four sub-page "four ticket cards" tests find 0 `.card` elements; homepage tests pass.

- [ ] **Step 3: Convert all 16 tiles**

In each of the four HTML files, apply this transformation to each of the four `<article class="feature" data-reveal>` blocks inside `<div class="feature-grid">`, in document order:

1. Opening tag: `<article class="feature" data-reveal>` → `<article class="card card--mini" data-hotspot data-reveal>`
2. Immediately after the opening tag, insert (serial from the table below):

```html
<span class="card__frame" aria-hidden="true"></span>
<span class="card__rail card__rail--l" aria-hidden="true">ADMIT&nbsp;ONE&nbsp;&#9733;</span>
<span class="card__rail card__rail--r" aria-hidden="true">ADMIT&nbsp;ONE&nbsp;&#9733;</span>
<div class="card__serial" aria-hidden="true"><span>EMC TICKETS</span><span>№ 047295</span></div>
```

3. `class="feature__icon"` → `class="card__icon"` (the SVG's other attributes, including `stroke="url(#gold-grad)"`, stay).
4. Immediately after the icon's closing `</svg>`, insert: `<div class="card__perf" aria-hidden="true"></div>`
5. `class="feature__title"` → `class="card__title"`
6. `class="feature__body"` → `class="card__body"`

Serial table (tile 1 = first in document order):

| File | tile 1 | tile 2 | tile 3 | tile 4 |
|---|---|---|---|---|
| what-we-do.html | № 047295 | № 047296 | № 047297 | № 047298 |
| sell-onsite.html | № 047299 | № 047300 | № 047301 | № 047302 |
| sell-online.html | № 047303 | № 047304 | № 047305 | № 047306 |
| sell-social.html | № 047307 | № 047308 | № 047309 | № 047310 |

`№` is the single character U+2116. Match each file's existing indentation. Note: until Task 2 lands, these tiles render as full-size homepage-style tickets in the browser — expected intermediate state, not a bug.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/ticket-markup.test.js`
Expected: PASS — 16 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm run test`
Expected: all 12 files pass (the pre-existing ECONNREFUSED line may appear; ignore).

- [ ] **Step 6: Commit**

```bash
git add what-we-do.html sell-onsite.html sell-online.html sell-social.html tests/ticket-markup.test.js
git commit -m "feat(subpages): tiles adopt ticket anatomy — card--mini markup, serials 047295–047310"
```

---

### Task 2: `.card--mini` CSS, transition union, `.feature` retirement

**Files:**
- Modify: `src/styles/sections.css` (three change-sets: `.card` transition line ~line 201; new `.card--mini` block after the card reduced-motion guard ~line 291; delete `.feature*` tile rules ~lines 542–566)

**Interfaces:**
- Consumes: Task 1's `card--mini` class on sub-page tiles; existing tokens `--red-glow`, `--ease`, `--fs-18`.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Union the `.card` transition list**

In the `.card` rule, replace:

```css
  transition: translate 250ms var(--ease), box-shadow 250ms var(--ease);
```

with:

```css
  transition:
    opacity 700ms var(--ease),
    transform 700ms var(--ease),
    translate 250ms var(--ease),
    box-shadow 250ms var(--ease);
```

(Why: sub-pages reveal via the legacy CSS path — base.css `[data-reveal] { transition: opacity 700ms ..., transform 700ms ... }` — and `.card`'s shorter list would override it by import order and snap the entrance. The union serves both. On the homepage GSAP path, `.gsap-motion [data-reveal] { transition: none }` suppresses everything and the existing `.gsap-motion .card[data-reveal]` restore re-enables only translate/box-shadow — homepage behavior unchanged.)

- [ ] **Step 2: Add the `.card--mini` scale overrides**

Directly after the block:

```css
@media (prefers-reduced-motion: reduce) {
  .card:hover { translate: none; }
}
```

insert:

```css
/* Scaled ticket for sub-page feature grids — anatomy inherited from .card. */
.card--mini {
  padding: 20px 44px;
  box-shadow: 0 16px 40px -18px var(--red-glow);
}

.card--mini:hover { box-shadow: 0 24px 52px -18px var(--red-glow); }

.card--mini .card__frame {
  inset: 6px;
  border-radius: 7px;
}

.card--mini .card__frame::before { border-radius: 5px; }

.card--mini .card__rail {
  width: 24px;
  top: 10px;
  bottom: 10px;
  font-size: 8px;
  letter-spacing: 0.38em;
}

.card--mini .card__rail--l { left: 6px; }
.card--mini .card__rail--r { right: 6px; }

.card--mini .card__serial {
  font-size: 9px;
  letter-spacing: 0.24em;
  margin-bottom: 10px;
}

.card--mini .card__icon {
  width: 28px;
  height: 28px;
}

.card--mini .card__title {
  font-size: var(--fs-18);
  margin-bottom: 6px;
}

.card--mini .card__perf { margin: 14px -44px; }

.card--mini .card__perf::before,
.card--mini .card__perf::after {
  width: 14px;
  height: 14px;
  top: -7px;
}

.card--mini .card__perf::before { left: -7px; }
.card--mini .card__perf::after { right: -7px; }
```

- [ ] **Step 3: Delete the retired `.feature` tile rules**

Delete exactly these five rules (currently ~lines 542–566). `.feature-grid` above them and `.stat-pull` below them stay:

```css
.feature {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 24px;
  transition: border-color 250ms var(--ease), box-shadow 250ms var(--ease);
}

.feature:hover {
  border-color: rgba(255, 214, 107, 0.35);
  box-shadow: 0 20px 60px -30px var(--accent-glow);
}

.feature__icon {
  width: 28px;
  height: 28px;
  margin-bottom: 14px;
}

.feature__title {
  font-size: var(--fs-18);
  margin-bottom: 6px;
}

.feature__body { font-size: var(--fs-16); }
```

Also verify (do not change) that the ≤768px media block still contains `.feature-grid { grid-template-columns: 1fr; }`.

- [ ] **Step 4: Run the full suite**

Run: `npm run test`
Expected: all pass — this task is pure CSS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/sections.css
git commit -m "feat(subpages): card--mini ticket scale, transition union for legacy reveals, retire .feature rules"
```

---

### Task 3: Hotspot wiring on sub-pages

**Files:**
- Modify: `src/sub.js`

**Interfaces:**
- Consumes: `initHotspot` from `src/hotspot.js` (existing export, signature `initHotspot(root = document)`), and Task 1's `data-hotspot` attributes.
- Produces: nothing — final task.

- [ ] **Step 1: Wire initHotspot**

Replace the entire contents of `src/sub.js` (13 lines) with:

```js
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';

import { initNav } from './nav.js';
import { initReveals } from './reveals.js';
import { initHotspot } from './hotspot.js';
import { initAutoplayVideos } from './video-ready.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveals();
  initHotspot();
  initAutoplayVideos('video.subhero__video-el');
});
```

(The only changes: the `initHotspot` import line and the `initHotspot();` call. `initHotspot` self-disables under `prefers-reduced-motion` and on `hover: none` devices — no guards needed here.)

- [ ] **Step 2: Run the full suite**

Run: `npm run test`
Expected: all pass (`tests/hotspot.test.js` covers `pointerVars`; no sub.js suite exists and none is added — the wiring is exercised in the visual pass).

- [ ] **Step 3: Visual verification (controller/browser)**

On the dev server, for each of the four product pages: mini red tickets render with frame, rails, serials, perforation, cream 28px icons; reveal entrance still eases in (700ms fade/rise — the legacy path); hover lifts 4px with red shadow and the cream sheen tracks the cursor; homepage What We Do section unchanged. Computed-style spot checks: tile `transitionProperty` includes `opacity, transform, translate, box-shadow`; tile `--hx`/`--hy` update on pointermove.

- [ ] **Step 4: Commit**

```bash
git add src/sub.js
git commit -m "feat(subpages): wire cursor-sheen hotspot into sub-page tiles"
```
