# Drone Flight Experience Page — Design

**Date:** 2026-07-16
**Status:** Approved by Anthony (design dialogue, 2026-07-16)
**Scope:** New standalone page `experience.html` + footage pipeline. Existing pages
gain only a nav link.

## Goal

A cinematic scroll-scrubbed landing page: a drone/bird POV flies through a lively
night fair and orbits the ferris wheel; the visitor flies it by scrolling
(Apple-product-page style). EMC's pillars appear as story stations during the
flight, ending in an Event Intake CTA. Reference: tenfoldmarc reel (Higgsfield/
Seedance fly-through → scroll-scrubbed hero).

Out of scope: replacing the homepage; audio; WebGL.

## Decisions (locked)

- New standalone page `experience.html`; homepage untouched except nav link.
- Scroll-scrubbed (not autoplay): scroll position = flight position, reversible.
- Canvas frame-sequence technique (NOT `video.currentTime`) — guaranteed-smooth
  scrubbing incl. iOS Safari.
- Night carnival mood (matches site theme `#07090f` + gold).
- Footage: three ~10s Seedance segments chained with last-frame→first-frame
  continuity: (1) entrance gate → midway, (2) midway crowds → games row,
  (3) rise → ferris wheel orbit finale.
- EMC pillars as flight stations (copy below, placeholders — Anthony may veto).

## Architecture

New files:

- `experience.html` — page (site nav + "Experience" link, flight stage, CTA
  section, footer). Added as a Vite input in `vite.config.js`.
- `src/experience.js` — entry: imports styles, initMotion, nav, magnetic,
  flight scrub. (Shimmer/reveals come via shared CSS/classes automatically.)
- `src/flight-scrub.js` — the engine (details below).
- `src/styles/experience.css` — flight stage, loader, beats, CTA styles.
- `scripts/build-flight-frames.py` — cv2 pipeline: MP4 segments → tiered JPEG
  frames + seam crossfades + `manifest.json` + `poster.jpg`. Re-runnable.
- `public/experience-frames/{desktop,mobile}/f####.jpg`, `manifest.json`,
  `poster.jpg` (committed; ~20–25MB total).

Every page's nav `<ul>` gains `<li><a href="/experience.html">Experience</a></li>`.

## Flight scrub engine (`src/flight-scrub.js`)

- **Manifest:** `{ frames, chunk, fps, tiers: { desktop: {path, width},
  mobile: {path, width} } }`. Tier chosen by `max-width: 768px`.
- **Loading:** loader overlay (EMC mark + gold progress bar) preloads chunk 1
  (~first segment) → scrub unlocks; remaining chunks stream in background in
  order. Visitor outrunning the loader sees the nearest loaded frame (never
  black). Loader reflects chunk-1 progress only.
- **Scrub:** ScrollTrigger pins the stage for a 400vh runway, `scrub: 1`
  (lerp-smoothed, same feel as the 40-scene). Progress → frame index (pure
  function). Canvas cover-fit, DPR capped at 2, redrawn only when the index
  changes.
- **Story beats** (progress ranges; each a real heading/text block, gold
  shimmer on keywords, GSAP fade/slide):
  1. 0–8% — eyebrow "Fly the midway." + scroll cue
  2. 12–25% — SCANNING · "Gates that never back up."
  3. 35–50% — SALES · "Every light is a ticket."
  4. 60–72% — MARKETING & ADVERTISING · "The whole town heard."
  5. 85–100% — "40 years of nights like this." + Event Intake CTA
- **Reduced motion / no-JS:** no pin, no scrub, no loader — `poster.jpg` as a
  static hero with all five copy blocks stacked in DOM order and the CTA.
  Canvas is `aria-hidden`; content reads correctly for AT in both modes.

## Footage pipeline

- Three Seedance prompts authored with the `cinema-worldbuilder` skill
  (drone POV, night carnival, speeds in km/h, FOV-anchored lenses; Last Frame
  blocks composition-matched to the next segment's opening).
- Generated at 1080p/10s via the Higgsfield MCP connector (Anthony's account +
  credits; retakes expected for continuity). Fallback: Anthony runs the same
  prompts in Higgsfield's UI and drops MP4s into `assets-src/flight/`
  (git-ignored) — the pipeline is identical from there.
- `scripts/build-flight-frames.py`: reads segment MP4s in order, samples ~10fps,
  resizes to 1600px (desktop) and 900px (mobile) JPEG q≈72, 6-frame crossfade
  across each seam, writes frames + manifest + poster (a ferris-orbit frame).

## Performance & accessibility

- Chunk 1 (~3MB) gates interactivity; total ~20–25MB streams lazily. No change
  to other pages' bundles.
- Canvas draw work is bounded (one drawImage per changed frame). rAF-driven via
  ScrollTrigger only while pinned.
- Keyboard scrolling scrubs natively (no key hijack). Beats are real text in
  logical order. Loader has `role="status"`.

## Testing

Vitest (GSAP mocked/fakes; no network): progress→frame-index math (clamping,
chunk boundaries), chunk-loader ordering/dedup, beat-range activation, reduced-
motion branch. The Python script is verified by running it on the real segments.

## Implementation order (suggested for the plan)

1. Seedance prompts (cinema-worldbuilder) + generation/drop-in of 3 segments.
2. `build-flight-frames.py` + real frame assets + manifest.
3. `experience.html` + entry + styles + nav links on all pages.
4. `flight-scrub.js` engine (loader → scrub → beats) + tests.
5. QA: reduced motion, mobile tier, outrun-the-loader, build, browser pass.
