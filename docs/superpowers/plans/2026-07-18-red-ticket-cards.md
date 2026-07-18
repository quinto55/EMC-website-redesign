# Red Ticket Cards (Carnival Classic) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the four homepage What We Do cards as red carnival ticket stubs — red gradient material, cream print, engraved frame, ADMIT ONE rails, unique serials, lift + cream-sheen hover — per `docs/superpowers/specs/2026-07-18-red-ticket-cards-design.md`.

**Architecture:** Pure markup + CSS change. Three decorative `aria-hidden` spans/divs are added to each card in `index.html`; new color tokens go in `src/styles/tokens.css`; the `.card` family of rules in `src/styles/sections.css` is rewritten for the red material and new hover. Zero JS changes — the cursor sheen reuses `--hx`/`--hy` from the untouched `src/hotspot.js`.

**Tech Stack:** Static HTML + hand-written CSS (design tokens in `:root`), Vite dev server, Vitest with happy-dom.

## Global Constraints

- **No JS changes.** All 11 existing vitest suites must pass unmodified (`npm run test`).
- **Scope:** homepage What We Do cards only — sub-page tiles, intake, footer, nav, hero, flight, contact are untouched.
- **The `#gold-grad` SVG def in `index.html` stays** — footer/nav icons still reference it; card icons are recolored via CSS `stroke` only.
- **Serials are exact and sequential:** № 047291 (Presale & Advance), № 047292 (Marketing & Ads), № 047293 (Redemption & Gate), № 047294 (Social Management). `№` is U+2116.
- **All new decorative elements carry `aria-hidden="true"`.**
- **New tokens (exact values):** `--red-hi: #d81531`, `--red-deep: #a50d24`, `--red-ink: #8f0b20`, `--cream: #f9edd8`, `--red-glow: rgba(216, 21, 49, 0.5)`. Existing `--red: #C8102E` stays.
- **Reduced motion:** hover lift disabled under `prefers-reduced-motion: reduce`; sheen/shadow may remain (hotspot JS already bails there).

## File Structure

- **Modify `index.html`** (cards at ~lines 127–168): add frame/rails/serial elements to each of the four `.card` articles. No other sections touched.
- **Modify `src/styles/tokens.css`**: five new custom properties after `--red`.
- **Modify `src/styles/sections.css`** (`.card` family, ~lines 192–265): rewrite `.card` base, add `.card__frame` / `.card__rail` / `.card__serial`, recolor `.card__perf` and `.card__icon`, rebuild hover.
- **Create `tests/ticket-markup.test.js`**: parses `index.html` from disk and asserts the ticket anatomy (the only unit-testable surface of this change).

---

### Task 1: Ticket print-detail markup

**Files:**
- Modify: `index.html` (the four `.card` articles inside `<div class="cards">`, ~lines 128–168)
- Test: `tests/ticket-markup.test.js` (create)

**Interfaces:**
- Consumes: existing `.card` markup (`.card__icon`, `.card__perf`, `.card__title`, `.card__body`).
- Produces: per card — `span.card__frame`, `span.card__rail.card__rail--l`, `span.card__rail.card__rail--r`, `div.card__serial` (two child spans, second is the serial №). Task 2's CSS targets exactly these class names.

- [ ] **Step 1: Write the failing test**

Create `tests/ticket-markup.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');
const cards = [...doc.querySelectorAll('.cards .card')];

describe('ticket card print detail', () => {
  it('has four ticket cards', () => {
    expect(cards).toHaveLength(4);
  });

  it('gives every card an engraved frame, two rails, and a serial row, all aria-hidden', () => {
    for (const card of cards) {
      expect(card.querySelector('.card__frame[aria-hidden="true"]')).not.toBeNull();
      expect(card.querySelectorAll('.card__rail[aria-hidden="true"]')).toHaveLength(2);
      expect(card.querySelector('.card__rail--l')).not.toBeNull();
      expect(card.querySelector('.card__rail--r')).not.toBeNull();
      expect(card.querySelector('.card__serial[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('prints a unique sequential serial on each ticket', () => {
    const serials = cards.map(
      (card) => card.querySelector('.card__serial span:last-child').textContent
    );
    expect(serials).toEqual(['№ 047291', '№ 047292', '№ 047293', '№ 047294']);
  });

  it('keeps the perforation and existing content on every card', () => {
    for (const card of cards) {
      expect(card.querySelector('.card__perf')).not.toBeNull();
      expect(card.querySelector('.card__icon')).not.toBeNull();
      expect(card.querySelector('.card__title')).not.toBeNull();
      expect(card.querySelector('.card__body')).not.toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/ticket-markup.test.js`
