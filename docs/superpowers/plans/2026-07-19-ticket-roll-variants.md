# Ticket Roll Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each product page prints its tickets on its own colored roll with its own ticket-type wording, per `docs/superpowers/specs/2026-07-19-ticket-roll-variants-design.md`; the homepage stays bit-identical carnival red.

**Architecture:** A `--roll-*` custom-property indirection in tokens.css (defaulting to the red family) with four stock theme classes; `.card` CSS consumes the roll vars (5 declaration swaps); one body class per sub-page selects the stock; rail spans get per-page ticket-type text. Tests pin body classes and rail wording per page.

**Tech Stack:** Static HTML + CSS custom properties, Vite, Vitest + happy-dom.

## Global Constraints

- **Files touched, exhaustively:** `src/styles/tokens.css`, `src/styles/sections.css`, `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `tests/ticket-markup.test.js`. `index.html` and all JS untouched.
- **Homepage renders bit-identical:** `--roll-*` defaults alias the existing `--red-*` tokens; index.html gets no class and no edits.
- **Stock values exact (hi/deep/ink/glow):** amber `#d88015`/`#9a570c`/`#7d460a`/`rgba(216, 128, 21, 0.5)`; blue `#2547e0`/`#1a34ad`/`#142a8f`/`rgba(37, 71, 224, 0.5)`; teal `#0e9c84`/`#0a7463`/`#085c4f`/`rgba(14, 156, 132, 0.45)`; magenta `#e01d78`/`#ad1058`/`#8f0b49`/`rgba(224, 29, 120, 0.5)`.
- **Page assignment:** what-we-do → `roll-amber`; sell-onsite → `roll-blue`; sell-online → `roll-teal`; sell-social → `roll-magenta`.
- **Rail wording (HTML source, entities exact):** what-we-do `ALL&nbsp;ACCESS&nbsp;&#9733;`; sell-onsite `GATE&nbsp;PASS&nbsp;&#9733;`; sell-online `E-TICKET&nbsp;&#9733;`; sell-social `VIP&nbsp;PASS&nbsp;&#9733;`. Homepage keeps `ADMIT&nbsp;ONE&nbsp;&#9733;`. All rails keep `aria-hidden="true"`; serial rows and numbers unchanged.
- Full vitest suite green at every commit; known pre-existing "ECONNREFUSED 127.0.0.1:3000" noise line is not yours to fix.

## File Structure

- **`src/styles/tokens.css`** — roll indirection in `:root` + four `.roll-*` theme classes at file end (token definitions, not component styles).
- **`src/styles/sections.css`** — five declaration swaps (`--red-*` → `--roll-*`) inside the existing card block; nothing else.
- **4 sub-page HTML files** — `<body>` class + 8 rail-text swaps each.
- **`tests/ticket-markup.test.js`** — page config gains `rollClass`/`railText`; two new assertions per page.

---

### Task 1: Roll tokens + CSS consumption swap

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/sections.css`

**Interfaces:**
- Consumes: existing `--red-hi/--red-deep/--red-ink/--red-glow` tokens.
- Produces: `--roll-hi/--roll-deep/--roll-ink/--roll-glow` (consumed by `.card` rules) and theme classes `.roll-amber`, `.roll-blue`, `.roll-teal`, `.roll-magenta` — Task 2 puts these on body tags.

- [ ] **Step 1: Add the roll indirection to `:root`**

In `src/styles/tokens.css`, directly after the line `--red-glow: rgba(216, 21, 49, 0.5);`, insert:

```css
  /* active roll — a body class overrides these; default is carnival red */
  --roll-hi: var(--red-hi);
  --roll-deep: var(--red-deep);
  --roll-ink: var(--red-ink);
  --roll-glow: var(--red-glow);
