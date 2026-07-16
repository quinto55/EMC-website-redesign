# Drone Flight Experience Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new `experience.html` page where a drone-POV night-fair flight is scrubbed by scroll (Apple-style canvas frame sequence), with EMC pillar copy appearing at flight stations and an Event Intake CTA at the end.

**Architecture:** A Python/cv2 script converts two Seedance MP4 segments into tiered JPEG frame sequences + manifest. A new page pins a full-viewport canvas for a 400vh runway; `src/flight-scrub.js` preloads frames in chunks, maps ScrollTrigger progress → frame index (lerp-smoothed), draws cover-fit, and toggles beat copy by progress range. Reduced-motion renders a static poster + stacked copy.

**Tech Stack:** Vite 5, vanilla ES modules, GSAP 3 + ScrollTrigger (existing dep), Python 3 + OpenCV (existing), vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-07-16-drone-flight-experience-design.md`

## Global Constraints

- Existing pages/bundles unchanged except: each page's nav `<ul>` gains `<li><a href="/experience.html">Experience</a></li>` inserted immediately BEFORE the Contact `<li>`.
- No new npm dependencies.
- Segments precondition: the controller places `assets-src/flight/seg1.mp4` and `assets-src/flight/seg2.mp4` (Seedance 720p 16:9) before Task 1 runs. `assets-src/` is git-ignored.
- Frame tiers: desktop 1280px wide, mobile 900px wide, JPEG quality 72, ~10fps sampling, 6-frame crossfade at the seam. Naming `f0001.jpg` (1-indexed) under `public/experience-frames/{desktop,mobile}/`.
- Manifest shape (exact): `{ "frames": <int>, "chunk": 30, "fps": 10, "tiers": { "desktop": { "path": "/experience-frames/desktop/", "width": 1280 }, "mobile": { "path": "/experience-frames/mobile/", "width": 900 } } }`.
- Beat progress ranges (exact): 0–0.08, 0.12–0.25, 0.35–0.50, 0.60–0.72, 0.85–1.0.
- Beat copy (exact, gold shimmer comes free via existing `.eyebrow` class):
  1. eyebrow "Fly the midway." + "Scroll to fly"
  2. SCANNING · "Gates that never back up."
  3. SALES · "Every light is a ticket."
  4. MARKETING & ADVERTISING · "The whole town heard."
  5. "40 years of nights like this." + CTA "Start an Event Intake" → /contact.html
- `prefers-reduced-motion: reduce` ⇒ no pin/scrub/loader/fetch: `flight--static` class, poster visible, all beats stacked and active.
- Mobile tier selected by `max-width: 768px`.
- ScrollTrigger config: `{ trigger: stage, start: 'top top', end: '+=400%', pin: true, scrub: 1 }` driven via a `gsap.to(state, …)` lerp exactly like `src/pinned-forty.js`.
- GSAP never required for a unit test — inject fakes; reduced-motion test must not hit `fetch`.
- All tests run with `npm test`. Commit after every task.

---

### Task 1: Frame pipeline (`scripts/build-flight-frames.py`) + generated assets

**Files:**
- Create: `scripts/build-flight-frames.py`
- Modify: `.gitignore` (add `assets-src/`)
- Create (generated): `public/experience-frames/desktop/f0001.jpg…`, `public/experience-frames/mobile/f0001.jpg…`, `public/experience-frames/manifest.json`, `public/experience-frames/poster.jpg`

**Interfaces:**
- Consumes: `assets-src/flight/seg1.mp4`, `assets-src/flight/seg2.mp4` (controller-provided).
- Produces: the frame assets + manifest per Global Constraints — Task 3's engine reads `manifest.json` and `f%04d.jpg`; Task 2's page references `/experience-frames/poster.jpg`.

- [ ] **Step 1: Git-ignore the source segments**

Append `assets-src/` on its own line to `.gitignore`.

- [ ] **Step 2: Write the script**

Create `scripts/build-flight-frames.py`:

```python
#!/usr/bin/env python3
"""Build tiered JPEG frame sequences for the flight-scrub experience page.

Reads assets-src/flight/seg*.mp4 (sorted), samples ~FPS_OUT frames/sec,
crossfades SEAM_BLEND frames across each segment seam, writes desktop and
mobile JPEG tiers plus manifest.json and poster.jpg. Re-runnable (idempotent).
"""
import cv2
import glob
import json
import os
import shutil

