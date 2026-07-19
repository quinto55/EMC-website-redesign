# Sub-Page Ticket Parity (Carnival Classic, scaled) — Design

**Date:** 2026-07-18
**Status:** Approved by Anthony (design dialogue, 2026-07-18 — "Full parity,
scaled" chosen over no-JS and material-only variants)
**Scope:** The 16 feature tiles (4 per page) on `what-we-do.html`,
`sell-onsite.html`, `sell-online.html`, `sell-social.html`; the `.feature*`
rules and a new `.card--mini` modifier in `src/styles/sections.css`; one
wiring addition in `src/sub.js`; test extension in
`tests/ticket-markup.test.js`. Homepage cards, contact page, stat pulls,
flow strips, subheroes, intake sections are untouched.

## Goal

The product pages' feature tiles become scaled-down Carnival Classic
tickets, sharing the homepage cards' anatomy classes — same material, frame,
rails, serials, perforation, lift + sheen hover — so "ticket" reads as one
system site-wide, with a single CSS source of truth.

## Approach: shared anatomy + `--mini` modifier

Tile markup changes from `<article class="feature" data-reveal>` to
`<article class="card card--mini" data-hotspot data-reveal>`, adopting the
homepage anatomy verbatim: `card__frame`, `card__rail--l/--r`,
`card__serial`, `card__icon` (existing SVG, cream via inherited CSS stroke),
`card__perf` (new to tiles), `card__title`, `card__body`. The `.feature`,
`.feature:hover`, `.feature__icon`, `.feature__title`, `.feature__body`
rules are deleted. `.feature-grid` (and its ≤768px single-column rule) stays
as the layout container.

## `.card--mini` overrides (`src/styles/sections.css`)

Placed directly after the reduced-motion guard in the card block:

```css
.card--mini {
  padding: 20px 44px;
  box-shadow: 0 16px 40px -18px var(--red-glow);
}
.card--mini:hover { box-shadow: 0 24px 52px -18px var(--red-glow); }
.card--mini .card__frame { inset: 6px; border-radius: 7px; }
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
.card--mini .card__icon { width: 28px; height: 28px; }
.card--mini .card__title { font-size: var(--fs-18); margin-bottom: 6px; }
.card--mini .card__perf { margin: 14px -44px; }
.card--mini .card__perf::before,
.card--mini .card__perf::after { width: 14px; height: 14px; top: -7px; }
.card--mini .card__perf::before { left: -7px; }
.card--mini .card__perf::after { right: -7px; }
```

The lift (`translate: 0 -4px`), cream sheen, gradient material, grain, cream
print colors, and reduced-motion behavior are inherited from `.card`
unchanged.

## Transition unification (the load-bearing change)

Sub-pages run the legacy reveal path (`sub.js` calls `initReveals()` with no
GSAP context): base.css's `[data-reveal] { transition: opacity 700ms,
transform 700ms }` animates the entrance when `.is-visible` lands. The
current `.card` transition list (`translate, box-shadow`) would override it
at equal specificity via import order and snap the reveal. Fix: `.card`'s
transition becomes the union —

```css
  transition:
    opacity 700ms var(--ease),
    transform 700ms var(--ease),
    translate 250ms var(--ease),
    box-shadow 250ms var(--ease);
```

- Sub-pages (legacy path): reveal eases 700ms on opacity/transform; hover
  eases 250ms on translate/box-shadow. One list serves both. (Historical
  note: before this branch the old `.feature` rule's own transition list
  already clobbered the reveal transition, so tiles snapped in — the union
  doesn't just preserve the ease, it introduces it. The 700ms entrance is
  the intended behavior, not a pre-existing baseline to "restore" away.)
- Homepage (GSAP path): `.gsap-motion [data-reveal] { transition: none }`
  still suppresses everything and the existing scoped
  `.gsap-motion .card[data-reveal]` restore keeps the hover pair — no change
  in homepage behavior.
- Reduced motion: the universal 0.001ms clamp still flattens all of it.

## Hotspot wiring (`src/sub.js` — the one JS change)

```js
import { initHotspot } from './hotspot.js';
```
and `initHotspot();` inside the existing `DOMContentLoaded` handler. The
module already bails on `prefers-reduced-motion` and `hover: none` devices.
Tiles carry `data-hotspot` in the new markup.

## Serials — the roll continues site-wide

Homepage holds № 047291–047294. Product pages continue in page order,
top-left to bottom-right within each grid:

- `what-we-do.html`: № 047295, 047296, 047297, 047298
- `sell-onsite.html`: № 047299, 047300, 047301, 047302
- `sell-online.html`: № 047303, 047304, 047305, 047306
- `sell-social.html`: № 047307, 047308, 047309, 047310

`№` is U+2116 everywhere. No duplicate serials anywhere on the site.

## Markup per tile (exact insert)

Immediately after each tile's opening `<article class="card card--mini"
data-hotspot data-reveal>`:

```html
<span class="card__frame" aria-hidden="true"></span>
<span class="card__rail card__rail--l" aria-hidden="true">ADMIT&nbsp;ONE&nbsp;&#9733;</span>
<span class="card__rail card__rail--r" aria-hidden="true">ADMIT&nbsp;ONE&nbsp;&#9733;</span>
<div class="card__serial" aria-hidden="true"><span>EMC TICKETS</span><span>№ 047295</span></div>
```

then the existing icon SVG (class changes `feature__icon` → `card__icon`;
`stroke="url(#gold-grad)"` attribute stays as the no-CSS fallback), then a
new `<div class="card__perf" aria-hidden="true"></div>`, then title
(`feature__title` → `card__title`) and body (`feature__body` →
`card__body`). Content flow: serial → icon → perforation → title → body,
identical to the homepage.

## Accessibility & responsive

Same posture as the homepage spec: decorative elements `aria-hidden`,
tiles remain non-interactive `<article>`s, cream-on-red contrast unchanged
(same colors). `.feature-grid`'s existing ≤768px single-column stack is
untouched; 44px side padding leaves a comfortable text column at 375px.

## Testing

`tests/ticket-markup.test.js` extends to parse all five HTML files from
disk:

- every `.card` site-wide (homepage `.cards`, sub-page `.feature-grid`) has
  frame, two rails, serial row (all `aria-hidden="true"`), perf, icon,
  title, body;
- serials match the exact per-page sequences above;
- all 20 serials are unique;
- homepage assertions unchanged.

Full vitest suite must pass. Visual verification on the dev server across
all four product pages: mini tickets render with all print detail; hover
lift + sheen work (sheen requires the new hotspot wiring); reveal entrance
still eases in on sub-pages (the 700ms path); homepage unchanged.

## Out of scope

Homepage card rules (other than the transition-list union), contact page,
stat pulls, flow strips, subheroes, intake, footer, nav, flight sequence,
`#gold-grad` defs (stay on every page), any other JS.
