# Flight as the Landing Page — Design

**Date:** 2026-07-17
**Status:** Approved by Anthony (design dialogue, 2026-07-17)
**Scope:** Homepage restructure + experience.html redirect + nav cleanup.
Executed AFTER the visual-identity plan completes (same files in flight there).

## Goal

The drone fly-through becomes the site's front door. One page at `/`:
flight first, everything else follows. "Flight leads, sections follow."

## New index.html structure (top to bottom)

1. Site nav (unchanged, minus the Experience link).
2. **Flight section** — moved verbatim from experience.html: `[data-flight]`
   stage (poster, canvas, loader, five beats incl. finale CTA), 250% runway.
3. **Hero** — the existing EMC. hero survives as the post-flight brand
   statement (video, wordmark, tagline, pillars, embers, parallax, scroll
   cue). The flight unpins directly into it.
4. Partners marquee → fairs strip → What We Do ticket cards → 40-years
   pinned scene → ADMIT ONE intake → footer. All unchanged.

## What retires

- **The masked-EMC intro, entirely:** intro markup in index.html, the
  `html.js`-gated intro CSS (`src/styles/intro.css`), `src/intro.js`,
  `tests/intro.test.js`, the `initIntro(ctx)` call, and the intro session
  gate (`hasSeenIntro`/`markIntroSeen`/`INTRO_SEEN_KEY` in `src/motion.js` +
  their tests in `tests/motion.test.js` — nothing else consumes them).
  Git history preserves all of it. The flight loader (EMC. mark + gold bar)
  is the new first brand frame.
- **experience.html as a page:** replaced by a minimal redirect document
  (meta refresh + canonical link to `/`; one line of fallback link text) so
  the already-shared URL keeps working. Its vite input entry stays (the
  redirect page still builds); `src/experience.js` is deleted and
  `index.html`'s entry (`src/main.js`) takes over flight wiring.
- **The Experience nav link** on all 7 pages (incl. experience.html's own
  nav — gone with the redirect rewrite) and the footer nav's Experience
  item added by the identity plan.

## Wiring

- `src/main.js`: remove `initIntro`; add `import './styles/experience.css'`
  and `initFlightScrub(ctx)` (order: after `initEmbers()`; the flight is
  self-gating via its loader). Remove the `import './styles/intro.css'`.
- `flight-scrub.js` unchanged (it queries `[data-flight]`; the stage simply
  lives in index.html now). Frames/manifest/poster paths unchanged.
- The flight's `html:not(.js)` static fallback and reduced-motion behavior
  carry over as-is; the page below the flight remains fully reachable in
  both modes (flight collapses to poster + stacked beats, then hero etc.).
- Beat 5 keeps its CTA (mid-page ask); intake stays the closing ask.

## Constraints

- Tests: intro/session-gate tests are DELETED with their modules; every
  other existing test passes unmodified. Net suite shrinks accordingly
  (motion.test.js keeps only `prefersReducedMotion`; intro.test.js gone).
- No new dependencies, no frame-asset changes.
- Scroll length check in QA: flight (250%) + hero + forty pin (150%) on one
  page — verify the page doesn't feel endless; the runway knob is available.
- reveal-hero.html untouched.

## Build order (one task each)

1. Move flight into index.html + main.js wiring + retire intro (markup, CSS,
   modules, tests, session gate).
2. experience.html → redirect page; remove Experience nav/footer links
   everywhere; delete src/experience.js.
3. QA sweep (matrix: full scroll journey, reduced motion, no-JS, mobile,
   redirect works) + final whole-branch review.