SRC_DIR = 'assets-src/flight'
OUT_DIR = 'public/experience-frames'
TIERS = {'desktop': 1280, 'mobile': 900}
FPS_OUT = 10
SEAM_BLEND = 6
JPEG_Q = 72
CHUNK = 30
POSTER_AT = 0.92  # fraction of the flight used for the poster frame


def read_segment_frames(path, fps_out=FPS_OUT):
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    step = max(1, round(fps / fps_out))
    frames, i = [], 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % step == 0:
            frames.append(frame)
        i += 1
    cap.release()
    if not frames:
        raise SystemExit(f'no frames decoded from {path}')
    return frames


def crossfade(a, b, n=SEAM_BLEND):
    """Consume n tail frames of a and n head frames of b into n blended frames."""
    out = a[:-n]
    for k in range(n):
        t = (k + 1) / (n + 1)
        out.append(cv2.addWeighted(a[len(a) - n + k], 1 - t, b[k], t, 0))
    out.extend(b[n:])
    return out


def write_tier(frames, tier, width):
    d = os.path.join(OUT_DIR, tier)
    if os.path.isdir(d):
        shutil.rmtree(d)
    os.makedirs(d)
    for i, frame in enumerate(frames, 1):
        h, w = frame.shape[:2]
        img = cv2.resize(frame, (width, round(h * width / w)),
                         interpolation=cv2.INTER_AREA)
        cv2.imwrite(os.path.join(d, f'f{i:04d}.jpg'), img,
                    [cv2.IMWRITE_JPEG_QUALITY, JPEG_Q])


