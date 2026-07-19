# Red Ticket Cards (Carnival Classic) — Design

**Date:** 2026-07-18
**Status:** Approved by Anthony (visual-companion dialogue, 2026-07-18 —
direction "Carnival Classic" chosen from three mockups; straight grid chosen
over scattered stubs; "lift + torn-edge glow" hover chosen)
**Scope:** The four What We Do cards on the homepage (`index.html` `.card`
elements and their styles in `src/styles/sections.css`, plus new tokens in
`src/styles/tokens.css`). Sub-page feature tiles, the intake section, footer,
and all JS modules are untouched.

## Goal

Push the ticket-stub motif from "night stub" to a full carnival ticket: the
four cards become saturated red stubs with cream print and heavy ticket
detailing — ADMIT ONE rails, engraved double frame, serial numbers, paper
grain — matching the approved mockup. Red as printed material, not accent.

## Tokens (`src/styles/tokens.css`)

Add to `:root` (derived from the existing brand anchor `--red: #C8102E`,
which stays):

```css
--red-hi: #d81531;
--red-deep: #a50d24;
--red-ink: #8f0b20;
--cream: #f9edd8;
--red-glow: rgba(216, 21, 49, 0.5);
```

`--accent-glow`, `--gold-*`, and `--ride` are unchanged — other sections
still use them.

## Ticket material (`.card` in `src/styles/sections.css`)

- **Background:** paper grain over red —
  `repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px)`
  over `linear-gradient(160deg, var(--red-hi), var(--red-deep) 55%, var(--red-ink))`.
- **Border:** none (the engraved frame replaces it). Radius stays
  `var(--radius-card)`.
- **Padding:** `28px 56px` (side room for the rails).
- **Text color:** `var(--cream)`; `.card__body` at `rgba(249, 237, 216, 0.82)`.
- **Base shadow:** `0 22px 55px -22px var(--red-glow)`.
- **Icons:** existing SVG paths untouched; add
  `.card__icon { stroke: var(--cream); }` (CSS `stroke` beats the
  `stroke="url(#gold-grad)"` attribute). The `#gold-grad` def stays as the
  no-CSS fallback for the card icons; sub-pages carry their own inline defs.

## Print detail (markup additions per card, `index.html`)

Each of the four cards gains three decorative elements, all
`aria-hidden="true"`, placed at the top of the article in this order:

1. **Engraved frame** — `<span class="card__frame"></span>`: absolutely
   positioned `inset: 8px`, `1px solid rgba(249,237,216,0.5)`, radius 8px;
   its `::before` at `inset: 3px` is a `1px dashed rgba(249,237,216,0.32)`
   inner rule. (A span, not a pseudo-element — `.card`'s own `::after` is the
   hotspot sheen and `.card__perf` already uses both of its pseudos.)
2. **ADMIT ONE rails** — two spans
   `<span class="card__rail card__rail--l">ADMIT&nbsp;ONE&nbsp;★</span>` (and
   `--r`): vertical `writing-mode: vertical-rl` (left rail rotated 180°),
   width 30px, `top/bottom: 14px`, `left/right: 8px`, 9px / 800 /
   `letter-spacing: 0.42em`, `rgba(249,237,216,0.8)`, each separated from the
   body by a `1px dashed rgba(249,237,216,0.38)` rule.
3. **Serial row** — `<div class="card__serial"><span>EMC TICKETS</span>
   <span>№ 047291</span></div>`: flex space-between, 10px / 700 /
   `letter-spacing: 0.28em`, `rgba(249,237,216,0.72)`, margin-bottom 14px.
   Serials are unique per card, top-left to bottom-right: № 047291 (Presale &
   Advance), № 047292 (Marketing & Ads), № 047293 (Redemption & Gate),
   № 047294 (Social Management).

Existing content flow after the additions: serial row → icon → perforation →
title → body. `data-hotspot` and `data-reveal` attributes are unchanged.

## Perforation recolor (`.card__perf`)

Stays structurally identical (dashed tear + two punched notches); recolors to
the cream family: `border-top: 2px dashed rgba(249,237,216,0.4)`; notches
keep `background: var(--bg)` and take `border: 1px solid
rgba(249,237,216,0.32)`. Margins widen to the new padding:
`margin: 18px -56px`.

## Hover — "lift + torn-edge glow"

- Ticket lifts: `translate: 0 -4px` (the independent `translate` property —
  the GSAP reveal leaves an inline `transform` on revealed cards, which would
  mask a `transform`-based lift; `translate` composes with it); shadow
  deepens to `0 30px 70px -24px var(--red-glow)`. Transition on translate +
  box-shadow, 250ms `var(--ease)`.
- The cursor-tracking sheen (`.card::after`, driven by the existing
  `--hx`/`--hy` custom props from `src/hotspot.js`) recolors from gold to
  cream: `rgba(249, 237, 216, 0.14)`, same 240px radial, fade-in on hover.
  Zero JS changes — `hotspot.js` already skips reduced-motion and
  hover-incapable devices.
- The current gold `border-color` hover rule is deleted (no border anymore).
- Under `@media (prefers-reduced-motion: reduce)`: no lift (`translate:
  none`). The shadow deepen and sheen fade stay — they are opacity/shadow
  changes, not motion (and the cursor-tracked sheen is already static there
  because `hotspot.js` bails out).

## Accessibility

- Frame, rails, and serial row are decorative: `aria-hidden="true"`.
- Contrast on the red material: `.card__title` cream on `--red-deep` ≈ 8:1;
  `.card__body` at 0.82 alpha ≈ 6:1 — both clear AA for their sizes. Rails
  and serials are decorative and exempt.
- Cards remain non-interactive `<article>`s — no focus/keyboard changes.

## Responsive

2×2 grid and single-column ≤768px behavior unchanged. The 56px side padding
and rails stay on mobile (cards are full-width there; text column keeps
~18px clearance inside the rails).

## Testing

- No JS changes: the existing vitest suites must still pass (`npm run test`).
- Visual verification on the dev server: four unique serials; frame, rails,
  grain, and perforation render; hover lift + cream sheen; reduced-motion
  emulation shows no lift; 375px width still stacks cleanly.

## Out of scope

Sub-page feature tiles and bodies, intake CTA section, footer, nav, hero,
flight sequence, contact page, any JS module.
