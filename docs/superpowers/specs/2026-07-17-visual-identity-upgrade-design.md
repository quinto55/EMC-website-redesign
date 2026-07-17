# Visual Identity Upgrade — Design

**Date:** 2026-07-17
**Status:** Approved by Anthony (design dialogue, 2026-07-17)
**Scope:** Site-wide styling/markup. Five parts, built in order, each independently
shippable. No new JS modules, no new npm dependencies.

## Goal

Move the site from "handsome dark template" to an identity that could only be
EMC's: a heritage display voice (Fraunces), one committed brand artifact
(night-ticket stubs), cinematic parity for sub-pages, a disciplined second
accent from the site's own footage, and real credibility content.

Typeface decision made against a live specimen (public/type-test.html,
temporary file — deleted as part of this work).

## Part 1 — Fraunces type system

- Self-host Fraunces (latin subset, woff2, variable): roman + italic files in
  `public/fonts/`, declared in `src/styles/tokens.css` with
  `font-display: swap`; `<link rel="preload">` for both files added to every
  page `<head>` (7 pages; reveal-hero preview page untouched).
- Token: `--font-display: 'Fraunces', Georgia, serif;` (Inter Tight remains
  the default body/UI face).
- Fraunces applies to: `h1, h2, h3`; `.hero__brand`; `.intro__letters` (the
  masked EMC letterforms); `.forty__digits`; `.flight__beat h2` (italic);
  `.gold-text` spans inherit from their h1. Weights: 600 for h2/h3, 900 for
  brand/intro/digits.
- Stays Inter Tight: body, `.eyebrow`/`.hero__eyebrow`/`.intro__eyebrow`,
  buttons, nav, captions, pillars, footer text.

## Part 2 — Ticket-stub motif (signature artifact)

- The four What We Do cards become night-ticket stubs (CSS only, dark
  palette): a perforated horizontal divider between icon and title
  (dash-pattern cut via CSS mask so the page background shows through), with
  one semicircular notch cutout at each end of the divider.
- Intake CTA section gains a micro-eyebrow line `ADMIT ONE` (Inter Tight,
  letter-spaced, gold) directly above the button on the homepage and the
  experience page's finale CTA is left unchanged.
- The motif appears nowhere else (nav, footer, sub-pages stay quiet).

## Part 3 — Ride-light magenta accent

- Token `--ride: #ff4d9e` in tokens.css.
- Dosage rule (hard): hover/active states only, max: nav link hover, footer
  link hover, card hover box-shadow tint, flight scroll-cue accent. Never
  body text, never backgrounds, never resting states. Gold remains the only
  resting accent.

## Part 4 — Cinematic sub-page subheroes

- All five sub-pages (`what-we-do`, `sell-onsite`, `sell-online`,
  `sell-social`, `contact`): the portrait `.subhero__video` card is retired;
  the same footage becomes a full-bleed background video in a ~62vh subhero
  with the homepage hero's tint/gradient language; h1 (Fraunces + existing
  gold-shimmer span) and lede sit over it, standard `data-reveal` entry.
- One shared CSS block (`.subhero--cinematic`) in `src/styles/sections.css`;
  markup change per page; `src/sub.js` logic unchanged
  (`initAutoplayVideos('video.subhero__video-el')` keeps working — the video
  element keeps its class). Reduced motion continues to hide videos.

## Part 5 — Icons, footer, fairs strip

- **Icons:** replace the four placeholder card SVGs with a crafted 2px-stroke
  set (gold gradient stroke, 40×40 viewBox): ticket (Presale & Advance),
  megaphone (Marketing & Ads), gate-scanner (Redemption & Gate), chat
  bubbles (Social Management).
- **Footer (all pages):** add a brand column — `EMC.` in Fraunces, the line
  "One stop ticket sale management.", the pillars line — and a nav-links
  column (Experience, What We Do, Sell Onsite/Online/Social, Contact)
  alongside the existing Office/Phone columns.
- **Fairs strip (homepage only):** new section between the partner marquee
  and What We Do. Eyebrow "Trusted by the nights you know"; the four real
  names in Fraunces italic separated by gold dots, `data-reveal` staggered:
  Florida State Fair · Country Thunder · South Carolina State Fair ·
  Coastal Carolina State Fair. Typographic only, no logos.

## Constraints

- All 61 existing tests pass unmodified (no JS API changes).
- Fonts ≤ ~120KB added total (two latin woff2), preloaded, swap.
- Existing effects (shimmer, reveals, hotspot, magnetic, curtains, parallax,
  intro, forty, flight) keep working visually with the new type — the intro
  letter sizing (`mask-text.js`) is font-agnostic (measures viewport, not
  glyphs) and needs no code change.
- Delete `public/type-test.html` in this work.
- Reduced motion / no-JS behavior unchanged everywhere.

## Build order (one task each)

1. Fraunces foundation (fonts, tokens, global type application, preloads).
2. Ticket-stub cards + ADMIT ONE.
3. Magenta accent tokens + hover applications.
4. Sub-page cinematic subheroes (5 pages).
5. Icons + footer + fairs strip; delete type-test.html.
6. QA sweep + final whole-branch review.