```

- [ ] **Step 2: Add the stock theme classes**

At the very end of `src/styles/tokens.css` (after the `@media (max-width: 768px)` block), append:

```css
/* Ticket roll stocks — one class on <body> reprints the page's tickets. */
.roll-amber   { --roll-hi: #d88015; --roll-deep: #9a570c; --roll-ink: #7d460a; --roll-glow: rgba(216, 128, 21, 0.5); }
.roll-blue    { --roll-hi: #2547e0; --roll-deep: #1a34ad; --roll-ink: #142a8f; --roll-glow: rgba(37, 71, 224, 0.5); }
.roll-teal    { --roll-hi: #0e9c84; --roll-deep: #0a7463; --roll-ink: #085c4f; --roll-glow: rgba(14, 156, 132, 0.45); }
.roll-magenta { --roll-hi: #e01d78; --roll-deep: #ad1058; --roll-ink: #8f0b49; --roll-glow: rgba(224, 29, 120, 0.5); }
```

- [ ] **Step 3: Swap the five `.card` declarations in `src/styles/sections.css`**

1. In the `.card` rule's `background`, replace the line:
```css
    linear-gradient(160deg, var(--red-hi), var(--red-deep) 55%, var(--red-ink));
```
with:
```css
    linear-gradient(160deg, var(--roll-hi), var(--roll-deep) 55%, var(--roll-ink));
```
(The `repeating-linear-gradient` grain line above it is untouched.)

2. In `.card`, replace `  box-shadow: 0 22px 55px -22px var(--red-glow);` with `  box-shadow: 0 22px 55px -22px var(--roll-glow);`

3. In `.card:hover`, replace `  box-shadow: 0 30px 70px -24px var(--red-glow);` with `  box-shadow: 0 30px 70px -24px var(--roll-glow);`

4. In `.card--mini`, replace `  box-shadow: 0 16px 40px -18px var(--red-glow);` with `  box-shadow: 0 16px 40px -18px var(--roll-glow);`

5. Replace `.card--mini:hover { box-shadow: 0 24px 52px -18px var(--red-glow); }` with `.card--mini:hover { box-shadow: 0 24px 52px -18px var(--roll-glow); }`

- [ ] **Step 4: Verify**

Run: `grep -c "var(--red-" src/styles/sections.css`
Expected: `0` (all card consumption goes through `--roll-*`; the `--red-*` tokens still exist in tokens.css as the defaults' source).

Run: `npm run test`
Expected: all 72 tests pass (pure CSS change; homepage defaults make it a visual no-op).

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css src/styles/sections.css
git commit -m "feat(rolls): --roll-* indirection + four stock theme classes; card consumes roll vars"
```

---

### Task 2: Page stocks, rail wording, tests

**Files:**
- Modify: `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`
- Test: `tests/ticket-markup.test.js`

**Interfaces:**
- Consumes: Task 1's theme classes `.roll-amber/.roll-blue/.roll-teal/.roll-magenta`.
- Produces: nothing — final task.

- [ ] **Step 1: Extend the test (failing first)**

In `tests/ticket-markup.test.js`, replace the `PAGES` array with (serials unchanged — only `rollClass` and `railText` are new). ENCODING WARNING: the spaces inside every `railText` value below are literal U+00A0 non-breaking spaces (what the HTML `&nbsp;` entities produce in `textContent`), not regular spaces. COPY the block verbatim — do not retype it; if your editor cannot preserve them, write escapes instead: ADMIT\u00A0ONE\u00A0★ etc. `★` is `&#9733;`:

```js
const PAGES = [
  { file: 'index.html', container: '.cards', mini: false, rollClass: null,
    railText: 'ADMIT ONE ★',
    serials: ['№ 047291', '№ 047292', '№ 047293', '№ 047294'] },
  { file: 'what-we-do.html', container: '.feature-grid', mini: true, rollClass: 'roll-amber',
    railText: 'ALL ACCESS ★',
    serials: ['№ 047295', '№ 047296', '№ 047297', '№ 047298'] },
  { file: 'sell-onsite.html', container: '.feature-grid', mini: true, rollClass: 'roll-blue',
    railText: 'GATE PASS ★',
    serials: ['№ 047299', '№ 047300', '№ 047301', '№ 047302'] },
  { file: 'sell-online.html', container: '.feature-grid', mini: true, rollClass: 'roll-teal',
    railText: 'E-TICKET ★',
    serials: ['№ 047303', '№ 047304', '№ 047305', '№ 047306'] },
  { file: 'sell-social.html', container: '.feature-grid', mini: true, rollClass: 'roll-magenta',
    railText: 'VIP PASS ★',
    serials: ['№ 047307', '№ 047308', '№ 047309', '№ 047310'] },
];
```

Then add this describe block at the end of the file:

```js
describe('roll stocks', () => {
  for (const { file, doc, rollClass, railText, container } of docs) {
    it(`${file}: body carries ${rollClass ?? 'no roll class'}`, () => {
      const classes = [...doc.body.classList];
      if (rollClass) {
        expect(classes).toContain(rollClass);
      } else {
        expect(classes.filter((c) => c.startsWith('roll-'))).toEqual([]);
      }
    });

    it(`${file}: all rails read the page's ticket type`, () => {
      const rails = [...doc.querySelectorAll(`${container} .card__rail`)];
      expect(rails).toHaveLength(8);
      for (const rail of rails) {
        expect(rail.textContent).toBe(railText);
      }
    });
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/ticket-markup.test.js`
Expected: FAIL — sub-page "body carries roll-…" tests fail (no class yet) and sub-page rail-text tests fail (rails still say ADMIT ONE); both index.html tests in the new block pass.

- [ ] **Step 3: Apply the page changes**

Per file — two operations:

1. Body class (line 13 in each file):
   - `what-we-do.html`: `<body>` → `<body class="roll-amber">`
   - `sell-onsite.html`: `<body>` → `<body class="roll-blue">`
   - `sell-online.html`: `<body>` → `<body class="roll-teal">`
   - `sell-social.html`: `<body>` → `<body class="roll-magenta">`

2. Rail text — in each file replace ALL 8 occurrences of `ADMIT&nbsp;ONE&nbsp;&#9733;` with that file's wording:
   - `what-we-do.html`: `ALL&nbsp;ACCESS&nbsp;&#9733;`
   - `sell-onsite.html`: `GATE&nbsp;PASS&nbsp;&#9733;`
   - `sell-online.html`: `E-TICKET&nbsp;&#9733;`
   - `sell-social.html`: `VIP&nbsp;PASS&nbsp;&#9733;`

Nothing else in the rail spans changes (classes, aria-hidden stay). `index.html` untouched.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/ticket-markup.test.js`
Expected: PASS — 29 tests (19 existing + 10 new).

- [ ] **Step 5: Run the full suite**

Run: `npm run test`
Expected: all pass (82 total).

- [ ] **Step 6: Commit**

```bash
git add what-we-do.html sell-onsite.html sell-online.html sell-social.html tests/ticket-markup.test.js
git commit -m "feat(rolls): per-page stocks + ticket-type rails — amber/blue/teal/magenta, ALL ACCESS/GATE PASS/E-TICKET/VIP PASS"
```
