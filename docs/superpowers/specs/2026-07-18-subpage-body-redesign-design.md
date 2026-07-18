# Sub-Page Body Redesign — Design

**Date:** 2026-07-18
**Status:** Approved by Anthony (design dialogue, 2026-07-18)
**Scope:** The bodies (below the cinematic subhero, above the intake CTA) of
`what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`.
Contact.html, the homepage, and all JS modules are untouched.

## Goal

Replace the memo-style prose blocks with a digestible, on-brand component
rhythm so the product pages hold attention instead of losing it. Reuses the
site's established language: ticket-stub cards, hotspot glow, Fraunces
display type, gold shimmer, staggered reveals.

## Copy rules (hard)

- Every existing fact/claim survives verbatim in meaning; no new claims, no
  invented numbers. Existing sentences may be re-homed into new components.
- Additions limited to: section eyebrows, card titles where a bullet lacks
  one, and stat captions — each derived from sentences already on its page.
- Exact stats used (all already on the pages): "50%+" retail advance-sales
  share (what-we-do, sell-online); "Day one" staff simplicity and "24/7"
  event-window support (sell-onsite); "11 months" off-season (sell-social,
  derived from "Most attendees decide to come back during the eleven months
  you're not running an event").

## The kit (one shared CSS block in `src/styles/sections.css`)

1. **Lede** (`.body-lede`): the page's existing intro paragraph styled large
   — `font-size: var(--fs-22)`, `max-width: 62ch`, muted color, with its
   existing h2 above it (Fraunces via base styles). Centered block.
2. **Feature tiles** (`.feature-grid` > `.feature`): 2-column grid (1-column
   ≤768px), gap 24px. Each `.feature`: dark elevated card in the ticket
   family — `background: var(--bg-elev)`, 1px `--border`, `--radius-card`,
   24px padding, `data-hotspot` glow, `data-reveal` stagger. Contents: a
   28×28 stroke icon (gold-grad, 2px, same style as the homepage card set),
   `h3.feature__title` (Fraunces via base), one-line `p.feature__body`.
3. **Stat pull** (`.stat-pull`): full-width centered band, 64px vertical
   padding. `p.stat-pull__figure` — Fraunces 700, `clamp(56px, 9vw, 120px)`,
   `.gold-text` span on the figure (shimmer comes free) — plus
   `p.stat-pull__caption` (Inter Tight, muted, max 46ch, centered).
4. **Flow strip** (`.flow` > `.flow__step`): 3 steps in a row (stack ≤768px),
   each with `span.flow__num` (Fraunces italic, gold, "1"–"3"),
   `h3.flow__title`, `p.flow__body` (one line). A 1px gold-tinted connector
   line (`.flow` ::before, hidden when stacked). `data-reveal` per step.

All kit markup uses existing attributes only (`data-reveal`, `data-hotspot`)
so `sub.js`'s legacy reveal path and homepage hotspot module conventions keep
working with zero JS changes (note: sub.js does not run hotspot — the glow is
CSS-var driven and hover-dependent; without JS vars the glow simply centers,
which is acceptable — or tiles omit data-hotspot; decision: OMIT data-hotspot
on sub-pages, keep the border/hover-shadow treatment pure CSS).

## Per-page composition (subhero → … → intake, intake unchanged)

- **what-we-do:** lede ("Built for events that move." + paragraph) →
  feature tiles ×4 (Presale & Advance / Marketing & Advertising / Redemption
  & Box Office / Social Media Management — bullets map 1:1, icons reuse the
  homepage set's four designs at 28px) → stat pull ("50%+" / retail caption
  from the existing closing paragraph) → intake.
- **sell-onsite:** lede ("State of the art, used by humans.") → flow strip
  (Walk up → Scan → In; bodies derived from the scanner/POS bullets) →
  feature tiles ×4 (scanners / box-office POS / real-time inventory /
  training & support) → stat pull ("24/7" / "Onsite training and dedicated
  support during your event window.") → intake.
- **sell-online:** lede ("One inventory, every channel.") → flow strip
  (Browse → Pay → Gate; Pay names Apple Pay/Google Pay from the bullet) →
  feature tiles ×4 (one-click presale / mobile-first checkout / promo &
  pricing tools / channel-attribution reporting) → stat pull ("50%+" /
  retail caption from the existing closing paragraph) → intake.
- **sell-social:** lede ("Social is where your event lives between gates.")
  → feature tiles ×4 (editorial & creative / paid promotion / guest support
  / sales tie-ins) → stat pull ("11 months" / off-season caption) → intake.

Icons: the four homepage card icons are reused where they match (what-we-do
tiles); the other pages get icons from the same 2px-stroke gold-grad family,
hand-authored in the plan (scanner, POS/register, inventory-sync, headset,
cart, phone-pay, tag, chart, calendar, megaphone, chat, link — per plan).
Pages using icons embed the shared `gold-grad` defs SVG once (same hidden
defs block the homepage uses).

## Constraints

- Markup + CSS only; zero JS changes; all 53 tests pass unmodified.
- `.prose` CSS stays (used nowhere after this, but harmless — actually
  REMOVED as part of this work along with any now-dead selectors it owned,
  verified unreferenced).
- Reduced motion: reveals become instant (existing base rule); no new
  animation added by the kit beyond existing reveal/shimmer behavior.
- Sub-pages keep the legacy (non-GSAP) reveal path via sub.js untouched.

## Build order

1. Kit CSS + what-we-do page (proves every component).
2. sell-onsite + sell-online (flow strips) .
3. sell-social + `.prose` removal + QA sweep + final review.
