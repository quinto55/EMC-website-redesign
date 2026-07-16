# Homepage Visual Effects — Design

**Date:** 2026-07-15
**Status:** Approved by Anthony (design dialogue, 2026-07-15)
**Scope:** `index.html` only. Sub-pages inherit lighter touches in a later effort.

## Goal

Give the EMC homepage a "technologically advanced," premium, award-site feel — drawn
from three reference reels (bold masked typography, cinematic intros, scroll-driven
storytelling, premium micro-interactions) — while staying cohesive and never overkill.

Explicitly out of scope: 3D/WebGL, smooth-scroll hijacking (Lenis), multiple pinned
scenes, sub-page work.

## Approach

**GSAP + ScrollTrigger** (the only new dependency, ≈40KB gzip), integrated into the
existing vanilla module pattern: one file per effect in `src/`, each exporting an
`init*()` called from `main.js`, unit-tested with vitest (GSAP mocked).

## Architecture

New module `src/motion.js` registers GSAP/ScrollTrigger once and owns two globals:

- **Reduced motion:** when `prefers-reduced-motion: reduce`, every cinematic effect
  collapses to an instant static state — intro skipped, parallax off, pinned scene
  unpinned with final values, marquee paused, particles static.
- **Session gate:** `sessionStorage.emcIntroSeen`. Full intro plays once per session;
  subsequent homepage loads get a 400ms fade straight into the hero.

New effect modules: `intro.js`, `parallax.js`, `pinned-forty.js`, `marquee.js`,
`magnetic.js`, `hotspot.js`, `particles.js`.

Reconciliation of existing effects:

- `tilt.js` is **removed**, replaced by hotspot hover (`hotspot.js`).
- `reveals.js` keeps its `data-reveal` HTML API but drives staggers via GSAP.
- `count-up.js` is **removed** (used only by the homepage's leader stat, which the
  pinned scene's scroll-scrubbed counter replaces). Its test is removed with it.

## 1. Opening sequence (intro → mask → hero)

One GSAP timeline, ~2.6s, skippable at any time by click, keypress, or scroll
(skip jumps to final hero state and sets the session flag).

1. **0.0s** — Near-black page (`--bg-deeper`). Centered giant "EMC" SVG text mask
   with the carnival hero video playing inside the letterforms. Thin gold underline
   draws in beneath.
2. **0.8s** — Letters breathe (scale 1.0 → 1.04). Eyebrow "Forty years powering live
   events" fades in, letter-spaced.
3. **1.6s** — Handoff: letters scale ~8× as the mask expands until the video fills
   the viewport; the black backdrop parts as a curtain (the single "dimension curtain
   reveal" moment).
4. **2.2s** — Hero content (EMC. wordmark, tagline, pillars, scroll cue) staggers in;
   ember particles fade up.

Repeat visits in-session skip steps 1–3.

## 2. Ambient scroll system

- **Hero z-space:** on scroll away, video scales slightly and blurs, headline drifts
  up faster than video, embers drift slower. Max displacement ~60px.
- **Section curtain reveals:** `partners`, `what-we-do`, `industry-leader`, `intake`
  each enter with a soft near-black edge-wipe as they cross 70% viewport — a quiet
  echo of the intro curtain.
- **Reveal upgrade:** `data-reveal` elements stagger in with y+scale drift, 60ms
  offsets between siblings.

## 3. Signature moment — "40 Years" pinned scene

The only pinned scene. Industry Leader pins for ~1.5 viewport-heights:

1. Giant **"40"** (~70vh tall) masked with festival footage — the masked-typography
   motif bookending the intro.
2. Scrub (lerp-smoothed, `scrub: 1`): number counts 0 → 40 with scroll position;
   four milestone captions cycle beside it — "Small-town fairs" → "Multi-day
   festivals" → "Theme parks" → "Sports venues".
3. Section unpins; page continues.

Mobile (<768px): no pinning. The masked "40" renders, count-up triggers once on
entry, captions stack vertically.

## 4. Micro-interactions

- **Hotspot hover cards** (What We Do): cursor-tracking radial gold glow + border
  light-up. Pointer devices only.
- **Magnetic buttons** (both CTAs): pull toward cursor within 60px radius, max ~8px
  translate, spring back. Desktop only.
- **Partner marquee:** Circle K / Walgreens / Menards in a seamless duplicated
  CSS-transform loop, ~30s cycle, pause on hover, gold tint on hovered name.
- **Ember particles:** hero canvas, ~40 gold/amber embers drifting slowly with
  occasional twinkle (replaces static stars). DPR-capped; rAF paused while hero is
  off-screen.

## 5. Performance & accessibility

- Only transform/opacity animations; no layout thrash. Target 60fps on mid-range
  hardware; Lighthouse performance ≥ 90.
- GSAP+ScrollTrigger is the sole added dependency.
- Reduced-motion collapse per Architecture. Intro skippable. Pinned scene remains
  keyboard-scrollable (native scroll drives it; no key hijacking).

## 6. Testing

Vitest, GSAP mocked, matching the existing suite style:

- Session-gate logic (flag set/read, skip path).
- Scrub mapping math (scroll progress → 0–40 counter, caption index).
- Marquee content duplication.
- Magnetic displacement math (radius, max translate, reset).
- Reduced-motion branching (each module no-ops or goes static).

Existing `nav` and `reveals` tests keep passing (reveals' public API is unchanged);
`count-up.test.js` is removed alongside its module.

## Implementation order (suggested for the plan)

1. `motion.js` foundation (GSAP install, reduced-motion + session gate).
2. Opening sequence.
3. Ambient scroll (hero z-space, curtains, reveal upgrade).
4. Pinned "40" scene.
5. Micro-interactions (hotspot, magnetic, marquee, particles).
6. Cross-cutting QA: reduced motion, mobile degradation, Lighthouse.