Expected: FAIL — "gives every card an engraved frame…" and "prints a unique sequential serial…" fail (`.card__frame` etc. not found); the "four ticket cards" and "keeps the perforation" tests already pass.

- [ ] **Step 3: Add the print-detail markup to all four cards**

In `index.html`, inside **each** of the four `<article class="card" data-hotspot data-reveal>` elements, insert four lines immediately after the opening `<article …>` tag — i.e. before the existing `<svg class="card__icon" …>`:

```html
<span class="card__frame" aria-hidden="true"></span>
<span class="card__rail card__rail--l" aria-hidden="true">ADMIT&nbsp;ONE&nbsp;&#9733;</span>
<span class="card__rail card__rail--r" aria-hidden="true">ADMIT&nbsp;ONE&nbsp;&#9733;</span>
<div class="card__serial" aria-hidden="true"><span>EMC TICKETS</span><span>№ 047291</span></div>
```

Per-card serial values, in document order:
1. Presale & Advance → `<span>№ 047291</span>`
2. Marketing & Ads → `<span>№ 047292</span>`
3. Redemption & Gate → `<span>№ 047293</span>`
4. Social Management → `<span>№ 047294</span>`

Nothing else in each article changes: the order after the insert is serial row → icon → perforation → title → body (frame and rails are absolutely positioned, their DOM slot doesn't matter visually but keep them first for consistency).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/ticket-markup.test.js`
Expected: PASS — 4 tests.

- [ ] **Step 5: Run the full suite to prove nothing else broke**

Run: `npm run test`
Expected: all suites pass (11 existing + the new one).

- [ ] **Step 6: Commit**

```bash
git add index.html tests/ticket-markup.test.js
git commit -m "feat(cards): ticket print-detail markup — frame, ADMIT ONE rails, serials"
```

---

### Task 2: Red ticket material (tokens + base CSS)

**Files:**
- Modify: `src/styles/tokens.css` (`:root` block, after `--red`)
- Modify: `src/styles/sections.css` (`.card`, `.card__perf`, `.card__icon`, `.card__body` rules; new `.card__frame`/`.card__rail`/`.card__serial` rules)

**Interfaces:**
- Consumes: Task 1's class names (`card__frame`, `card__rail`, `card__rail--l`, `card__rail--r`, `card__serial`); existing tokens (`--bg`, `--radius-card`, `--ease`, `--fs-16`, `--fs-22`).
- Produces: tokens `--red-hi`, `--red-deep`, `--red-ink`, `--cream`, `--red-glow` (Task 3's hover uses `--red-glow` and cream rgba values).

- [ ] **Step 1: Add the red/cream tokens**

In `src/styles/tokens.css`, after the line `--red: #C8102E;`, insert:

```css
  --red-hi: #d81531;
  --red-deep: #a50d24;
  --red-ink: #8f0b20;
  --cream: #f9edd8;
  --red-glow: rgba(216, 21, 49, 0.5);
```

- [ ] **Step 2: Replace the `.card` base rule**

In `src/styles/sections.css`, replace:

```css
.card {
  position: relative;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 28px;
  transition: border-color 250ms var(--ease), box-shadow 250ms var(--ease);
  isolation: isolate;
}
```

with:

```css
.card {
  position: relative;
  background:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 3px),
    linear-gradient(160deg, var(--red-hi), var(--red-deep) 55%, var(--red-ink));
  border-radius: var(--radius-card);
  padding: 28px 56px;
  color: var(--cream);
  box-shadow: 0 22px 55px -22px var(--red-glow);
  transition: transform 250ms var(--ease), box-shadow 250ms var(--ease);
  isolation: isolate;
}
```

(The 1px `--border` border is gone — the engraved frame replaces it. Hover rules are rebuilt in Task 3; the old gold `:hover` / `::after` rules can stay untouched until then.)

- [ ] **Step 3: Add the frame, rail, and serial rules**

In `src/styles/sections.css`, directly after the `.card` base rule, add:

```css
.card__frame {
  position: absolute;
  inset: 8px;
  border: 1px solid rgba(249, 237, 216, 0.5);
  border-radius: 8px;
  pointer-events: none;
}

.card__frame::before {
  content: '';
  position: absolute;
  inset: 3px;
  border: 1px dashed rgba(249, 237, 216, 0.32);
  border-radius: 6px;
}

.card__rail {
  position: absolute;
  top: 14px;
  bottom: 14px;
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.42em;
  color: rgba(249, 237, 216, 0.8);
}

.card__rail--l {
  left: 8px;
  transform: rotate(180deg);
  border-left: 1px dashed rgba(249, 237, 216, 0.38);
}

.card__rail--r {
  right: 8px;
  border-left: 1px dashed rgba(249, 237, 216, 0.38);
}

.card__serial {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.28em;
  color: rgba(249, 237, 216, 0.72);
  margin-bottom: 14px;
}
```

- [ ] **Step 4: Recolor the perforation and print**

Still in `src/styles/sections.css`:

Replace the `.card__perf` rule's two color/geometry lines — the rule currently reads:

```css
.card__perf {
  position: relative;
  height: 0;
  border-top: 2px dashed rgba(255, 255, 255, 0.16);
  margin: 20px -28px;
}
```

with:

```css
.card__perf {
  position: relative;
  height: 0;
  border-top: 2px dashed rgba(249, 237, 216, 0.4);
  margin: 18px -56px;
}
```

In the `.card__perf::before, .card__perf::after` rule, replace the line
`border: 1px solid var(--border);` with `border: 1px solid rgba(249, 237, 216, 0.32);`
(the `background: var(--bg);` line stays — the notches must show the page background, reading as die-cut holes).

Replace:

```css
.card__icon {
  width: 40px;
  height: 40px;
}
```

with:

```css
.card__icon {
  width: 40px;
  height: 40px;
  stroke: var(--cream);
}
```

(CSS `stroke` overrides the `stroke="url(#gold-grad)"` presentation attribute; the SVG markup is untouched.)

Replace `.card__body { font-size: var(--fs-16); }` with:

```css
.card__body {
  font-size: var(--fs-16);
  color: rgba(249, 237, 216, 0.82);
}
```

- [ ] **Step 5: Verify — tests and visual**

Run: `npm run test` — Expected: all suites pass (this task touches no JS or markup).

Visual check on the dev server (`npm run dev` if not already running, then http://localhost:5173/ and scroll to What We Do): four red tickets with paper grain; cream icons, titles, body text; engraved double frame; ADMIT ONE ★ rails both edges; unique serials; cream perforation with dark punched notches. Hover still shows the old gold glow — that's Task 3.

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/styles/sections.css
git commit -m "feat(cards): carnival-red ticket material — grain, cream print, engraved frame, rails, serials"
```

---

### Task 3: Lift + torn-edge glow hover

**Files:**
- Modify: `src/styles/sections.css` (`.card:hover`, `.card::after`, `.card:hover::after` rules)

**Interfaces:**
- Consumes: `--red-glow` and `--ease` tokens; `--hx`/`--hy` custom properties set by the untouched `src/hotspot.js`.
- Produces: nothing consumed later — final task.

- [ ] **Step 1: Replace the hover rules**

In `src/styles/sections.css`, replace:

```css
.card:hover {
  border-color: rgba(255, 214, 107, 0.35);
  box-shadow:
    0 20px 60px -30px var(--accent-glow),
    0 10px 44px -26px rgba(255, 77, 158, 0.35);
}
```

with:

```css
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 30px 70px -24px var(--red-glow);
}
```

Then in the `.card::after` rule, replace only the `background:` declaration — currently:

```css
  background: radial-gradient(
    240px circle at var(--hx, 50%) var(--hy, 50%),
    rgba(255, 214, 107, 0.10),
    transparent 65%
  );
```

with:

```css
  background: radial-gradient(
    240px circle at var(--hx, 50%) var(--hy, 50%),
    rgba(249, 237, 216, 0.14),
    transparent 65%
  );
```

(Everything else in `.card::after` — `inset: 0`, `z-index: -1`, opacity transition — and the `.card:hover::after { opacity: 1; }` rule stay exactly as they are.)

- [ ] **Step 2: Add the reduced-motion guard**

Directly after the `.card:hover::after { opacity: 1; }` rule, add:

```css
@media (prefers-reduced-motion: reduce) {
  .card:hover { transform: none; }
}
```

- [ ] **Step 3: Verify — tests and visual**

Run: `npm run test` — Expected: all suites pass.

Visual check at http://localhost:5173/ (What We Do section):
- Hovering a ticket lifts it 4px, deepens the red shadow, and a soft cream sheen follows the cursor. No gold remains on hover.
- DevTools → Rendering → emulate `prefers-reduced-motion: reduce` → hover produces no lift (sheen is static/absent — hotspot JS bails).
- Responsive mode at 375px width: cards stack single-column, rails and serials intact, no horizontal overflow.

- [ ] **Step 4: Commit**

```bash
git add src/styles/sections.css
git commit -m "feat(cards): lift + torn-edge glow hover, cream cursor sheen, reduced-motion guard"
```