def main():
    segs = sorted(glob.glob(os.path.join(SRC_DIR, 'seg*.mp4')))
    if not segs:
        raise SystemExit(f'no segments found in {SRC_DIR}')
    print('segments:', segs)
    frames = read_segment_frames(segs[0])
    for s in segs[1:]:
        frames = crossfade(frames, read_segment_frames(s))
    print('total frames:', len(frames))

    for tier, width in TIERS.items():
        write_tier(frames, tier, width)
        print(f'{tier}: {len(frames)} frames @ {width}px')

    poster = frames[int(len(frames) * POSTER_AT)]
    h, w = poster.shape[:2]
    poster = cv2.resize(poster, (1280, round(h * 1280 / w)),
                        interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(OUT_DIR, 'poster.jpg'), poster,
                [cv2.IMWRITE_JPEG_QUALITY, 80])

    manifest = {
        'frames': len(frames),
        'chunk': CHUNK,
        'fps': FPS_OUT,
        'tiers': {
            'desktop': {'path': '/experience-frames/desktop/', 'width': 1280},
            'mobile': {'path': '/experience-frames/mobile/', 'width': 900},
        },
    }
    with open(os.path.join(OUT_DIR, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)
    print('manifest written:', manifest['frames'], 'frames')


if __name__ == '__main__':
    main()
```

- [ ] **Step 3: Run it on the real segments**

Run: `cd "/mnt/c/Users/Anthony Quintana/projects/EMC-website-redesign" && python3 scripts/build-flight-frames.py`
Expected output: `segments: ['assets-src/flight/seg1.mp4', 'assets-src/flight/seg2.mp4']`, a total frame count around 194 (two 10s clips at 10fps minus the 6-frame seam), both tier lines, and `manifest written: <N> frames`.

- [ ] **Step 4: Sanity-check the outputs**

Run: `ls public/experience-frames/desktop | head -3 && ls public/experience-frames/desktop | wc -l && ls public/experience-frames/mobile | wc -l && cat public/experience-frames/manifest.json && du -sh public/experience-frames`
Expected: `f0001.jpg…` naming; both tiers have the same count matching `manifest.frames`; total size roughly 15–25MB.

- [ ] **Step 5: Commit**

```bash
git add .gitignore scripts/build-flight-frames.py public/experience-frames
git commit -m "feat(experience): flight frame pipeline and generated frame assets"
```

---

### Task 2: Page skeleton — `experience.html`, entry, styles, nav links

**Files:**
- Create: `experience.html`, `src/experience.js`, `src/styles/experience.css`
- Modify: `vite.config.js` (add input), `index.html`, `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `contact.html` (nav link)

**Interfaces:**
- Consumes: `/experience-frames/poster.jpg` (Task 1); `initMotion`/`initNav`/`initMagnetic` (existing).
- Produces: DOM contract for Task 3 — `[data-flight]` stage containing `.flight__poster`, `.flight__canvas`, `.flight__loader` (with `.flight__loader-bar`), and five `.flight__beat` blocks each carrying `data-start`/`data-end`; entry calls `initFlightScrub(ctx)` (implemented as a no-op stub until Task 3 lands — the import must exist so Task 3 needs no main-wiring edits).

- [ ] **Step 1: Create `experience.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <script>document.documentElement.classList.add('js');</script>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Experience — EMC Tickets</title>
  <meta name="description" content="Fly the midway. A night at the fair, powered end-to-end by EMC.">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script type="module" src="/src/experience.js"></script>
</head>
<body>
  <header>
    <nav class="site-nav" aria-label="Primary">
      <a class="site-nav__brand" href="/index.html"><img src="/logo.svg" alt="EMC Tickets"></a>
      <ul class="site-nav__links">
        <li><a href="/index.html#industry-leader">Industry Leader</a></li>
        <li><a href="/what-we-do.html">What We Do</a></li>
        <li><a href="/sell-onsite.html">Sell Onsite</a></li>
        <li><a href="/sell-online.html">Sell Online</a></li>
        <li><a href="/sell-social.html">Sell Social</a></li>
        <li><a href="/experience.html" class="is-active">Experience</a></li>
        <li><a href="/contact.html">Contact</a></li>
      </ul>
      <a class="btn btn-primary site-nav__cta" href="/contact.html" data-magnetic>Event Intake</a>
    </nav>
  </header>

  <main>
    <section class="flight" data-flight aria-label="A drone flight through a night fair">
      <img class="flight__poster" src="/experience-frames/poster.jpg" alt="A lit ferris wheel over a night fairground">
      <canvas class="flight__canvas" aria-hidden="true"></canvas>

      <div class="flight__loader" role="status" aria-label="Loading the flight">
        <span class="flight__loader-mark">EMC<span>.</span></span>
        <span class="flight__loader-track"><span class="flight__loader-bar"></span></span>
      </div>

      <div class="flight__beat" data-start="0" data-end="0.08">
        <span class="eyebrow">Fly the midway.</span>
        <p class="flight__cue">Scroll to fly</p>
      </div>
      <div class="flight__beat" data-start="0.12" data-end="0.25">
        <span class="eyebrow">Scanning</span>
        <h2>Gates that never back up.</h2>
      </div>
      <div class="flight__beat" data-start="0.35" data-end="0.50">
        <span class="eyebrow">Sales</span>
        <h2>Every light is a ticket.</h2>
      </div>
      <div class="flight__beat" data-start="0.60" data-end="0.72">
        <span class="eyebrow">Marketing &amp; Advertising</span>
        <h2>The whole town heard.</h2>
      </div>
      <div class="flight__beat flight__beat--finale" data-start="0.85" data-end="1">
        <h2>40 years of nights like this.</h2>
        <a class="btn btn-primary" href="/contact.html" data-magnetic>Start an Event Intake</a>
      </div>
    </section>

    <section class="section intake" aria-labelledby="exp-intake-title">
      <div class="container" data-reveal>
        <h2 id="exp-intake-title">Your event could look like this.</h2>
        <p>Share a few details and we'll come back with a sales, scanning, and marketing plan tuned to your audience.</p>
        <a class="btn btn-primary" href="/contact.html" data-magnetic>Start an Event Intake</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="site-footer__grid">
        <div class="site-footer__col">
          <h4>Office</h4>
          <p>8409 Land O Lakes Blvd<br>Land O Lakes, FL 34638</p>
        </div>
        <div class="site-footer__col">
          <h4>Phone</h4>
          <p>
            <a href="tel:+18133899530">(813) 389-9530</a><br>
            24/7 Toll Free <a href="tel:+18002902090">(800) 290-2090</a>
          </p>
        </div>
        <div class="site-footer__col">
          <h4>More</h4>
          <ul>
            <li><a href="/contact.html">Contact</a></li>
            <li><a href="/what-we-do.html">What We Do</a></li>
          </ul>
        </div>
      </div>
      <div class="site-footer__legal">
        <span>&copy; EMC Tickets</span>
        <span>Land O Lakes, Florida</span>
      </div>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 2: Create `src/experience.js`**

```js
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/experience.css';

import { initMotion } from './motion.js';
import { initNav } from './nav.js';
import { initMagnetic } from './magnetic.js';
import { initReveals } from './reveals.js';
import { initFlightScrub } from './flight-scrub.js';

document.addEventListener('DOMContentLoaded', () => {
  const ctx = initMotion();
  initNav();
  initMagnetic(ctx);
  initReveals(document, ctx);
  initFlightScrub(ctx);
});
```

And create a stub `src/flight-scrub.js` so the page runs before Task 3:

```js
export function initFlightScrub() {
  /* implemented in the flight-scrub engine task */
}
```

- [ ] **Step 3: Create `src/styles/experience.css`**

```css
.flight {
  position: relative;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-deeper);
}

