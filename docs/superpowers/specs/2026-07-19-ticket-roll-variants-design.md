# Ticket Roll Variants (per-page color + wording) — Design

**Date:** 2026-07-19
**Status:** Approved by Anthony (visual-companion dialogue, 2026-07-18/19 —
"Colored rolls + ticket types" direction chosen; palette approved from
side-by-side mockups with no swaps)
**Scope:** `src/styles/tokens.css`, `src/styles/sections.css`, the four
sub-page HTML files (`what-we-do.html`, `sell-onsite.html`,
`sell-online.html`, `sell-social.html` — one body class + eight rail-text
swaps each), `tests/ticket-markup.test.js`. `index.html`, all JS, contact
page untouched.

## Goal

Kill the sameness across the five ticket pages without breaking the system:
each page prints its tickets on its own colored roll with its own
ticket-type wording — "five ticket stocks, one printer." The homepage stays
the carnival-red hero exactly as shipped.

## Roll palette (tokens, `src/styles/tokens.css`)

Add to `:root`, after the existing red family — the active-roll indirection
(defaults to red) and four stock definitions as theme classes:

```css
/* active roll — pages override via a body class; default is carnival red */
--roll-hi: var(--red-hi);
--roll-deep: var(--red-deep);
--roll-ink: var(--red-ink);
--roll-glow: var(--red-glow);
```

Theme classes (also in tokens.css, after the `:root` block — they are token
definitions, not component styles):

```css
.roll-amber   { --roll-hi: #d88015; --roll-deep: #9a570c; --roll-ink: #7d460a; --roll-glow: rgba(216, 128, 21, 0.5); }
.roll-blue    { --roll-hi: #2547e0; --roll-deep: #1a34ad; --roll-ink: #142a8f; --roll-glow: rgba(37, 71, 224, 0.5); }
.roll-teal    { --roll-hi: #0e9c84; --roll-deep: #0a7463; --roll-ink: #085c4f; --roll-glow: rgba(14, 156, 132, 0.45); }
.roll-magenta { --roll-hi: #e01d78; --roll-deep: #ad1058; --roll-ink: #8f0b49; --roll-glow: rgba(224, 29, 120, 0.5); }
```

## `.card` consumption swap (`src/styles/sections.css`)

Exactly five declarations change from the red vars to the roll vars; nothing
else in the card block moves:

- `.card` background gradient: `linear-gradient(160deg, var(--roll-hi), var(--roll-deep) 55%, var(--roll-ink))` (grain layer unchanged)
- `.card` base shadow: `0 22px 55px -22px var(--roll-glow)`
- `.card:hover` shadow: `0 30px 70px -24px var(--roll-glow)`
- `.card--mini` base shadow: `0 16px 40px -18px var(--roll-glow)`
- `.card--mini:hover` shadow: `0 24px 52px -18px var(--roll-glow)`
- (The cursor sheen, frames, rails, serial, perf colors are cream-family
  constants and do not change.)

Custom properties inherit, so a body-level class recolors every card on the
page; with no class, the `:root` defaults render the shipped red. Homepage
behavior is bit-identical.

## Page assignment (body classes)

- `what-we-do.html` → `<body class="roll-amber">`
- `sell-onsite.html` → `<body class="roll-blue">`
- `sell-online.html` → `<body class="roll-teal">`
- `sell-social.html` → `<body class="roll-magenta">`
- `index.html` → no class (default red). Untouched.

If a body tag already carries attributes/classes, append the roll class —
do not replace existing ones.

## Ticket-type wording (rails)

Per page, all eight rail spans (two per tile, four tiles) change text.
`&#9733;` stays; `&nbsp;` separators stay; serial rows keep
`EMC TICKETS` + existing numbers everywhere:

- Homepage: `ADMIT&nbsp;ONE&nbsp;&#9733;` (unchanged, untouched)
- what-we-do: `ALL&nbsp;ACCESS&nbsp;&#9733;`
- sell-onsite: `GATE&nbsp;PASS&nbsp;&#9733;`
- sell-online: `E-TICKET&nbsp;&#9733;`
- sell-social: `VIP&nbsp;PASS&nbsp;&#9733;`

Rails remain `aria-hidden="true"` — purely visual wording, no AT-facing
copy change.

## Accessibility

Cream print on each stock's `--roll-deep` midtone: amber ≈4.7:1 (the
deepened values exist precisely for this), teal ≈4.9:1, blue ≈6.5:1,
magenta ≈6:1, red unchanged ≈6:1 — all clear AA for the 0.82-alpha body
text; titles higher. Rails/serials decorative and exempt. No focus,
keyboard, or reveal-behavior changes.

## Testing

`tests/ticket-markup.test.js` page config gains `rollClass` (null for
index) and `railText` per page; new assertions:

- `doc.body.classList.contains(rollClass)` for sub-pages; homepage body has
  no `roll-*` class;
- every `.card__rail` on a page has exactly that page's rail text (star
  included);
- all existing anatomy/serial/uniqueness assertions unchanged.

Full vitest suite green. Visual verification on the dev server: each page
renders its stock color + wording; homepage still red ADMIT ONE; hover
shadow glows in the page's color (uses `--roll-glow`).

## Out of scope

Homepage markup/CSS beyond the six var swaps (which are no-ops there),
contact page, stat pulls, flow strips, footer/nav, serials, any JS,
physical print variation (stamps/side-stubs — possible future pass).