.flight__poster,
.flight__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.flight__poster { object-fit: cover; }

.flight__loader {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: var(--bg-deeper);
  transition: opacity 500ms var(--ease), visibility 500ms var(--ease);
}
.flight__loader.is-done { opacity: 0; visibility: hidden; }

.flight__loader-mark {
  font-weight: 900;
  font-size: 40px;
  letter-spacing: -0.04em;
}
.flight__loader-mark span { color: var(--red); }

.flight__loader-track {
  width: min(280px, 60vw);
  height: 2px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.flight__loader-bar {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--gold-1), var(--gold-2));
  transform: scaleX(0);
  transform-origin: left center;
}

.flight__beat {
  position: absolute;
  left: var(--gutter);
  bottom: 14vh;
  z-index: 4;
  max-width: 520px;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 500ms var(--ease), transform 500ms var(--ease);
  pointer-events: none;
}
.flight__beat.is-active {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.flight__beat h2 {
  font-size: var(--fs-40);
  margin-top: 10px;
  text-shadow: 0 2px 30px rgba(0, 0, 0, 0.7);
}
.flight__cue {
  margin-top: 10px;
  font-size: var(--fs-12);
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
}
.flight__beat--finale { bottom: 18vh; }
.flight__beat--finale .btn { margin-top: 18px; }

/* Static fallback: reduced motion or engine unavailable */
.flight--static { height: auto; min-height: 100vh; }
.flight--static .flight__canvas,
.flight--static .flight__loader { display: none; }
.flight--static .flight__poster { position: absolute; }
.flight--static .flight__beat {
  position: relative;
  left: auto;
  bottom: auto;
  opacity: 1;
  transform: none;
  pointer-events: auto;
  margin: 0 auto;
  padding: 48px var(--gutter) 0;
  max-width: var(--container);
}
.flight--static::after {
  content: '';
  display: block;
  height: 48px;
}
.flight--static .flight__beat:first-of-type { padding-top: 55vh; }

@media (max-width: 768px) {
  .flight__beat h2 { font-size: var(--fs-28); }
}
```

- [ ] **Step 4: Register the page and add nav links**

1. `vite.config.js` — inside `rollupOptions.input`, after the `contact` line, add:
```js
        experience: resolve(__dirname, 'experience.html'),
```
2. In each of `index.html`, `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `contact.html`: in the nav `<ul class="site-nav__links">`, insert immediately BEFORE the Contact `<li>`:
```html
        <li><a href="/experience.html">Experience</a></li>
```

- [ ] **Step 5: Verify**

Run: `npm test` — all pass (no test touches these files).
Run: `npm run build` — builds clean including the new input.
Run: `curl -s http://localhost:5173/experience.html | grep -c flight__beat` — expected `5` (dev server may need the polling watcher a moment).

- [ ] **Step 6: Commit**

```bash
git add experience.html src/experience.js src/flight-scrub.js src/styles/experience.css vite.config.js index.html what-we-do.html sell-onsite.html sell-online.html sell-social.html contact.html
git commit -m "feat(experience): flight page skeleton, styles, nav links, vite input"
```

---

### Task 3: Flight scrub engine (`src/flight-scrub.js`) + tests

**Files:**
- Modify: `src/flight-scrub.js` (replace the stub)
- Test: `tests/flight-scrub.test.js`

**Interfaces:**
- Consumes: ctx `{ gsap, ScrollTrigger, reduced }` from `initMotion()`; the Task 2 DOM contract; Task 1's manifest/frames.
- Produces: `initFlightScrub(ctx): Promise<void>`; pure helpers `frameIndexFor(progress, frameCount): number`, `nearestLoaded(index, loadedFlags): number` (−1 when nothing loaded), `coverRect(cw, ch, iw, ih): {x,y,w,h}`, `beatRangesFrom(els): Array<{el,start,end}>`.

- [ ] **Step 1: Write the failing test**

Create `tests/flight-scrub.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  frameIndexFor,
  nearestLoaded,
  coverRect,
  beatRangesFrom,
  initFlightScrub,
} from '../src/flight-scrub.js';

describe('frameIndexFor', () => {
  it('maps progress across the frame range with clamping', () => {
    expect(frameIndexFor(0, 200)).toBe(0);
    expect(frameIndexFor(0.5, 200)).toBe(100);
    expect(frameIndexFor(1, 200)).toBe(199);
    expect(frameIndexFor(-0.5, 200)).toBe(0);
    expect(frameIndexFor(1.5, 200)).toBe(199);
  });
});

describe('nearestLoaded', () => {
  const flags = [false, true, false, false, true, false];
  it('returns the index itself when loaded', () => {
    expect(nearestLoaded(4, flags)).toBe(4);
  });
  it('falls back to the nearest loaded neighbour', () => {
    expect(nearestLoaded(2, flags)).toBe(1);
    expect(nearestLoaded(5, flags)).toBe(4);
  });
  it('returns -1 when nothing is loaded', () => {
    expect(nearestLoaded(1, [false, false])).toBe(-1);
  });
});

describe('coverRect', () => {
  it('covers a wide canvas with a tall image by width', () => {
    const r = coverRect(200, 100, 100, 100);
    expect(r.w).toBe(200);
    expect(r.h).toBe(200);
    expect(r.x).toBe(0);
    expect(r.y).toBe(-50);
  });
  it('is identity when aspect matches', () => {
    expect(coverRect(160, 90, 1280, 720)).toEqual({ x: 0, y: 0, w: 160, h: 90 });
  });
});

describe('beatRangesFrom', () => {
  it('parses data-start/data-end from beat elements', () => {
    document.body.innerHTML = `
      <div class="flight__beat" data-start="0" data-end="0.08"></div>
      <div class="flight__beat" data-start="0.85" data-end="1"></div>`;
    const beats = beatRangesFrom(document.querySelectorAll('.flight__beat'));
    expect(beats).toHaveLength(2);
    expect(beats[0].start).toBe(0);
    expect(beats[0].end).toBe(0.08);
    expect(beats[1].end).toBe(1);
  });
});

describe('initFlightScrub reduced-motion branch', () => {
  it('renders the static state without fetch or GSAP', async () => {
    document.body.innerHTML = `
      <section class="flight" data-flight>
        <div class="flight__beat" data-start="0" data-end="0.08"></div>
        <div class="flight__beat" data-start="0.85" data-end="1"></div>
      </section>`;
    await initFlightScrub({ reduced: true, gsap: null, ScrollTrigger: null });
    const stage = document.querySelector('[data-flight]');
    expect(stage.classList.contains('flight--static')).toBe(true);
    const beats = [...document.querySelectorAll('.flight__beat')];
    expect(beats.every((b) => b.classList.contains('is-active'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/flight-scrub.test.js`
Expected: FAIL — the stub exports only `initFlightScrub`; the helper imports are undefined.

- [ ] **Step 3: Replace the stub with the engine**

Replace `src/flight-scrub.js` with:

```js
export function frameIndexFor(progress, frameCount) {
  const p = Math.max(0, Math.min(1, progress));
  return Math.min(frameCount - 1, Math.floor(p * frameCount));
}

export function nearestLoaded(index, loadedFlags) {
  if (loadedFlags[index]) return index;
  for (let d = 1; d < loadedFlags.length; d++) {
    if (index - d >= 0 && loadedFlags[index - d]) return index - d;
    if (index + d < loadedFlags.length && loadedFlags[index + d]) return index + d;
  }
  return -1;
}

export function coverRect(cw, ch, iw, ih) {
  const s = Math.max(cw / iw, ch / ih);
  const w = iw * s;
  const h = ih * s;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

export function beatRangesFrom(els) {
  return [...els].map((el) => ({
    el,
    start: parseFloat(el.dataset.start),
    end: parseFloat(el.dataset.end),
  }));
}

export async function initFlightScrub(ctx) {
  const stage = document.querySelector('[data-flight]');
  if (!stage) return;
  const beats = beatRangesFrom(stage.querySelectorAll('.flight__beat'));

  const goStatic = () => {
    stage.classList.add('flight--static');
    beats.forEach((b) => b.el.classList.add('is-active'));
  };

  if (!ctx || ctx.reduced) {
    goStatic();
    return;
  }

  let manifest;
  try {
    manifest = await (await fetch('/experience-frames/manifest.json')).json();
  } catch {
    goStatic(); // frames unavailable: degrade to the static page
    return;
  }

  const tier = matchMedia('(max-width: 768px)').matches
    ? manifest.tiers.mobile
    : manifest.tiers.desktop;
  const total = manifest.frames;
  const images = new Array(total);
  const loaded = new Array(total).fill(false);
  const canvas = stage.querySelector('.flight__canvas');
  const c2d = canvas.getContext('2d');
  const urlFor = (i) => `${tier.path}f${String(i + 1).padStart(4, '0')}.jpg`;

  let current = -1;
  const draw = (i) => {
    const img = images[i];
    if (!img) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const r = coverRect(cw, ch, img.naturalWidth, img.naturalHeight);
    c2d.drawImage(img, r.x, r.y, r.w, r.h);
    current = i;
  };

  const loadFrame = (i) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        images[i] = img;
        loaded[i] = true;
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = urlFor(i);
    });

  // Chunk 1 gates interactivity; its progress drives the loader bar.
  const loader = stage.querySelector('.flight__loader');
  const bar = stage.querySelector('.flight__loader-bar');
  const gate = Math.min(manifest.chunk, total);
  let done = 0;
  await Promise.all(
    Array.from({ length: gate }, (_, i) =>
      loadFrame(i).then(() => {
        done += 1;
        if (bar) bar.style.transform = `scaleX(${done / gate})`;
      })
    )
  );
  if (loader) loader.classList.add('is-done');
  draw(0);

  // Stream the remaining frames in the background, in order.
  (async () => {
    for (let i = gate; i < total; i++) await loadFrame(i);
  })();

  const state = { p: 0 };
  ctx.gsap.to(state, {
    p: 1,
    ease: 'none',
    onUpdate: () => {
      const idx = nearestLoaded(frameIndexFor(state.p, total), loaded);
      if (idx !== -1 && idx !== current) draw(idx);
      beats.forEach((b) =>
        b.el.classList.toggle('is-active', state.p >= b.start && state.p <= b.end)
      );
    },
    scrollTrigger: { trigger: stage, start: 'top top', end: '+=400%', pin: true, scrub: 1 },
  });

  window.addEventListener('resize', () => {
    if (current >= 0) {
      const i = current;
      current = -1; // force size recompute + redraw
      draw(i);
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/flight-scrub.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Full suite**

Run: `npm test`
Expected: all pass (55 total: 47 existing + 8 new).

- [ ] **Step 6: Commit**

```bash
git add src/flight-scrub.js tests/flight-scrub.test.js
git commit -m "feat(experience): canvas flight-scrub engine with chunked preload and beat ranges"
```

---

### Task 4: QA sweep

**Files:**
- Modify: only if fixes are needed.

- [ ] **Step 1: Full suite + build**

Run: `npm test` (all pass) and `npm run build` (clean, includes `experience` input). Then `npm run preview` and load `/experience.html` — flight works in the built output.

- [ ] **Step 2: Behavior matrix (browser)**

| Check | Expected |
|---|---|
| Load /experience.html | Loader bar fills, fades; flight pinned; scroll scrubs forward AND backward smoothly |
| Story beats | Each of the 5 copy blocks fades in/out within its progress range; shimmer on eyebrows; CTA magnetic |
| Outrun the loader | Fast-scroll immediately after load: canvas shows nearest loaded frame, no black flash |
| Mobile viewport (≤768px) | Mobile tier requested (check Network panel: /mobile/ URLs) |
| Reduced motion | No loader/pin; poster + all 5 blocks stacked; page scrolls normally |
| Other pages | Nav shows Experience link; homepage effects unaffected; zero console errors |

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix(experience): QA polish"
```
(Skip if nothing changed.)
